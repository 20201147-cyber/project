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
import { ParkingContext } from "../context/ParkingContext";
import {useContext} from "react";
// ETA 계산 유틸
function calcETA(min) {
  const m = Number(min);
  if (!m || Number.isNaN(m)) return "-";
  const d = new Date(Date.now() + m * 60000);
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  return `${hh}:${mm}`;
}

// ===== utils (define ONCE, top-level) =====
const pad2 = (n) => String(n).padStart(2, "0");

// "24:00" 허용
function toDateFromHHMM(hhmm) {
  let [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  if (h === 24) { h = 0; d.setDate(d.getDate() + 1); }
  d.setHours(h, m, 0, 0);
  return d;
}

function addMinutesHHMM(hhmm, minutes) {
  if (!hhmm || typeof minutes !== "number") return "-";
  const d = toDateFromHHMM(hhmm);
  d.setMinutes(d.getMinutes() + minutes);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// 다음 정각(06~24로 클램핑)
function roundToNextHourHH() {
  const d = new Date();
  let h = d.getMinutes() > 0 ? d.getHours() + 1 : d.getHours();
  if (h < 6) h = 6;
  if (h > 24) h = 24;
  return `${pad2(h)}:00`;
}

// 06~24 목록
const HOURS_24 = Array.from({ length: 19 }, (_, i) => i + 6);

// (예약) 5분 단가 기반 가격 계산
function calcTicketPrice(park, minutes, key) {
  if (key === "DAY") {
    return park?.DAY_PRICE ?? 50000; // 예: 정액 3만원, 필요시 필드/값 조정
  }
  const unit = Number(park?.PRK_CRG); // 5분당 요금
  if (!unit || Number.isNaN(unit)) return null;
  return unit * Math.ceil(minutes / 5);
}

// (예약) 권종 정의
const TICKETS = [
  { key: "60",  label: "1시간권", minutes: 60 },
  { key: "120", label: "2시간권", minutes: 120 },
  { key: "180", label: "3시간권", minutes: 180 },
  { key: "360", label: "6시간권",  minutes: 360 },
  { key: "480", label: "8시간권",  minutes: 480 },
  { key: "DAY", label: "당일권", minutes: 720 }, // 필요시 변경
];

// 경로 라인 제거
function clearRouteLine() {
  if (window.currentRouteLine) {
    window.currentRouteLine.setMap(null);
    window.currentRouteLine = null;
  }
}
// 거리 계산 함수 (미터 단위)
function calcDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // 지구 반경 (m)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
      Math.sin(dLat/2) ** 2 +
      Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
      Math.sin(dLng/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
// 굵기와 컬러만 바꿔서 3중 라인으로 예쁘게 렌더
function clearRoutePath() {
  ["routeGlowLine", "routeShadowLine", "currentRouteLine"].forEach(k => {
    if (window[k]) { window[k].setMap(null); window[k] = null; }
  });
}

function drawRoutePath(map, pathPoints, color = "#3897f0") {
  // 바깥 부드러운 광(글로우)
  window.routeGlowLine = new window.kakao.maps.Polyline({
    path: pathPoints,
    strokeWeight: 14,
    strokeColor: color,          // 같은 컬러
    strokeOpacity: 0.12,         // 투명
    strokeStyle: "solid",
  });
  window.routeGlowLine.setMap(map);

  // 흰색 외곽선(가독성 ↑)
  window.routeShadowLine = new window.kakao.maps.Polyline({
    path: pathPoints,
    strokeWeight: 10,
    strokeColor: "#ffffff",
    strokeOpacity: 0.95,
    strokeStyle: "solid",
  });
  window.routeShadowLine.setMap(map);

  // 본선(브랜드 컬러)
  window.currentRouteLine = new window.kakao.maps.Polyline({
    path: pathPoints,
    strokeWeight: 6,
    strokeColor: color,
    strokeOpacity: 1,
    strokeStyle: "solid",
  });
  window.currentRouteLine.setMap(map);
}

export default function Main() {
  const [mode, setMode] = useState("destination"); // destination | drive | favorites
  const [map, setMap] = useState(null);
  const [coordinates, setCoordinates] = useState({
    lat: 37.5662952,
    lng: 126.9779451,
  }); // 서울시청
  const [go, setGO] = useState(false);
  const [parkingList, setParkingList] = useState([]); // 최종 mergedParkingList 저장
  const [showModal, setShowModal] = useState(false);
  const [csvDataByName, setCsvDataByName] = useState({});
  const [modalParkName, setModalParkName] = useState(null);
  const [routeInfo, setRouteInfo] = useState({});
  const [reserveMode, setReserveMode] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [agree, setAgree] = useState(false);
  const [user, setUser] = useState(null);
  const [startTime,setStartTime] = useState(null);
  const { visibleOnly, setVisibleOnly } = useContext(ParkingContext);
  // 도착지명/ETA/예상 여석(가능하면)
  const destName = routeInfo?.destination || null;
  const timeMin = routeInfo?.time ?? routeInfo?.timeMin;

  const [showArriveModal, setShowArriveModal] = useState(false);
  // 로그인/로그아웃 버튼 클릭 핸들러
  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST" })
        .then(() => {setUser(null);
          alert("로그아웃 성공!")})
        .catch(err => console.error(err));
  };
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
    setRouteInfo(prev => ({ ...prev, destination: parkName }));

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
    if (!go || !routeInfo.destination || !map || !parkingList.length) return;

    const destPark = parkingList.find(p => p.PKLT_NM === routeInfo.destination);
    if (!destPark) return;

    const dist = calcDistanceMeters(
        coordinates.lat,
        coordinates.lng,
        parseFloat(destPark.LAT),
        parseFloat(destPark.LOT)
    );

    if (dist <= 50) { // 100m 이내
      setShowArriveModal(true);
      setGO(false);
      clearRoutePath();
    }
  }, [coordinates, go, routeInfo.destination, parkingList, map]);
  // 지도 중심을 기준으로 재탐색
  const onRerouteClick = async () => {
    if (!map || !routeInfo?.destination) return;
    const c = map.getCenter();
    await doRoute(c.getLat(), c.getLng(), routeInfo.destination);
  };

  // 주차장 리스트에서 해당 목적지의 남은 자리 찾기(없으면 "-")
  const expectedRemain = React.useMemo(() => {
    if (!destName) return "-";
    const p = parkingList.find(v => v.PKLT_NM === destName);
    return (p?.remainCnt ?? "-");
  }, [destName, parkingList]);

  // 정각만 입력되도록 강제(normalize). 13:17 입력해도 13:00으로 교정
  const handleStartTimeChange = (e) => {
    const v = e.target.value; // "HH:MM"
    if (!v) { setStartTime(""); return; }
    const [h] = v.split(":");
    const normalized = `${pad2(h)}:00`;
    setStartTime(normalized);
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

  const onStartGuide = () => { setGO(true); setMode("drive"); };
  const onClose = () => { setRouteInfo({}); setGO(false); clearRouteLine(); };
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

    // 기존 경로 제거
    clearRoutePath();
    drawRoutePath(map, pathPoints, "#3897f0");

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

      // 지도 중심 이동 시 현재 위치 업데이트 (스로틀)
      const onCenterChanged = throttle(() => {
        const c = mapInstance.getCenter();
        const lat = c.getLat();
        const lng = c.getLng();
        setCoordinates({ lat, lng });
        marker.setPosition(new window.kakao.maps.LatLng(lat, lng));
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

      // 남은 좌석 비율에 따른 브랜드 컬러
      const colorByRemain = (remain, total) => {
        if (remain == null || total <= 0) return "#9CA3AF"; // 정보 없음
        const r = remain / total;
        if (r >= 0.5) return "#3897f0"; // 파랑
        if (r >= 0.2) return "#f59e0b"; // 주황
        return "#ef4444"; // 빨강
      };

      // SVG 마커 이미지 생성 (scale로 크기 제어)
      const buildMarkerImage = (park, scale = 0.75) => {
        const BASE_W = 44,
            BASE_H = 56;
        const w = Math.round(BASE_W * scale);
        const h = Math.round(BASE_H * scale);

        const total = Number(park.TPKCT) || 0;
        const remain = park.remainCnt ?? null;
        const fill = colorByRemain(remain, total);
        const label = remain != null ? remain : "–";

        const circleR = 12 * scale;
        const fontSize = 14 * scale;

        const svg = `
          <svg width="${w}" height="${h}" viewBox="0 0 44 56" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="${2 * scale}" stdDeviation="${
            3 * scale
        }" flood-color="rgba(0,0,0,0.25)"/>
              </filter>
            </defs>
            <path filter="url(#shadow)" d="M22 1c11 0 20 9 20 20 0 14-20 34-20 34S2 35 2 21C2 10 11 1 22 1z" fill="${fill}"/>
            <circle cx="22" cy="21" r="${circleR}" fill="#ffffff"/>
            <text x="22" y="${
            25 * scale + (1 - scale) * 25
        }" font-size="${fontSize}"
              font-family="Inter, Apple SD Gothic Neo, Arial" text-anchor="middle"
              fill="${fill}" font-weight="700">${label}</text>
          </svg>`;
        return new window.kakao.maps.MarkerImage(
            "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
            new window.kakao.maps.Size(w, h),
            { offset: new window.kakao.maps.Point(w / 2, h) } // 핀 끝점 보정
        );
      };

      // 시간 "HHMM" → "HH:MM"
      const fmtHM = (s) =>
          s && s.length === 4 ? `${s.slice(0, 2)}:${s.slice(2)}` : s || "-";

      // 오버레이 HTML 생성
      const buildOverlayHTML = (park, idx) => {
        const total = park.TPKCT ?? "-";
        const live = park.liveCnt ?? "정보 없음";
        const remain = park.remainCnt ?? "정보 없음";
        const price = park.PRK_CRG != null ? `${park.PRK_CRG}원` : "정보 없음";
        const wd = `${fmtHM(park.WD_OPER_BGNG_TM)} - ${fmtHM(
            park.WD_OPER_END_TM
        )}`;

        return `
          <div class="ep-overlay">
            <div class="ep-overlay__head">
              <div class="ep-overlay__title">${
            park.PKLT_NM || "주차장"
        }</div>
              <div class="ep-overlay__badge">${park.CHGD_FREE_NM || ""}</div>
              <button class="ep-close" aria-label="닫기">×</button>
            </div>
            <div class="ep-overlay__body">
              <div class="ep-kv">
                <span>총자리</span><b>${total}</b>
                <span>현재</span><b>${live}</b>
                <span>남음</span><b>${remain}</b>
              </div>
              <div class="ep-row"><span>가격 (5분당)</span><b>${price}</b></div>
              <div class="ep-row"><span>운영시간</span><b>${wd}</b></div>
              <div class="ep-row"><span>유형</span><b>${
            park.PKLT_KND_NM || "-"
        }</b></div>
              <div class="ep-row"><span>전화</span><b>${park.TELNO || "-"}</b></div>
            </div>
            <div class="ep-overlay__actions">
              <button class="ep-overlay__btn" id="detail-zone">상세분석</button>&nbsp
              <a href="#" class="ep-overlay__btn" id="route-search" onClick={onRerouteClick}>경로탐색</a>
            </div>
          </div>`;
      };

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
              setRouteInfo({ destination: park.PKLT_NM }); // 목적지 세팅

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
            {mode === "favorites" && <FavoritesPanel />}

            {/* ✅ 경로가 생기면 카드만 노출 (중복 제거) */}
            {mode === "destination" && routeInfo?.destination && (() => {
              const getStatus = (park) => {
                const total = Number(park.TPKCT) || 0;
                const remain = park.remainCnt;
                if (remain == null || total === 0) return { label: "정보 없음", variant: "gray", pct: 0 };
                const r = remain / total;
                if (r >= 0.5) return { label: "여유", variant: "green", pct: Math.round(r*100) };
                if (r >= 0.2) return { label: "보통", variant: "amber", pct: Math.round(r*100) };
                return { label: "혼잡", variant: "red", pct: Math.round(r*100) };
              };
              const park = parkingList.find(p => p.PKLT_NM === routeInfo.destination) || {};
              const distanceStr = routeInfo.distance ?? routeInfo.distanceKm ?? "-";
              const timeMin = routeInfo.time ?? routeInfo.timeMin ?? "-";
              const eta = (() => {
                const m = Number(timeMin);
                if (!m || Number.isNaN(m)) return "-";
                const d = new Date(Date.now() + m * 60000);
                return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
              })();
              const expectedRemain = park?.remainCnt ?? "-";
              const chargeClass = park?.CHGD_FREE_NM ? "blue" : "gray";
              const status = getStatus(park); // 필요시 계산

              const fmtHM = s => s && s.length === 4 ? `${s.slice(0,2)}:${s.slice(2)}` : s || "-";
              //발표때 한번만
              const totalSpots = 1317;
              const parkedCars = 1235;
              const remaining = totalSpots - parkedCars;
              const fillPct = Math.round((remaining / totalSpots) * 100);

              // [REPLACE] 도착시 표기값: 하드코딩값만 사용
              const arrivalTotal  = totalSpots;
              const arrivalParked = parkedCars;
              const arrivalRemain = remaining;
              const arrivalPct    = Math.round((arrivalRemain / arrivalTotal) * 100);
              const arrivalLabel  = arrivalPct >= 50 ? "여유" : arrivalPct >= 20 ? "보통" : "혼잡";

              return (
              <div className="route-card mt-12">
                <div className="route-title-row">
                  <div className="route-title">{routeInfo.destination}</div>
                  <button className="btn-edit" onClick={onEditRoute} aria-label="경로 수정">
                    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9"/>
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                    </svg>
                  </button>
                </div>

                <div className="ep-drive-badges">
                  <span className={`badge ${chargeClass}`}>{park.CHGD_FREE_NM ?? "-"}</span>
                  <span className={`badge ${status.variant}`}>{status.label}</span>
                  {park.PKLT_KND_NM && <span className="badge outline">{park.PKLT_KND_NM}</span>}
                </div>

                {reserveMode ? (
                  <>
                    <div className="ep-drive-stats">
                      <div className="ep-stat"><span>거리</span><b>{distanceStr} km</b></div>
                      <div className="ep-stat"><span>도착시간</span><b>{eta}</b></div>
                      <div className="ep-stat"><span>현재 여석</span><b>{expectedRemain}</b></div>
                    </div>
                    <hr/>

                    {/* 권종 선택 */}
                    <div className="section-title" style={{marginTop:8}}>권종 선택</div>
                    <div className="ticket-grid">
                      {TICKETS.map(t => {
                        const price = calcTicketPrice(park, t.minutes, t.key);
                        const active = selectedTicket?.key === t.key;
                        return (
                          <button
                            key={t.key}
                            className={`ticket ${active ? "active" : ""}`}
                            onClick={() => setSelectedTicket({ ...t, price })}
                          >
                            <div className="ticket-label">{t.label}</div>
                            <div className="ticket-price">
                              {price == null ? "무료" : `${price.toLocaleString()}원`}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* 요약/동의 */}
                    <div className="reserve-summary">
                    {/* 시작 */}
                    <div className="summary-item start">
                      <span>시작</span>
                      <select className="time-select" value={startTime || ""} onChange={e=>setStartTime(e.target.value)}>
                        <option value="" disabled>시간 선택</option>
                        {HOURS_24.map(h => {
                          const v = `${pad2(h)}:00`;
                          return <option key={v} value={v}>{v}</option>;
                        })}
                      </select>
                    </div>

                      {/* 선택 권종 */}
                      <div className="summary-item">
                        <span>시간</span>
                        <b>{selectedTicket ? selectedTicket.label : "-"}</b>
                      </div>

                      {/* 종료(자동 계산) */}
                      <div className="summary-item">
                        <span>종료시간</span>
                        <b>{endTime}</b>
                      </div>

                      {/* 결제금액 */}
                      <div className="summary-item">
                        <span>결제금액</span>
                        <b>{selectedTicket?.price == null ? "-" : `${selectedTicket.price.toLocaleString()}원`}</b>
                      </div>
                    </div>

                    <label className="agree-row">
                      <input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)} />
                      <span>이용 안내 및 환불정책에 동의합니다</span>
                    </label>

                    <div className="route-actions">
                      <button
                        className="btn btn-start"
                        disabled={!selectedTicket || !agree}
                        onClick={async () => {
                          try {
                            await fetch("/api/reservations", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                parkCode: park.PKLT_CD,
                                parkName: routeInfo.destination,
                                minutes: selectedTicket.minutes,
                                price: selectedTicket.price ?? null,
                                eta,
                                startTime,
                                endTime,
                                userId: user?.id,
                                ticket: selectedTicket.key,
                              }),
                            });
                            alert("예약이 완료되었습니다.");

                            // 개발 모드(?devLogin)일 때는 로컬에도 저장해 '예약 내역'에서 보이게 함
                            const mock = {
                              id: Date.now(),
                              parkName: routeInfo.destination,
                              minutes: selectedTicket.minutes,
                              price: selectedTicket.price ?? null,
                              eta,
                              startTime,
                              endTime,
                              createdAt: new Date().toISOString(),
                              ticket: selectedTicket.key,
                            };
                            const stash = JSON.parse(localStorage.getItem("mockReservations") || "[]");
                            stash.unshift(mock);
                            localStorage.setItem("mockReservations", JSON.stringify(stash));

                            setReserveMode(false);
                            setSelectedTicket(null);
                            setAgree(false);
                            setStartTime("");
                          } catch (e) {
                            console.error(e);
                            alert("예약 처리에 실패했습니다.");

                            // 서버 실패해도 ?devLogin 모드면 로컬 저장
                            if (new URLSearchParams(window.location.search).has("devLogin")) {
                              const mock = {
                                id: Date.now(),
                                parkName: routeInfo.destination,
                                minutes: selectedTicket.minutes,
                                price: selectedTicket.price ?? null,
                                eta,
                                startTime,
                                endTime,
                                createdAt: new Date().toISOString(),
                                ticket: selectedTicket.key,
                              };
                              const stash = JSON.parse(localStorage.getItem("mockReservations") || "[]");
                              stash.unshift(mock);
                              localStorage.setItem("mockReservations", JSON.stringify(stash));
                            }
                          }
                        }}
                      >
                        예약 확정
                      </button>
                      <button
                        className="btn btn-close"
                        onClick={() => { setReserveMode(false); setSelectedTicket(null); setAgree(false); }}
                      >
                        취소
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ep-drive-stats">
                      <div className="ep-stat"><span>거리</span><b>{distanceStr} km</b></div>
                      <div className="ep-stat"><span>소요시간</span><b>{timeMin} 분</b></div>
                      <div className="ep-stat"><span>도착시간</span><b>{eta}</b></div>
                    </div>
                    <hr/>

                    {/* === [REPLACE-BEGIN] 도착시 블록 === */}
                    <div className="stat-stack">
                      {/* 헤더 */}
                      <div className="arrival-head">
                        <span className="loading-mini" aria-hidden="true"></span>
                        <span>도착시</span>
                        <b style={{ marginLeft: 6 }}>{eta}</b>
                      </div>

                      {/* 3개 카드: 정가운데 정렬 */}
                      <div className="stats-row arrival-row">
                        <div className="ep-stat2"><span>총자리</span><b>{arrivalTotal}</b></div>
                        <div className="ep-stat2"><span>주차된 차량</span><b>{arrivalParked}</b></div>
                        <div className="ep-stat2"><span>도착시 여석</span><b>{arrivalRemain}</b></div>
                      </div>

                      {/* 도착시 혼잡도 게이지 (항상 노출) */}
                      <div className={`ep-meter arrival ${status.variant}`}>
                        <div className="fill" style={{ width: `${arrivalPct}%` }} />
                        <div className="cap">{arrivalLabel}</div>
                      </div>
                    </div>

                    {/* [2] 현재 블록 */}
                    <div className="stats-row">
                      <div className="ep-stat">
                        <b>
                          <span style={{ fontSize: "14px", color: "black" }}>
                            <div>현재</div>
                            <div>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</div>
                          </span>
                        </b>
                      </div>
                      <div className="ep-stat"><span>총자리</span><b>{park.TPKCT ?? "-"}</b></div>
                      <div className="ep-stat"><span>주차된 차량</span><b>{park.liveCnt ?? "-"}</b></div>
                      <div className="ep-stat"><span>현재 여석</span><b>{expectedRemain}</b></div>
                    </div>
                    {/* === [REPLACE-END] === */}

                    {/* 혼잡도 게이지는 그대로 유지 (현재 상태용) */}
                    <div className={`ep-meter ${status.variant}`}>
                      <div className="fill" style={{ width: `${status.pct}%` }} />
                      <div className="cap">{status.label}</div>
                    </div>

                    <div className="route-actions">
                      <button className="btn btn-reserve" onClick={onReserve}>예약하기</button>
                      <button className="btn btn-start" onClick={()=>{ setGO(true); setMode("drive"); }}>안내 시작</button>
                      <button className="btn btn-close" onClick={()=>{
                        setRouteInfo({}); setGO(false);
                        if (window.currentRouteLine){ window.currentRouteLine.setMap(null); window.currentRouteLine=null; }
                      }}>닫기</button>
                    </div>
                  </>
                )}
              </div>
            );

            })()}
            </div>

            <div className="footer">@Eazypark</div>
            </aside>

        <main className="map-area">
          <div className="header-links">
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
          {routeInfo?.destination && (
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
                        onClick={() => { setRouteInfo({}); setGO(false); clearRoutePath?.(); }}
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