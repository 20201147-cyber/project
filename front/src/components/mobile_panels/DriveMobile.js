// DrivePanel.js
import React, { useState, useEffect } from "react";
import "../../mobile_css/DriveMobile.css"
// 거리 계산 함수 (Haversine 공식)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // 지구 반경 (km)
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // km 단위
};

export default function DriveMobile({ map, go, setGO, coordinates, ParkingList, routeInfo, setRouteInfo }) {
    const [nearbyParking, setNearbyParking] = useState([]);
    const [originalDestination, setOriginalDestination] = useState(routeInfo?.destination ?? null);

    const [showModal, setShowModal] = useState(false);
    const [selectedPark, setSelectedPark] = useState(null);

    const destinationName = routeInfo?.destination ?? "미설정";
    const fmtHM = (s) => (s && s.length === 4) ? `${s.slice(0,2)}:${s.slice(2)}` : "-";

    // ✅ 경로탐색 함수 (기존 코드 그대로 옮김)
    const handleRouteSearch = async (park) => {
        if (!map) return;

        const parkLat = parseFloat(park.LAT);
        const parkLng = parseFloat(park.LOT);

        const startX = coordinates.lng;
        const startY = coordinates.lat;
        const endX = parkLng;
        const endY = parkLat;

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

            // 기존 라인 제거 후 새 라인 그리기
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

            // 목적지를 새 주차장으로 “정식 변경” (주차장 플래그 포함)
            setRouteInfo({
                distance: distKm,
                time: timeMin,
                destination: park.PKLT_NM,
                isParking: true
            });

            // 명시적 재탐색 후에도 자동 재탐색은 막아둠
            window.__routeLocked = true;
        } catch (err) {
            console.error("경로 탐색 실패:", err);
        }
    };

    const getStatus = (park) => {
        const total = Number(park.TPKCT) || 0;
        const remain = park.remainCnt;
        if (remain == null || total === 0) return { label: "정보 없음", variant: "gray", pct: 0 };
        const r = remain / total;
        if (r >= 0.5) return { label: "여유", variant: "green", pct: Math.round(r*100) };
        if (r >= 0.2) return { label: "보통", variant: "amber", pct: Math.round(r*100) };
        return { label: "혼잡", variant: "red", pct: Math.round(r*100) };
    };

    // 주행모드 on/off
    const handleSafeDriveClick = () => {
        setGO(prev => !prev);
        const position = new window.kakao.maps.LatLng(coordinates.lat,coordinates.lng);
        map.setCenter(position);
        // 주행모드 시작 시 현재 목적지 저장
        if (!go && routeInfo?.destination) {
            setOriginalDestination(routeInfo.destination);
        }
    };

    // 원래 목적지로 돌아가기
    const handleReturnToOriginal = async () => {
        if (!map || !originalDestination) return;

        const destPark = ParkingList.find(p => p.PKLT_NM === originalDestination);
        if (!destPark) return;

        const startX = coordinates.lng;
        const startY = coordinates.lat;
        const endX = parseFloat(destPark.LOT);
        const endY = parseFloat(destPark.LAT);

        try {
            const res = await fetch("https://apis.openapi.sk.com/tmap/routes?version=1", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "appKey": "KTv2MthCTDaTxnVQ8hfUJ7mSHSdxii7j60hw5tPU"
                },
                body: JSON.stringify({
                    startX,
                    startY,
                    endX,
                    endY,
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
            setRouteInfo({ distance: distKm, time: timeMin, destination: originalDestination });
        } catch (err) {
            console.error("원래 목적지 길찾기 실패:", err);
        }
    };

    // 지도 줌/이동 제한
    useEffect(() => {
        if (!map) return;
        if (go) {
            map.setLevel(1);
            map.setZoomable(false);
        } else {
            map.setLevel(3);
            map.setZoomable(true);
        }
    }, [go, map]);

    // 키보드 이동
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (!map) return;
            const currentCenter = map.getCenter();
            const lat = currentCenter.getLat();
            const lng = currentCenter.getLng();
            const moveDistance = 0.00005;

            switch (event.key) {
                case "w": map.panTo(new window.kakao.maps.LatLng(lat + moveDistance, lng)); break;
                case "a": map.panTo(new window.kakao.maps.LatLng(lat, lng - moveDistance)); break;
                case "s": map.panTo(new window.kakao.maps.LatLng(lat - moveDistance, lng)); break;
                case "d": map.panTo(new window.kakao.maps.LatLng(lat, lng + moveDistance)); break;
                default: break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [map]);

    // 가까운 주차장 5개 계산
    useEffect(() => {
        if (!ParkingList || ParkingList.length === 0) return;

        const parksWithDistance = ParkingList.map((park) => {
            const lat = park.LAT ?? 0;
            const lng = park.LOT ?? 0;
            const distance = calculateDistance(coordinates.lat, coordinates.lng, lat, lng);
            return { ...park, distance };
        });

        const sorted = parksWithDistance
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5); // 상위 5개

        setNearbyParking(sorted);
    }, [ParkingList, coordinates]);

    return (
        <div>
            <div className="section-title" style={{fontSize:30}}>주행 모드</div>
            <div className="card" style={{fontSize:30}}>
                <div className="subtle" style={{fontSize:30}}>현재 목적지</div>
                <div style={{ marginTop: 6, fontWeight: 600 }}>{destinationName}</div>
            </div>
            <button className="primary-btn-center" onClick={handleSafeDriveClick} style={{fontSize:30}}>
                {go ? "안심 주행 종료" : "안심 주행"}
            </button>

            <div className="nearby-parking" style={{ marginTop: 12 }}>
                {go && nearbyParking.length > 0
                    ? nearbyParking.map((park, index) => {
                        const status = getStatus(park);
                        const distanceStr =
                            park.distance < 1
                                ? `${Math.round(park.distance * 1000)} m`
                                : `${park.distance.toFixed(2)} km`;
                        const chargeClass = (park.CHDG_FREE_NM || park.CHGD_FREE_NM) === "무료" ? "green" : "blue";
                        const pctText = status.pct ? `${status.pct}%` : "—";

                        return (
                            <article key={index} className="ep-drive-card" >
                                <header className="ep-drive-top">
                                    <h4 className="ep-drive-title" style={{fontSize:30}}>{park.PKLT_NM ?? "이름없는 주차장"}</h4>
                                    <button
                                        className="ep-drive-route-btn"
                                        onClick={() => {
                                            setSelectedPark(park);   // ✅ 선택한 주차장 저장
                                            setShowModal(true);       // ✅ 모달 띄우기
                                        }}
                                        style={{fontSize:30}}
                                    >
                                        경로탐색
                                    </button>
                                </header>

                                <div className="ep-drive-badges" >
                                    <span className="badge blue" style={{fontSize:30}}>{distanceStr}</span>
                                    <span className={`badge ${chargeClass}`} style={{fontSize:30}}>{park.CHGD_FREE_NM ?? "-"}</span>
                                    <span className={`badge ${status.variant}`} style={{fontSize:30}}>{status.label}</span>
                                    {park.PKLT_KND_NM && <span className="badge outline" style={{fontSize:30}}>{park.PKLT_KND_NM}</span>}
                                </div>

                                <div className="ep-drive-stats">
                                    <div className="ep-stat"><span style={{fontSize:30}}>총자리</span><b>{park.TPKCT ?? "-"}</b></div>
                                    <div className="ep-stat"><span style={{fontSize:30}}>현재</span><b>{park.liveCnt ?? "-"}</b></div>
                                    <div className="ep-stat"><span style={{fontSize:30}}>남음</span><b>{park.remainCnt ?? "-"}</b></div>
                                </div>

                                <div className={`ep-meter ${status.variant}`}>
                                    <div className="fill" style={{ width: `${status.pct}%` }} />
                                    <div className="cap">{pctText}</div>
                                </div>

                                <div className="ep-drive-meta" style={{fontSize:20}}>
                                    <span>운영시간</span>
                                    <div>{fmtHM(park.WD_OPER_BGNG_TM)} - {fmtHM(park.WD_OPER_END_TM)}</div>

                                    <span>연락처</span>
                                    <div>{park.TELNO ?? "-"}</div>

                                    {park.ADDR && (<><span>주소</span><div>{park.ADDR}</div></>)}
                                </div>
                            </article>
                        );
                    })
                    : go ? <div>주차장 탐색중...</div> : null}
            </div>
            {/* ✅ 모달 */}
            {/* DrivePanel.js 모달 부분 */}
            {showModal && selectedPark && (
                <div
                    className="modal3-overlay"
                    onClick={() => setShowModal(false)} // 배경 클릭 시 닫힘
                >
                    <div
                        className="modal3 modal3--compact"
                        onClick={(e) => e.stopPropagation()} // 박스 클릭 시 닫히지 않게
                        style={{height:"250px",width:"500px"}}
                    >
                        <h3 style={{fontSize:30}}>경로 안내</h3>
                        <p style={{fontSize:30}}>
                            <b>{selectedPark.PKLT_NM}</b> 으로 안내하시겠습니까?
                        </p>
                        <div className="modal3-actions">
                            <button
                                className="yes-btn"
                                onClick={() => {
                                    handleRouteSearch(selectedPark);
                                    setShowModal(false);
                                }}
                                style={{fontSize:30,height:50}}
                            >
                                예
                            </button>
                            <button
                                className="no-btn"
                                onClick={() => setShowModal(false)}
                                style={{fontSize:30,height:50}}
                            >
                                아니요
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
