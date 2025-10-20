// Main.js
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "../css/Main.css";
import Papa from "papaparse";
import axios from "axios";
import DestinationPanel from "./panels/DestinationPanel";
import DrivePanel from "./panels/DrivePanel";
import FavoritesPanel from "./panels/FavoritesPanel";
import ParkingChart from "./ParkingChart";
import RouteCard from "./panels/RouteCard";
import { ParkingContext } from "../context/ParkingContext";
import {useContext} from "react";
import {MarkerContext} from "../context/MarkerContext";
import {RouteContext} from "../context/RouteContext";
import {CalculationContext} from "../context/CalculationContext";

export default function Main() {
  const [mode, setMode] = useState("destination"); // destination | drive | favorites
  const [map, setMap] = useState(null);
  const [coordinates, setCoordinates] = useState({
    lat: 37.5662952,
    lng: 126.9779451,
  }); // 서울시청

  const [start, setStart] = useState({
    lat: 37.5662952,
    lng: 126.9779451,
  });//내 위치
  const [go, setGO] = useState(false);
  const [parkingList, setParkingList] = useState([]); // 최종 mergedParkingList 저장
  const [showModal, setShowModal] = useState(false);
  const [csvDataByName, setCsvDataByName] = useState({});
  const [modalParkName, setModalParkName] = useState(null);
  const [routeInfo, setRouteInfo] = useState({});
  const [maneuvers, setManeuvers] = useState([]);   // 회전 지점 목록
  const [nextTurn, setNextTurn]   = useState(null); // { turnType, distM }
  const [reserveMode, setReserveMode] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [agree, setAgree] = useState(false);
  const [user, setUser] = useState(null);
  const [startTime,setStartTime] = useState(null);
  const [showArriveModal, setShowArriveModal] = useState(false);
  //컨텍스트 사용
  const {visibleOnly, setVisibleOnly} = useContext(ParkingContext);
  const {buildMarkerImage,buildOverlayHTML}=useContext(MarkerContext);
  const {calcDistanceMeters,clearRoutePath,drawRoutePath,clearRouteLine,TurnBanner,TURN_MAP,formatMeters,extractManeuvers}=useContext(RouteContext);
  const {pad2,toDateFromHHMM,addMinutesHHMM,roundToNextHourHH,HOURS_24,calcTicketPrice,TICKETS}=useContext(CalculationContext);

  // 도착지명/ETA/예상 여석(가능하면)
  const destName = routeInfo?.destination || null;
  const timeMin = routeInfo?.time ?? routeInfo?.timeMin;


  // 로그인/로그아웃 버튼 클릭 핸들러
  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST" })
        .then(() => {setUser(null);
          alert("로그아웃 성공!")})
        .catch(err => console.error(err));

  };
   useEffect(() => {
    if (go && window.currentRouteLine) window.__routeLocked = true; // 고정
    if (!go) window.__routeLocked = false;                          // 해제
  }, [go]);

  //로그인정보 가져옴
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          setUser(data);
          console.log("로그인 유저 정보:", data); // 여기서 찍으면 fetch 결과 확인 가능
        })
        .catch(() => {
          setUser(null);
          console.log("유저 정보 가져오기 실패");
        });
  }, []);
  // 안내 중일 때 위치 업데이트마다 목적지와 거리 체크

  useEffect(() => {
    const onReservationAction = async (e) => {
      const { parkName, action } = e.detail || {};
      if (!parkName || !map || !parkingList?.length) return;

      // 해당 주차장 찾기
      const park = parkingList.find(p => p.PKLT_NM === parkName);
      if (!park) return;

      // 지도 이동
      const lat = parseFloat(park.LAT);
      const lng = parseFloat(park.LOT);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        map.setCenter(new window.kakao.maps.LatLng(lat, lng));
      }

      // 좌측 패널: 경로 카드 열기
      setMode("destination");
      setRouteInfo(prev => ({ ...prev, destination: parkName, isParking: true }));

      // 경로 선 생성(현재 지도 중심 → 주차장)
      const c = map.getCenter();
      await doRoute(c.getLat(), c.getLng(), parkName);

      // 바로 안내 시작을 원하면
      if (action === "guide") {
        setGO(true);
        setMode("drive");
      }
    };

    window.addEventListener("ep:reservation-action", onReservationAction);
    return () => window.removeEventListener("ep:reservation-action", onReservationAction);
  }, [map, parkingList /*, doRoute, setGO, setMode*/]);

  useEffect(() => {
    if (!go || !routeInfo?.destination || !map) return;

    let destLat = null, destLng = null;

    if (routeInfo.isParking) {
      const destPark = parkingList.find(p => p.PKLT_NM === routeInfo.destination);
      if (!destPark) return;
      destLat = parseFloat(destPark.LAT);
      destLng = parseFloat(destPark.LOT);
    } else {
      if (typeof routeInfo.destLat !== "number" || typeof routeInfo.destLng !== "number") return;
      destLat = routeInfo.destLat;
      destLng = routeInfo.destLng;
    }

    const dist = calcDistanceMeters(coordinates.lat, coordinates.lng, destLat, destLng);

    if (dist <= 30) {
      setShowArriveModal(true);
      setGO(false);
      clearRoutePath?.();
      if (window.currentRouteLine) {
        window.currentRouteLine.setMap?.(null);
        window.currentRouteLine = null;
      }
    }
  }, [coordinates, go, routeInfo, parkingList, map]);

  useEffect(() => {
   if (!go || !maneuvers?.length) { setNextTurn(null); return; }

   const { lat: curLat, lng: curLng } = coordinates;
   let best = null;     // 30km 이내에서 가장 가까운 지점
   let nearest = null;  // 범위 밖이면 전체 중 최단 지점 fallback

   for (const m of maneuvers) {
     const d = calcDistanceMeters(curLat, curLng, m.lat, m.lon);
     if (!nearest || d < nearest.distM) nearest = { turnType: m.turnType, distM: d };
     if (d <= 30000) { // 30km 허들
       if (!best || d < best.distM) best = { turnType: m.turnType, distM: d };
     }
   }
   setNextTurn(best || nearest);
  }, [coordinates, go, maneuvers]);

  // 지도 중심을 기준으로 재탐색
  const onRerouteClick = async () => {
    if (!map || !routeInfo?.destination) return;
    const c = map.getCenter();
    if (routeInfo.isParking) {
    await doRoute(c.getLat(), c.getLng(), routeInfo.destination);
    window.__routeLocked = true; // 재탐색 후에도 고정 유지
  } else {
    // 비주차장: 저장된 좌표로 직접 재탐색
    const data = await callTmapRoute({
      startX: c.getLng(),
      startY: c.getLat(),
      endX: routeInfo.destLng,
      endY: routeInfo.destLat,
    });
    if (!data) return;
    const { pathPoints } = parseTmapGeojsonToPolyline(data);

    clearRoutePath?.();
    drawRoutePath(map, pathPoints, "#3897f0");

    window.__routeLocked = true; // 고정 유지
  }
};
  // 선택된 권종 minutes와 startTime으로 종료시간 계산
  const endTime = React.useMemo(() => {
    if (!selectedTicket || !startTime) return "-";
    // 당일권은 무조건 24:00까지
    if (selectedTicket.key === "DAY") return "24:00";
    return addMinutesHHMM(startTime, selectedTicket.minutes);
  }, [selectedTicket, startTime]);

  // 버튼 동작
  const onReserve = () => {
    setReserveMode(true);
    setStartTime(roundToNextHourHH()); // ← 정의돼 있는 함수 사용
  };

  const onEditRoute = () => {
    setRouteInfo({});
    setGO(false);
    if (window.currentRouteLine){
      window.currentRouteLine.setMap(null);
      window.currentRouteLine = null;
    }
    setMode("destination"); // 목적지 변경 화면으로
  };
  useEffect(() => {
    if (!map || !routeInfo.destination || !parkingList.length) return;

    // 잠금 중이면 자동 재탐색 스킵
    if (window.__routeLocked) return;

    const updateRoute = async () => {
      const startX = coordinates.lng;
      const startY = coordinates.lat;

      const endPark = parkingList.find(p => p.PKLT_NM === routeInfo.destination);
      if (!endPark) return;

      const endX = parseFloat(endPark.LOT);
      const endY = parseFloat(endPark.LAT);

      try {
        const res = await fetch("https://apis.openapi.sk.com/tmap/routes?version=1", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "appKey": "KTv2MthCTDaTxnVQ8hfUJ7mSHSdxii7j60hw5tPU"
          },
          body: JSON.stringify({
            startX, startY, endX, endY,
            reqCoordType: "WGS84GEO",
            resCoordType: "WGS84GEO"
          })
        });

        const data = await res.json();
        if (!data.features || !data.features.length) return;
        setManeuvers(extractManeuvers(data));

        let pathPoints = [];
        let totalTime = "-";
        let totalDistance = "-";

        data.features.forEach((feature) => {
          const props = feature.properties;
          if (props.totalTime) {
            totalTime = props.totalTime;
            totalDistance = props.totalDistance;
          }

          if (feature.geometry?.type === "LineString") {
            feature.geometry.coordinates.forEach(([lon, lat]) => {
              pathPoints.push(new window.kakao.maps.LatLng(lat, lon));
            });
          }
        });

        // 기존 폴리라인 제거
        if (window.currentRouteLine) window.currentRouteLine.setMap(null);

        const polyline = new window.kakao.maps.Polyline({
          path: pathPoints,
          strokeWeight: 5,
          strokeColor: "#3897f0",
          strokeOpacity: 1,
          strokeStyle: "solid"
        });

        polyline.setMap(map);
        window.currentRouteLine = polyline;

        const timeMin = totalTime !== "-" ? Math.round(totalTime / 60) : "-";
        const distKm = totalDistance !== "-" ? (totalDistance / 1000).toFixed(2) : "-";

        setRouteInfo(prev => ({
          ...prev,
          distance: distKm,
          time: timeMin
        }));

      } catch (err) {
        console.error("경로 업데이트 실패:", err);
      }
    };

    updateRoute();
  }, [coordinates, routeInfo.destination, map, parkingList]);
  //전역함수 설정
  useEffect(() => {
    window.onRerouteClick = onRerouteClick;
  }, [onRerouteClick]);
  // ✅ 주행 탭으로 들어가면, #map 안의 예전 하단 바만 깔끔히 숨김
  useEffect(() => {
    if (mode !== "drive") return;
    const mapEl = document.getElementById("map");
    if (!mapEl) return;

    // 1) 클래스 기반(있으면 가장 안전)
    const classSelectors = [
      ".rb-wrap", ".rb-bar", ".drive-bottom", ".legacy-bottom", ".route-bar"
    ];
    mapEl.querySelectorAll(classSelectors.join(",")).forEach(el => {
      el.style.display = "none";
      el.setAttribute("data-hidden-by", "eazypark");
    });

    // 2) 텍스트 휴리스틱(클래스가 없을 때 대체 수단)
    //    '까지', '거리', '예상 시간/분' 등의 문구가 들어간 하단 오버레이를 숨긴다.
    Array.from(mapEl.querySelectorAll("div")).forEach(el => {
      if (el.getAttribute("data-hidden-by") === "eazypark") return;
      const txt = (el.textContent || "").replace(/\s+/g, " ");
      const looksLikeLegacy =
          txt.includes("까지") &&
          (txt.includes("거리") || txt.includes("예상 시간") || txt.includes("분"));
      if (looksLikeLegacy) {
        el.style.display = "none";
        el.setAttribute("data-hidden-by", "eazypark");
      }
    });
  }, [mode, routeInfo?.destination]);

  // ----- 공용 유틸: 스로틀 -----
  const throttle = (fn, wait = 500) => {
    let last = 0;
    let timer = null;
    return (...args) => {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn(...args);
      } else {
        clearTimeout(timer);
        timer = setTimeout(() => {
          last = Date.now();
          fn(...args);
        }, wait - (now - last));
      }
    };
  };
  // ----- 공용 유틸: 라우팅(중복호출 가드 + 캐시 + 429 백오프) -----
  const routeInFlightRef = useRef(false);
  const routeCacheRef = useRef(new Map());

  async function callTmapRoute({ startX, startY, endX, endY }) {
    // 캐시 키(좌표 5자리로 정규화)
    const k = `${startX.toFixed(5)},${startY.toFixed(5)}->${endX.toFixed(
        5
    )},${endY.toFixed(5)}`;
    if (routeCacheRef.current.has(k)) return routeCacheRef.current.get(k);

    // 중복 호출 가드
    if (routeInFlightRef.current) return null;
    routeInFlightRef.current = true;

    try {
      let tries = 0;
      let delay = 500;
      while (true) {
        const res = await fetch(
            "https://apis.openapi.sk.com/tmap/routes?version=1",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json; charset=UTF-8",
                appKey: "KTv2MthCTDaTxnVQ8hfUJ7mSHSdxii7j60hw5tPU",
              },
              body: JSON.stringify({
                startX,
                startY,
                endX,
                endY,
                reqCoordType: "WGS84GEO",
                resCoordType: "WGS84GEO",
              }),
            }
        );

        if (res.status === 429) {
          if (++tries >= 3) throw new Error("RATE_LIMIT");
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2; // 0.5s -> 1s -> 2s
          continue;
        }
        if (!res.ok) throw new Error(`HTTP_${res.status}`);

        const data = await res.json();
        routeCacheRef.current.set(k, data);
        return data;
      }
    } finally {
      routeInFlightRef.current = false;
    }
  }

  function parseTmapGeojsonToPolyline(data) {
    if (!data?.features?.length)
      return { pathPoints: [], totalTime: "-", totalDistance: "-" };

    let totalTime = "-";
    let totalDistance = "-";
    const pathPoints = [];

    data.features.forEach((f) => {
      const p = f.properties || {};
      if (p.totalTime) {
        totalTime = p.totalTime;
        totalDistance = p.totalDistance;
      }
      if (f.geometry?.type === "LineString") {
        f.geometry.coordinates.forEach(([lon, lat]) => {
          pathPoints.push(new window.kakao.maps.LatLng(lat, lon));
        });
      }
    });

    return { pathPoints, totalTime, totalDistance };
  }

  async function doRoute(startLat, startLng, destName) {
    if (!map || !destName) return;

    const endPark = parkingList.find((p) => p.PKLT_NM === destName);
    if (!endPark) return;

    const startX = startLng;
    const startY = startLat;
    const endX = parseFloat(endPark.LOT);
    const endY = parseFloat(endPark.LAT);

    const data = await callTmapRoute({ startX, startY, endX, endY });
    if (!data) return; // 다른 호출이 진행 중이어서 스킵된 경우

    const { pathPoints, totalTime, totalDistance } =
        parseTmapGeojsonToPolyline(data);
        setManeuvers(extractManeuvers(data));

    // 기존 경로 제거
    clearRoutePath();
    drawRoutePath(map, pathPoints, "#3897f0");

    // 라인 그리는 순간 고정
    window.__routeLocked = true;

    const timeMin = totalTime !== "-" ? Math.round(totalTime / 60) : "-";
    const distKm =
        totalDistance !== "-" ? (totalDistance / 1000).toFixed(2) : "-";

    setRouteInfo((prev) => ({
      ...prev,
      distance: distKm,
      time: timeMin,
      destination: destName,
    }));
  }

  // CSV 전체 파싱 (주차장별 데이터 구조화)
  useEffect(() => {
    Papa.parse("/20250922.csv", {
      download: true,
      header: true,
      complete: (result) => {
        const grouped = {};
        result.data.forEach((row) => {
          const name = row.PKLT_NM;
          if (!name) return;
          if (!grouped[name]) grouped[name] = [];
          grouped[name].push({
            time: row.timestamp ? row.timestamp.split(" ")[1].slice(0, 5) : "",
            liveCnt: Number(row.liveCnt) || 0,
            remainCnt: Number(row.remainCnt) || 0,
          });
        });
        setCsvDataByName(grouped);
      },
      error: (err) => console.error("CSV 파싱 에러:", err),
    });
  }, []);

  //스로틀에 사용
  const goRef = useRef(go);
  // go 최신값 계속 업데이트
  useEffect(() => {
    goRef.current = go;
  }, [go]);

  // 카카오 지도 초기화 (+ center_changed 스로틀)
  useEffect(() => {
    window.kakao.maps.load(() => {
      const container = document.getElementById("map");
      const options = {
        center: new window.kakao.maps.LatLng(
            coordinates.lat,
            coordinates.lng
        ),
        level: 2,
      };
      const mapInstance = new window.kakao.maps.Map(container, options);
      setMap(mapInstance);

      // 현재 위치 마커
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(
            coordinates.lat,
            coordinates.lng
        ),
        map: mapInstance,
        title: "현재 위치",
        image: new window.kakao.maps.MarkerImage(
            "/images/car.png",
            new window.kakao.maps.Size(50, 50)
        ),
      });

      const onCenterChanged = throttle(() => {
        if (!goRef.current) return; // go가 false면 아무것도 안 함

        const c = mapInstance.getCenter();
        const lat = c.getLat();
        const lng = c.getLng();

        setCoordinates({ lat, lng });

        if (marker) {
          marker.setPosition(new window.kakao.maps.LatLng(lat, lng));
        }
      }, 500);


      window.kakao.maps.event.addListener(
          mapInstance,
          "center_changed",
          onCenterChanged
      );
    });
  }, []);

  // ⚠️ A안: 자동 라우팅 useEffect 제거됨
  // (좌표/지도 변화에 따라 경로를 자동으로 다시 요청하지 않습니다)

  useEffect(() => {
    const suppress = go || mode === "drive";
    window.__suppressOverlay = suppress;
    // 주행 모드 들어가면 떠 있는 오버레이 즉시 닫기
    if (suppress && window.__epOverlay) {
      try { window.__epOverlay.setMap(null); } catch (_) {}
    }
  }, [go, mode]);

  useEffect(() => {
    if (!map) return;

    const fetchAndShowMarkers = async () => {
      const clusterer = new window.kakao.maps.MarkerClusterer({
        map: map,
        averageCenter: true,
        minLevel: 6,
        styles: [
          {
            width: "40px",
            height: "40px",
            background: "#3897f0",
            color: "#fff",
            textAlign: "center",
            lineHeight: "40px",
            fontSize: "13px",
            fontWeight: "700",
            borderRadius: "20px",
            border: "2px solid #fff",
            boxShadow: "0 4px 12px rgba(0,0,0,.2)",
          },
        ],
      });

      try {
        // 1. 실시간 정보
        const realtimeResponse = await fetch(
            `http://openapi.seoul.go.kr:8088/56776f4f766b696d3335704f6b434d/json/GetParkingInfo/1/1000/`
        );
        const realtimeData = await realtimeResponse.json();
        const realtimeList = realtimeData.GetParkingInfo?.row || [];
        console.log("실시간 정보:", realtimeList);

        // 2. 전체 주차장 정보
        let fullParkingList = [];
        for (let i = 0; i < 7; i++) {
          const start = i * 1000 + 1;
          const end = (i + 1) * 1000;
          const response = await fetch(
              `http://openapi.seoul.go.kr:8088/56776f4f766b696d3335704f6b434d/json/GetParkInfo/${start}/${end}/`
          );
          const result = await response.json();
          const rows = result.GetParkInfo?.row || [];
          fullParkingList = fullParkingList.concat(rows);
        }
        console.log("전체 주차장 리스트:", fullParkingList);

        // 3. 이름 기준 중복 제거 + 기존 속성 보존
        const parkMapByName = {};
        fullParkingList.forEach((park) => {
          const name = park.PKLT_NM;
          if (!name) return;

          if (!parkMapByName[name]) {
            parkMapByName[name] = { ...park, LATs: [], LOTs: [] };
          } else {
            parkMapByName[name].TPKCT += park.TPKCT;
          }

          parkMapByName[name].LATs.push(parseFloat(park.LAT));
          parkMapByName[name].LOTs.push(parseFloat(park.LOT));
        });

        const uniqueParkingList = Object.values(parkMapByName).map((park) => ({
          ...park,
          LAT: park.LATs[0],
          LOT: park.LOTs[0],
        }));

        // 4. 실시간 데이터 이름 기준 합산
        const realtimeMapByName = {};
        realtimeList.forEach((item) => {
          const name = item.PKLT_NM;
          if (!name) return;
          if (!realtimeMapByName[name]) realtimeMapByName[name] = 0;
          realtimeMapByName[name] += item.NOW_PRK_VHCL_CNT ?? 0;
        });
        // 5. 정적 + 실시간 병합
        const mergedParkingList = uniqueParkingList.map((park) => {
          const liveCnt = realtimeMapByName[park.PKLT_NM] ?? null;
          const remainCnt = liveCnt != null ? park.TPKCT - liveCnt : null;
          return { ...park, liveCnt, remainCnt };
        });
        setParkingList(mergedParkingList);
        //visibleOnly:위치 중복제거 최종리스트
        const filtered = [];
        const coordMap = {};
        mergedParkingList.forEach((p) => {
          const key = `${p.LAT},${p.LOT}`;
          if (!coordMap[key]) {
            coordMap[key] = true;
            filtered.push(p);
          }
        });

        // 한 번에 상태 갱신
        setVisibleOnly(filtered);

        console.log("최종 리스트:", visibleOnly);

        // 6. 마커 생성
        const OVERLAY_Z = 1000;
        const overlay = new window.kakao.maps.CustomOverlay({
          zIndex: OVERLAY_Z,
          yAnchor: 1.02,
        });
        // 주행 모드 진입 시 닫기 위해 전역 핸들 보관
        window.__epOverlay = overlay;

        let openedMarker = null;

        // 공통: 오버레이 열기
        const openOverlay = (park, position, marker, idx) => {
          const el = document.createElement("div");
          el.innerHTML = buildOverlayHTML(park, idx);

          // 오버레이 클릭 전파 막기
          el
              .querySelector(".ep-overlay")
              .addEventListener("click", (e) => e.stopPropagation());

          // 닫기 버튼
          const closeBtn = el.querySelector(".ep-close");
          if (closeBtn) {
            closeBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              overlay.setMap(null);
              if (openedMarker) {
                openedMarker.setZIndex(5);
                if (openedMarker.__imgNormal)
                  openedMarker.setImage(openedMarker.__imgNormal);
                openedMarker = null;
              }
            });
          }

          // 상세분석 버튼
          const detailBtn = el.querySelector(`#detail-zone`);
          if (detailBtn) {
            detailBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              setModalParkName(park.PKLT_NM);
              setShowModal(true);
            });
          }

          overlay.setContent(el);
          overlay.setPosition(position);
          overlay.setMap(map);

          // 이전 마커 원복
          if (openedMarker && openedMarker !== marker) {
            openedMarker.setZIndex(5);
            if (openedMarker.__imgNormal)
              openedMarker.setImage(openedMarker.__imgNormal);
          }

          // 현재 마커 강조
          openedMarker = marker;
          marker.setZIndex(20);
          if (marker.__imgHover) marker.setImage(marker.__imgHover);

          // 경로탐색 버튼 (수정: 공용 doRoute 사용)
          const routeBtn = el.querySelector("#route-search");
          if (routeBtn) {
            routeBtn.addEventListener("click", async (e) => {
              e.preventDefault();
              e.stopPropagation();
              setRouteInfo({ destination: park.PKLT_NM, isParking: true }); // 목적지 세팅

              const c = map.getCenter();
              await doRoute(c.getLat(), c.getLng(), park.PKLT_NM);
            });
          }
        };
        const markers = mergedParkingList
            .map((park) => {
              const lat = parseFloat(park.LAT);
              const lng = parseFloat(park.LOT);
              if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

              const position = new window.kakao.maps.LatLng(lat, lng);

              // 기본/호버 이미지 2종 캐시
              const imageNormal = buildMarkerImage(park, 0.75);
              const imageHover = buildMarkerImage(park, 0.95);

              const marker = new window.kakao.maps.Marker({
                position,
                title: park.PKLT_NM ?? "",
                image: imageNormal,
              });

              marker.__imgNormal = imageNormal;
              marker.__imgHover = imageHover;

              // 클릭: 오버레이 열기
              window.kakao.maps.event.addListener(marker, "click", () => {
                // 주행 모드에서는 팝업(오버레이) 차단
                if (window.__suppressOverlay) return;
                openOverlay(park, position, marker);
              });

              // 호버 효과
              window.kakao.maps.event.addListener(marker, "mouseover", () => {
                if (openedMarker && openedMarker === marker) return;
                marker.setZIndex(10);
                if (marker.__imgHover) marker.setImage(marker.__imgHover);
              });

              window.kakao.maps.event.addListener(marker, "mouseout", () => {
                if (openedMarker && openedMarker === marker) return;
                marker.setZIndex(5);
                if (marker.__imgNormal) marker.setImage(marker.__imgNormal);
              });

              return marker;
            })
            .filter(Boolean);

        clusterer.addMarkers(markers);
      } catch (err) {
        console.error("공공 API 불러오기 실패:", err);
      }
    };

    fetchAndShowMarkers();
  }, [map]);

  return (
      <div className={`app ${mode === "drive" ? "mode-drive" : ""}`}>
        <aside className="sidebar">
          <div className="brand-row">
            {go ? (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div className="loading-circle"></div>
                  <span className="safe-driving-text">안심 주행중</span>
                </div>
            ) : (
                <>
                  <div className="brand">Ezpark</div>
                  <span className="pill">Beta</span>
                  {user?.username && (<button className="btn-edit">{user.username+"님"}</button>)}
                </>
            )}
          </div>

          <div className={go ? "fade-out" : "fade-in"}>
            <div className="tabs">
              <button
                  className={`tab ${mode === "destination" ? "active" : ""}`}
                  onClick={() => setMode("destination")}
              >
                목적지
              </button>
              <button
                  className={`tab ${mode === "drive" ? "active" : ""}`}
                  onClick={() => setMode("drive")}
              >
                주행
              </button>
              <button
                  className={`tab ${mode === "favorites" ? "active" : ""}`}
                  onClick={() => setMode("favorites")}
              >
                예약 내역
              </button>
            </div>
          </div>
          {/*주행 안내판*/}
          <div className="panel-wrap">
            {/* 목적지 모드: 경로가 없을 때만 기존 패널 노출 */}
            {mode === "destination" && !routeInfo?.destination && (
                <DestinationPanel
                    map={map}
                    coordinates={coordinates}
                    ParkingList={parkingList}
                    routeInfo={routeInfo}
                    setRouteInfo={setRouteInfo}
                    go={go}
                    setGO={setGO}
                    setMode={setMode}
                />
            )}

            {/* 드라이브/즐겨찾기 그대로 */}
            {mode === "drive" && (
                <DrivePanel
                    map={map}
                    go={go}
                    setGO={setGO}
                    coordinates={coordinates}
                    ParkingList={parkingList}
                    routeInfo={routeInfo}
                    setRouteInfo={setRouteInfo}
                    hideLegacyBottom
                />
            )}
            {mode === "favorites" && <FavoritesPanel map={map} coordinates={coordinates} ParkingList={parkingList} onRerouteClick={onRerouteClick} doRoute={doRoute} routeInfo={routeInfo} setRouteInfo={setRouteInfo}/>}

            {/* ✅ 경로가 생기면 카드만 노출 (중복 제거) */}
            {mode === "destination" && routeInfo?.destination && (
                <RouteCard
                    coordinates={coordinates} mode={mode} routeInfo={routeInfo} parkingList={parkingList} reserveMode={reserveMode} setReserveMode={setReserveMode} selectedTicket={selectedTicket} setSelectedTicket={setSelectedTicket} agree={agree} setAgree={setAgree} startTime={startTime} setStartTime={setStartTime} endTime={endTime} user={user} onEditRoute={onEditRoute} onReserve={onReserve} setGO={setGO} setMode={setMode} setRouteInfo={setRouteInfo} TICKETS={TICKETS} HOURS_24={HOURS_24} pad2={pad2} calcTicketPrice={calcTicketPrice} map={map}
                />
            )}
          </div>

          <div className="footer">@Eazypark</div>
        </aside>

        <main className="map-area">
          <div className="header-links">
            <button className="link-btn" onClick={()=>{
              const position = new window.kakao.maps.LatLng(coordinates.lat,coordinates.lng);
              map.setCenter(position);
            }}>내위치로</button>
            <Link className="link-btn" to="/admin">관리자</Link>
            {user ? (
                <Link className="link-btn" to="#" onClick={handleLogout}>로그아웃</Link>
            ) : (
                <Link className="link-btn" to="/login" >로그인</Link>
            )}
            <Link className="link-btn" to="/mobile">모바일 버전</Link>
          </div>

          <div
              id="map"
              className="map-canvas"
              style={{ width: "100%", height: "100%" }}
          />
          {go && nextTurn && <TurnBanner turn={nextTurn.turnType} dist={nextTurn.distM} />}
          {routeInfo?.destination && routeInfo?.isParking && (
              <div className="route-toast-wrap">
                <div className="route-toast route-toast--compact">
                  {/* 좌측: 리라우트 */}
                  <button className="rt-ico rt-ico-refresh" onClick={onRerouteClick} aria-label="재탐색">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/>
                    </svg>
                  </button>

                  {/* 가운데: 목적지 + 시간/거리 */}
                  <div className="rt-center">
                    <div className="rt-line1" title={routeInfo.destination}>
                      <span className="rt-pin">◎</span>
                      {routeInfo.destination} <span className="rt-small">까지</span>
                    </div>
                    <div className="rt-line2">
                  <span className="rt-time">
                    {
                      (() => {
                        const m = Number(routeInfo?.time ?? routeInfo?.timeMin);
                        if (!m || Number.isNaN(m)) return "-";
                        const d = new Date(Date.now() + m * 60000);
                        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2,"0")}`;
                      })()
                    }
                  </span>
                      <span className="rt-gap" />
                      <span className="rt-dist">
                    {(routeInfo.distance ?? routeInfo.distanceKm ?? "-")}<em> km</em>
                  </span>
                    </div>
                  </div>

                  {/* 우측: 메뉴 & 닫기 */}
                  <div className="rt-right">
                    <button
                        className="rt-ico rt-ico-close"
                        aria-label="닫기"
                        onClick={() => {
                        setRouteInfo({});
                        setGO(false);
                        clearRoutePath?.();
                        window.__routeLocked = false; // 잠금 해제
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
          )}
        </main>

        <div>
          {showModal && modalParkName && (
              <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <ParkingChart
                      parkName={modalParkName}
                      csvDataByName={csvDataByName}
                  />
                  <button onClick={() => setShowModal(false)} className="modal-close">
                    닫기
                  </button>
                </div>
              </div>
          )}
        </div>
        {showArriveModal && (
            <div
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 1000,
                }}
                onClick={() => setShowArriveModal(false)}
            >
              <div
                  style={{
                    background: "#fff",
                    padding: "20px 25px",
                    borderRadius: "12px",
                    width: "280px",
                    textAlign: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                    animation: "fadeIn 0.2s ease-out",
                  }}
                  onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ marginBottom: "10px", fontSize: "18px", fontWeight: "bold" }}>
                  목적지에 도착했습니다!
                </h3>
                <p style={{ marginBottom: "15px", fontSize: "14px", color: "#555" }}>
                  안내를 종료합니다.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                  <button
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: "#3897f0",
                        color: "#fff",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                  >
                    안내 계속
                  </button>
                  <button
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                        backgroundColor: "#f9f9f9",
                        cursor: "pointer",
                      }}
                      onClick={() => setShowArriveModal(false)}
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}