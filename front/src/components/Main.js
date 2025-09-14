import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../css/Main.css"; // 아래 CSS 파일 임포트
import axios from "axios";

// 두 지점 간 거리 계산 함수 (Haversine 공식)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // 지구 반경 (km)
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // km 단위 거리 반환
};

export default function Main() {
    const [mode, setMode] = useState("destination"); // destination | drive | favorites
    const [map, setMap] = useState(null); // 지도 인스턴스를 상태로 관리
    const [coordinates, setCoordinates] = useState({ lat: 37.7485, lng: 127.0419 }); // 기본 위치 (위도, 경도)
    const [go, setGO] = useState(false);
    const [nearbyParking, setNearbyParking] = useState([]); // 가까운 주차장 5개 저장
    const [filters, setFilters] = useState({
        free: false,
        paid: false,
        open24: false,
    });

    // 카카오 맵 로드 및 초기화
    useEffect(() => {
        window.kakao.maps.load(() => {
            const container = document.getElementById("map");
            const options = {
                center: new window.kakao.maps.LatLng(coordinates.lat, coordinates.lng), // 기본 위치
                level: 2, // 기본 zoom level
            };
            const mapInstance = new window.kakao.maps.Map(container, options);
            setMap(mapInstance); // 맵 인스턴스를 상태로 저장

            // 내 위치 마커 추가
            const marker = new window.kakao.maps.Marker({
                position: new window.kakao.maps.LatLng(coordinates.lat, coordinates.lng),
                map: mapInstance,
                title: "현재 위치",
                image: new window.kakao.maps.MarkerImage(
                    "/images/car.png",
                    new window.kakao.maps.Size(50, 50) // 마커 이미지 크기
                ),
            });

            // 지도 중심이 변경될 때마다 현재 위치 업데이트
            window.kakao.maps.event.addListener(mapInstance, "center_changed", () => {
                const newCenter = mapInstance.getCenter();
                const lat = newCenter.getLat();
                const lng = newCenter.getLng();

                setCoordinates({ lat, lng });
                marker.setPosition(new window.kakao.maps.LatLng(lat, lng));
            });
        });
    }, []);

    // 저장된 주차장 데이터 -> 마커 표시
    useEffect(() => {
        if (!map) return;

        const fetchAndShowMarkers = async () => {
            try {
                const response = await axios.get("/api/selectAll");
                const parkingList = response.data;

                parkingList.forEach((park) => {
                    const lat = parseFloat(park.prk_plce_entrc_la);
                    const lng = parseFloat(park.prk_plce_entrc_lo);

                    if (isNaN(lat) || isNaN(lng)) return;

                    const marker = new window.kakao.maps.Marker({
                        position: new window.kakao.maps.LatLng(lat, lng),
                        map: map,
                        title: park.prk_plce_nm,
                    });

                    const infowindow = new window.kakao.maps.InfoWindow({
                        content: `<div style="padding:5px;">${park.prk_plce_nm}</div>`,
                    });

                    window.kakao.maps.event.addListener(marker, "mouseover", () => {
                        infowindow.open(map, marker);
                    });

                    window.kakao.maps.event.addListener(marker, "mouseout", () => {
                        infowindow.close();
                    });
                });
            } catch (err) {
                console.error("주차장 데이터 불러오기 실패:", err);
            }
        };

        fetchAndShowMarkers();
    }, [map]);

    // 가까운 주차장 5개 탐색 (현재 위치 기준)
    useEffect(() => {
        const fetchNearbyParking = async () => {
            try {
                const response = await axios.get("/api/selectAll");
                const parkingList = response.data;

                // 거리 계산 후 가까운 순 정렬
                const parkingWithDistance = parkingList
                    .map((park) => {
                        const lat = parseFloat(park.prk_plce_entrc_la);
                        const lng = parseFloat(park.prk_plce_entrc_lo);
                        if (isNaN(lat) || isNaN(lng)) return null;

                        const distance = calculateDistance(
                            coordinates.lat,
                            coordinates.lng,
                            lat,
                            lng
                        );

                        return { ...park, distance };
                    })
                    .filter((p) => p !== null)
                    .sort((a, b) => a.distance - b.distance)
                    .slice(0, 5);

                setNearbyParking(parkingWithDistance);
            } catch (err) {
                console.error("주차장 데이터 불러오기 실패:", err);
            }
        };

        fetchNearbyParking();
    }, [coordinates]);

    function ParkingFilterOverlay() {
        return (
            <div className="filter-overlay">
                <h3>filter</h3>
                <label>
                    <input
                        type="checkbox"
                        checked={filters.free}
                        onChange={(e) => setFilters({ ...filters, free: e.target.checked })}
                    />
                    무료
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={filters.paid}
                        onChange={(e) => setFilters({ ...filters, paid: e.target.checked })}
                    />
                    유료
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={filters.open24}
                        onChange={(e) => setFilters({ ...filters, open24: e.target.checked })}
                    />
                    24시간
                </label>
                <label>난이도
                    하<input type="radio"></input>
                    중<input type="radio"></input>
                    상<input type="radio"></input>
                </label>
                <label>여석
                    여유<input type="radio"></input>
                    보통<input type="radio"></input>
                    혼잡<input type="radio"></input>
                </label>
                <button className="primary-btn-center">적용</button>
            </div>
        );
    }
    // "안심 주행" 버튼 클릭 시 처리
    const handleSafeDriveClick = () => {
        if (!map) return;

        if (go) {
            map.setLevel(3);
            map.setZoomable(true);
        } else {
            map.setLevel(1);
            map.setZoomable(false);
        }

        setGO((prev) => !prev);
    };

    // 키보드 이벤트 처리 - w, a, s, d
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (!map) return;

            const currentCenter = map.getCenter();
            const lat = currentCenter.getLat();
            const lng = currentCenter.getLng();

            const moveDistance = 0.0001; // 이동 거리 설정

            switch (event.key) {
                case "w":
                    map.panTo(new window.kakao.maps.LatLng(lat + moveDistance, lng));
                    break;
                case "a":
                    map.panTo(new window.kakao.maps.LatLng(lat, lng - moveDistance));
                    break;
                case "s":
                    map.panTo(new window.kakao.maps.LatLng(lat - moveDistance, lng));
                    break;
                case "d":
                    map.panTo(new window.kakao.maps.LatLng(lat, lng + moveDistance));
                    break;
                default:
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [map]);

    /* ───────────────── Panels (UI만) ───────────────── */

    function DestinationPanel() {
        return (
            <div>
                <div className="section-title">목적지 모드</div>

                <div className="input-wrap">
                    <input className="input" placeholder="출발지 (미입력시 내 위치)" />
                </div>

                <div className="mt-12" style={{ display: "flex", justifyContent: "center" }}>
                    <button className="swap-btn">↻ 바꾸기</button>
                </div>

                <div className="mt-12 input-wrap">
                    <input className="input" placeholder="목적지" />
                </div>

                <div className="mt-12" style={{ display: "flex", gap: 8 }}>
                    <button className="primary-btn" style={{ flex: 1 }}>
                        경로 조회
                    </button>
                    <button className="ghost-btn">★ 추가</button>
                </div>
            </div>
        );
    }
    //주행모드
    function DrivePanel() {
        return (
            <div>
                <div className="section-title">주행 모드</div>

                <div className="card">
                    <div className="subtle">현재 목적지</div>
                    <div style={{ marginTop: 6, fontWeight: 600 }}>목적지 미설정</div>
                </div>

                <button className="primary-btn-center" onClick={handleSafeDriveClick}>
                    {go ? "안심 주행 종료" : "안심 주행"}
                </button>
                {/* 가까운 주차장 5개 카드 리스트 */}
                <div className="nearby-parking" style={{ marginTop: 12 }}>
                    {go && nearbyParking.length > 0 ? (
                        nearbyParking.map((park, index) => (
                            <div
                                key={index}
                                className="card parking-card"
                                style={{
                                    padding: "10px",
                                    marginBottom: "8px",
                                    borderRadius: "6px",
                                    border: "2px solid #ddd",
                                    backgroundColor:"white"
                                }}
                            >
                                <div style={{display:"flex"}}>
                                    <div
                                        style={{ fontWeight: "bold", fontSize: "1.1em", marginBottom: 4 }}
                                    >   {index+1}.
                                        {park.prk_plce_nm??"이름없는 주차장"}
                                    </div>
                                    <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                                    </div>
                                </div>
                                <div style={{ color: "#555" }}>
                                    거리: {park.distance.toFixed(2)} km
                                </div>

                            </div>
                        ))
                    ) : (
                        <div>{go?(<div>주차장 탐색중...</div>):(<div></div>)}</div>
                    )}
                </div>
            </div>
        );
    }

    function FavoritesPanel() {
        return (
            <div>
                <div className="section-title">즐겨찾기</div>

                <div className="tip-box">
                    아직 저장된 즐겨찾기가 없습니다. 목적지 모드에서 ★ 버튼으로 추가하세요.
                </div>

                <ul className="list mt-12">
                    <li className="list-item">
                        <span
                            style={{
                                flex: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            예시 목적지
                        </span>
                        <button className="small-btn">내비</button>
                        <button className="small-btn">편집</button>
                        <button
                            className="small-btn"
                            style={{ color: "#d12", borderColor: "#f0d2d2" }}
                        >
                            삭제
                        </button>
                    </li>
                </ul>
            </div>
        );
    }

    return (
        <div className="app">
            {/* 왼쪽: 고정 사이드바 */}
            <aside className="sidebar">
                {/* go 상태가 true일 때 기존 로고를 "안심 주행중"으로 대체 */}
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
                {/* go 상태에 따라 tabs 숨기기 */}
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
                    {mode === "destination" && <DestinationPanel />}
                    {mode === "drive" && <DrivePanel />}
                    {mode === "favorites" && <FavoritesPanel />}
                </div>

                <div className="footer">@Eazypark</div>
            </aside>

            {/* 오른쪽: 반응형 지도 영역 */}
            <main className="map-area">
                {/* 우상단 링크 */}
                <div className="header-links">
                    <Link className="link-btn" to="/admin">
                        관리자
                    </Link>
                    <Link className="link-btn" to="/login">
                        로그인
                    </Link>
                </div>
                {/* ✅ 필터 UI도 지도 우측 상단에 고정 표시 (go일 때만) */}
                {go && <ParkingFilterOverlay />}

                {/* 실제 카카오 지도 마운트 위치 (UI만 제공) */}
                <div id="map" className="map-canvas" style={{ width: "100%", height: "100%" }} />
            </main>
        </div>
    );
}
