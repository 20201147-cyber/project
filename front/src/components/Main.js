// Main.js
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../css/Main.css";

import DestinationPanel from "./panels/DestinationPanel";
import DrivePanel from "./panels/DrivePanel";
import FavoritesPanel from "./panels/FavoritesPanel";

export default function Main() {
    const [mode, setMode] = useState("destination"); // destination | drive | favorites
    const [map, setMap] = useState(null);
    const [coordinates, setCoordinates] = useState({
        lat: 37.5662952,
        lng: 126.9779451,
    }); // 서울시청
    const [go, setGO] = useState(false);
    const [parkingList, setParkingList] = useState([]); // 최종 mergedParkingList 저장

    // 카카오 지도 초기화
    useEffect(() => {
        window.kakao.maps.load(() => {
            const container = document.getElementById("map");
            const options = {
                center: new window.kakao.maps.LatLng(coordinates.lat, coordinates.lng),
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

            // 지도 중심 이동 시 현재 위치 업데이트
            window.kakao.maps.event.addListener(mapInstance, "center_changed", () => {
                const newCenter = mapInstance.getCenter();
                const lat = newCenter.getLat();
                const lng = newCenter.getLng();
                setCoordinates({ lat, lng });
                marker.setPosition(new window.kakao.maps.LatLng(lat, lng));
            });
        });
    }, []);

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
                    boxShadow: "0 4px 12px rgba(0,0,0,.2)"
                    }
                  ]
            });
            // 남은 좌석 비율에 따른 브랜드 컬러
            const colorByRemain = (remain, total) => {
            if (remain == null || total <= 0) return "#9CA3AF";          // 정보 없음
            const r = remain / total;
            if (r >= 0.5) return "#3897f0";            // 파랑
            if (r >= 0.2) return "#f59e0b";            // 주황
            return "#ef4444";                           // 빨강
            };

            // SVG 마커 이미지 생성 (scale로 크기 제어)
            const buildMarkerImage = (park, scale = 0.75) => {
                const BASE_W = 44, BASE_H = 56;
                const w = Math.round(BASE_W * scale);
                const h = Math.round(BASE_H * scale);

                const total = Number(park.TPKCT) || 0;
                const remain = (park.remainCnt ?? null);
                const fill = colorByRemain(remain, total);
                const label = remain != null ? remain : "–";

                const circleR = 12 * scale;
                const fontSize = 14 * scale;

                const svg = `
                <svg width="${w}" height="${h}" viewBox="0 0 44 56" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="${2 * scale}" stdDeviation="${3 * scale}" flood-color="rgba(0,0,0,0.25)"/>
                    </filter>
                    </defs>
                    <path filter="url(#shadow)" d="M22 1c11 0 20 9 20 20 0 14-20 34-20 34S2 35 2 21C2 10 11 1 22 1z" fill="${fill}"/>
                    <circle cx="22" cy="21" r="${circleR}" fill="#ffffff"/>
                    <text x="22" y="${25 * scale + (1 - scale) * 25}" font-size="${fontSize}"
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
            const fmtHM = (s) => (s && s.length === 4) ? `${s.slice(0,2)}:${s.slice(2)}` : (s || "-");

            // 오버레이 HTML 생성
            const buildOverlayHTML = (park) => {
                const total  = park.TPKCT ?? "-";
                const live   = park.liveCnt ?? "정보 없음";
                const remain = park.remainCnt ?? "정보 없음";
                const price  = park.PRK_CRG != null ? `${park.PRK_CRG}원` : "정보 없음";
                const wd     = `${fmtHM(park.WD_OPER_BGNG_TM)} - ${fmtHM(park.WD_OPER_END_TM)}`;

                return `
                <div class="ep-overlay">
                    <div class="ep-overlay__head">
                    <div class="ep-overlay__title">${park.PKLT_NM || "주차장"}</div>
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
                    <div class="ep-row"><span>유형</span><b>${park.PKLT_KND_NM || "-"}</b></div>
                    <div class="ep-row"><span>전화</span><b>${park.TELNO || "-"}</b></div>
                    </div>
                    <div class="ep-overlay__actions">
                    <a target="_blank"
                        href="https://map.kakao.com/link/to/${encodeURIComponent(park.PKLT_NM)},${park.LAT},${park.LOT}"
                        class="ep-overlay__btn">길찾기</a>
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
                        // 기존 객체 그대로 복사
                        parkMapByName[name] = { ...park, LATs: [], LOTs: [] };
                    } else {
                        // 자리수 합산
                        parkMapByName[name].TPKCT += park.TPKCT;
                    }

                    parkMapByName[name].LATs.push(parseFloat(park.LAT));
                    parkMapByName[name].LOTs.push(parseFloat(park.LOT));
                });

                const uniqueParkingList = Object.values(parkMapByName).map((park) => ({
                    ...park,             // 기존 모든 필드 유지
                    LAT: park.LATs[0],   // 대표 좌표
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

                // 상태 업데이트
                setParkingList(mergedParkingList);

                console.log("최종 리스트 예시:", mergedParkingList);

                // 6. 마커 생성 (클릭 시 열림, X/밖 클릭으로 닫힘)
                const overlay = new window.kakao.maps.CustomOverlay({ zIndex: 4, yAnchor: 1.02 });
                let openedMarker = null;

                // 공통: 오버레이 열기
                const openOverlay = (park, position, marker) => {
                // 문자열을 DOM으로 만들어 닫기 버튼에 이벤트 연결
                const el = document.createElement("div");
                el.innerHTML = buildOverlayHTML(park);

                const closeBtn = el.querySelector(".ep-close");
                if (closeBtn) {
                    closeBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    overlay.setMap(null);
                    if (openedMarker) { openedMarker.setZIndex(1); openedMarker = null; }
                    });
                }

                overlay.setContent(el);
                overlay.setPosition(position);
                overlay.setMap(map);

                if (openedMarker) openedMarker.setZIndex(1);
                openedMarker = marker;
                marker.setZIndex(5);
                };

                // 빈 지도 클릭 시 닫기(원하면 주석 처리해서 “지도 클릭해도 유지” 가능)
                window.kakao.maps.event.addListener(map, "click", () => {
                overlay.setMap(null);
                if (openedMarker) { openedMarker.setZIndex(1); openedMarker = null; }
                });

                const markers = mergedParkingList
                .map((park) => {
                    const lat = parseFloat(park.LAT);
                    const lng = parseFloat(park.LOT);
                    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

                    const position = new window.kakao.maps.LatLng(lat, lng);

                    const marker = new window.kakao.maps.Marker({
                    position,
                    title: park.PKLT_NM ?? "",
                    image: buildMarkerImage(park, 0.75) // 크기 조정 중이면 배율 그대로
                    });

                    // ✅ 클릭으로 열기 (hover 로직 제거!)
                    window.kakao.maps.event.addListener(marker, "click", () => {
                    openOverlay(park, position, marker);
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
        <div className="app">
            <aside className="sidebar">
                <div className="brand-row">
                    {go ? (
                        <div style={{ display: "flex", alignItems: "center" }}>
                            <div className="loading-circle"></div>
                            <span className="safe-driving-text">안심 주행중</span>
                        </div>
                    ) : (
                        <>
                            <div className="brand">Eazypark</div>
                            <span className="pill">Beta</span>
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
                            즐겨찾기
                        </button>
                    </div>
                </div>

                <div className="panel-wrap">
                    {mode === "destination" && (
                        <DestinationPanel
                            map={map}
                            coordinates={coordinates}
                            ParkingList={parkingList}
                        />
                    )}
                    {mode === "drive" && (
                        <DrivePanel
                            map={map}
                            go={go}
                            setGO={setGO}
                            coordinates={coordinates}
                            ParkingList={parkingList}
                        />
                    )}
                    {mode === "favorites" && <FavoritesPanel />}
                </div>

                <div className="footer">@Eazypark</div>
            </aside>

            <main className="map-area">
                <div className="header-links">
                    <Link className="link-btn" to="/admin">
                        관리자
                    </Link>
                    <Link className="link-btn" to="/login">
                        로그인
                    </Link>
                    <Link className="link-btn" to="/mobile">
                        모바일 버전
                    </Link>
                </div>
                <div
                    id="map"
                    className="map-canvas"
                    style={{ width: "100%", height: "100%" }}
                />
            </main>
        </div>
    );
}
