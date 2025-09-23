import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../css/Main.css";
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
    const [map, setMap] = useState(null);
    const [coordinates, setCoordinates] = useState({ lat: 37.5662952, lng: 126.9779451 }); // 서울시청
    const [go, setGO] = useState(false);
    const [allNearby, setAllNearby] = useState([]); // 상위 20개 저장
    const [nearbyParking, setNearbyParking] = useState([]); // 보여줄 5개
    const [currentIndex, setCurrentIndex] = useState(5);
    const [filters, setFilters] = useState({ free: false, paid: false, open24: false });

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
                position: new window.kakao.maps.LatLng(coordinates.lat, coordinates.lng),
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
            try {
                // 1. 실시간 정보 가져오기
                const realtimeResponse = await fetch(
                    `http://openapi.seoul.go.kr:8088/56776f4f766b696d3335704f6b434d/json/GetParkingInfo/1/1000/`
                );
                const realtimeData = await realtimeResponse.json();
                const realtimeList = realtimeData.GetParkingInfo?.row || [];
                console.log("실시간 정보 수:", realtimeList.length);

                // 2. 전체 주차장 정보 여러 번 호출해서 합치기
                let parkingList = [];
                for (let i = 0; i < 7; i++) {
                    const start = i * 1000 + 1;
                    const end = (i + 1) * 1000;
                    const response = await fetch(
                        `http://openapi.seoul.go.kr:8088/56776f4f766b696d3335704f6b434d/json/GetParkInfo/${start}/${end}/`
                    );
                    const result = await response.json();
                    const rows = result.GetParkInfo?.row || [];
                    console.log(`${start}~${end} 구간 데이터 수:`, rows.length);
                    parkingList = parkingList.concat(rows);
                }
                console.log("원래 주차장 수:", parkingList.length);

                // 3. PKLT_CD 기준 중복 제거
                const uniqueParkingMap = {};
                parkingList.forEach(park => {
                    if (park.PKLT_CD && !uniqueParkingMap[park.PKLT_CD]) {
                        uniqueParkingMap[park.PKLT_CD] = park;
                    }
                });
                parkingList = Object.values(uniqueParkingMap);
                console.log("중복 제거 후 주차장 수:", parkingList.length);

                // 4. 실시간 정보 매핑
                const realtimeMap = {};
                realtimeList.forEach(item => {
                    if (item.PKLT_CD) realtimeMap[item.PKLT_CD] = item;
                });

                // 5. 마커 클러스터러 생성
                const clusterer = new window.kakao.maps.MarkerClusterer({
                    map: map, // 지도 객체
                    averageCenter: true, // 클러스터의 중심 좌표를 평균값으로
                    minLevel: 6 // 줌 레벨이 6 이하일 때만 클러스터링
                });

                // 6. 마커 배열 생성
                const markers = parkingList.map(park => {
                    const lat = parseFloat(park.LAT);
                    const lng = parseFloat(park.LOT);
                    if (isNaN(lat) || isNaN(lng)) return null;

                    const liveInfo = realtimeMap[park.PKLT_CD];
                    const isRealtime = !!liveInfo;
                    const remainCnt =
                        isRealtime && liveInfo.NOW_PRK_VHCL_CNT != null
                            ? park.TPKCT - liveInfo.NOW_PRK_VHCL_CNT
                            : null;

                    const markerImage = new window.kakao.maps.MarkerImage(
                        isRealtime
                            ? "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png"
                            : "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png",
                        new window.kakao.maps.Size(24, 35)
                    );

                    const marker = new window.kakao.maps.Marker({
                        position: new window.kakao.maps.LatLng(lat, lng),
                        title: park.PKLT_NM,
                        image: markerImage,
                    });

                    const infowindow = new window.kakao.maps.InfoWindow({
                        content: `
                        <div style="padding:5px; font-size:12px;">
                            <strong>${park.PKLT_NM}</strong><br/>
                            주소: ${park.ADDR}<br/>
                            총면수: ${park.TPKCT}<br/>
                            실시간 제공: ${isRealtime ? "O" : "X"}<br/>
                            ${remainCnt !== null ? `<span style="color:blue">남은 자리: ${remainCnt}</span>` : ""}
                        </div>
                    `,
                    });

                    window.kakao.maps.event.addListener(marker, "mouseover", () => infowindow.open(map, marker));
                    window.kakao.maps.event.addListener(marker, "mouseout", () => infowindow.close());

                    return marker;
                }).filter(m => m !== null);

                // 7. 클러스터러에 마커 추가
                clusterer.addMarkers(markers);

            } catch (err) {
                console.error("공공 API 불러오기 실패:", err);
            }
        };

        fetchAndShowMarkers();
    }, [map]);

    // 가까운 주차장 20개 탐색

    useEffect(() => {
        const fetchNearbyParking = async () => {
            try {
                const response = await axios.get("/api/selectAll");
                const parkingList = response.data;

                const sorted = parkingList
                    .map((park) => {
                        const lat = parseFloat(park.prk_plce_entrc_la);
                        const lng = parseFloat(park.prk_plce_entrc_lo);
                        if (isNaN(lat) || isNaN(lng)) return null;
                        const distance = calculateDistance(coordinates.lat, coordinates.lng, lat, lng);
                        return { ...park, distance };
                    })
                    .filter((p) => p !== null)
                    .sort((a, b) => a.distance - b.distance)
                    .slice(0, 20);

                setAllNearby(sorted);
                setNearbyParking(sorted.slice(0, 5));
                setCurrentIndex(5);
            } catch (err) {
                console.error(err);
            }
        };

        fetchNearbyParking();
    }, [coordinates]);

    const handleRemoveParking = (removeParkId) => {
        setNearbyParking((prev) => prev.filter((p) => p.prk_plce_id !== removeParkId));
    };

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
            </div>
        );
    }

    const handleSafeDriveClick = () => {
        if (!map) return;
        map.setLevel(go ? 3 : 1);
        map.setZoomable(!go);
        setGO((prev) => !prev);
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (!map) return;
            const currentCenter = map.getCenter();
            const lat = currentCenter.getLat();
            const lng = currentCenter.getLng();
            const moveDistance = 0.0001;

            switch (event.key) {
                case "w": map.panTo(new window.kakao.maps.LatLng(lat + moveDistance, lng)); break;
                case "a": map.panTo(new window.kakao.maps.LatLng(lat, lng - moveDistance)); break;
                case "s": map.panTo(new window.kakao.maps.LatLng(lat - moveDistance, lng)); break;
                case "d": map.panTo(new window.kakao.maps.LatLng(lat, lng + moveDistance)); break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [map]);

    // Panels
    function DestinationPanel() {
        return (
            <div>
                <div className="section-title">목적지 모드</div>
                <div className="input-wrap"><input className="input" placeholder="출발지 (미입력시 내 위치)" /></div>
                <div className="mt-12" style={{ display: "flex", justifyContent: "center" }}>
                    <button className="swap-btn">↻ 바꾸기</button>
                </div>
                <div className="mt-12 input-wrap"><input className="input" placeholder="목적지" /></div>
                <div className="mt-12" style={{ display: "flex", gap: 8 }}>
                    <button className="primary-btn" style={{ flex: 1 }}>경로 조회</button>
                    <button className="ghost-btn">★ 추가</button>
                </div>
            </div>
        );
    }

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
                <div className="nearby-parking" style={{ marginTop: 12 }}>
                    {go && nearbyParking.length > 0 ? nearbyParking.map((park, index) => {
                        const lat = parseFloat(park.prk_plce_entrc_la);
                        const lng = parseFloat(park.prk_plce_entrc_lo);
                        const name = park.prk_plce_nm ?? "이름없는 주차장";
                        return (
                            <div key={index} className="card parking-card" style={{ padding: "10px", marginBottom: "8px", borderRadius: "6px", border: "2px solid #ddd", backgroundColor: "white" }}>
                                <div style={{ display: "flex", alignItems: "center" }}>
                                    <div style={{ fontWeight: "bold", fontSize: "1.1em" }}>{name}</div>
                                    <div style={{ display: "flex", gap: "4px", marginLeft: "auto" }}>
                                        <button
                                            className="primary-btn-center"
                                            style={{ width: "30px", height: "30px", padding: 0 }}
                                            onClick={() => {
                                                const url = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
                                                window.open(url, "_blank");
                                            }}
                                        >
                                            <img src="/images/navigation.png" alt="길찾기" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                        </button>
                                    </div>
                                </div>
                                <div style={{ color: "#555" }}>
                                    거리: {park.distance < 1 ? `${Math.round(park.distance * 1000)} m` : `${park.distance.toFixed(2)} km`}
                                </div>
                            </div>
                        );
                    }) : <div>{go ? <div>주차장 탐색중...</div> : <div></div>}</div>}
                </div>
            </div>
        );
    }

    function FavoritesPanel() {
        return (
            <div>
                <div className="section-title">즐겨찾기</div>
                <div className="tip-box">아직 저장된 즐겨찾기가 없습니다. 목적지 모드에서 ★ 버튼으로 추가하세요.</div>
            </div>
        );
    }

    return (
        <div className="app">
            <aside className="sidebar">
                <div className="brand-row">
                    {go ? <div style={{ display: "flex", alignItems: "center" }}><div className="loading-circle"></div><span className="safe-driving-text">안심 주행중</span></div>
                        : <><div className="brand">Eazypark</div><span className="pill">Beta</span></>}
                </div>
                <div className={go ? "fade-out" : "fade-in"}>
                    <div className="tabs">
                        <button className={`tab ${mode === "destination" ? "active" : ""}`} onClick={() => setMode("destination")}>목적지</button>
                        <button className={`tab ${mode === "drive" ? "active" : ""}`} onClick={() => setMode("drive")}>주행</button>
                        <button className={`tab ${mode === "favorites" ? "active" : ""}`} onClick={() => setMode("favorites")}>즐겨찾기</button>
                    </div>
                </div>
                <div className="panel-wrap">
                    {mode === "destination" && <DestinationPanel />}
                    {mode === "drive" && <DrivePanel />}
                    {mode === "favorites" && <FavoritesPanel />}
                </div>
                <div className="footer">@Eazypark</div>
            </aside>
            <main className="map-area">
                <div className="header-links">
                    <Link className="link-btn" to="/admin">관리자</Link>
                    <Link className="link-btn" to="/login">로그인</Link>
                </div>
                {go && <ParkingFilterOverlay />}
                <div id="map" className="map-canvas" style={{ width: "100%", height: "100%" }} />
            </main>
        </div>
    );
}