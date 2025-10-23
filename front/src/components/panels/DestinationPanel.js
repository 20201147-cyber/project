// DestinationPanel.js

import React, { useState } from "react";

export default function DestinationPanel({ map, coordinates, setGO, setMode,routeInfo,setRouteInfo }) {
    const [searchKeyword, setSearchKeyword] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState(null); // 독자적 경로 정보

    const TMAP_APP_KEY = "KTv2MthCTDaTxnVQ8hfUJ7mSHSdxii7j60hw5tPU";

    const searchTmapPOI = async () => {
        if (!searchKeyword) return alert("검색어를 입력하세요");
        try {
            const res = await fetch(
                `https://apis.openapi.sk.com/tmap/pois?version=1&format=json&searchKeyword=${encodeURIComponent(
                    searchKeyword
                )}&appKey=${TMAP_APP_KEY}`
            );
            const data = await res.json();
            if (data.searchPoiInfo?.pois?.poi?.length > 0) {
                setSearchResults(data.searchPoiInfo.pois.poi);
            } else {
                alert("검색 결과가 없습니다.");
            }
        } catch (err) {
            console.error("POI 검색 실패:", err);
            alert("검색 실패");
        }
    };

    const getTmapRoute = async (startCoord, endCoord) => {
        try {
            const res = await fetch("https://apis.openapi.sk.com/tmap/routes?version=1", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    appKey: TMAP_APP_KEY,
                },
                body: JSON.stringify({
                    startX: startCoord.lng,
                    startY: startCoord.lat,
                    endX: endCoord.lon,
                    endY: endCoord.lat,
                    reqCoordType: "WGS84GEO",
                    resCoordType: "WGS84GEO",
                }),
            });
            const data = await res.json();
            return data;
        } catch (err) {
            console.error("경로 검색 실패:", err);
            return null;
        }
    };

    const handleRouteSearch = async (poi) => {
        const endCoord = {
            lat: parseFloat(poi.noorLat),
            lon: parseFloat(poi.noorLon),
        };

        const routeData = await getTmapRoute(coordinates, endCoord);
        if (!routeData?.features) return alert("경로 검색 실패");

        let pathPoints = [];
        let totalTime = "-";
        let totalDistance = "-";

        routeData.features.forEach((feature) => {
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
            strokeStyle: "solid",
        });
        polyline.setMap(map);
        window.currentRouteLine = polyline;

        // 라인 그리는 순간 고정
        window.__routeLocked = true;

        const timeMin = totalTime !== "-" ? Math.round(totalTime / 60) : "-";
        const distKm = totalDistance !== "-" ? (totalDistance / 1000).toFixed(2) : "-";

        // ETA 계산
        let eta = "-";
        if (timeMin !== "-") {
            const now = new Date();
            now.setMinutes(now.getMinutes() + timeMin);
            eta = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }

        setSelectedRoute({
            poi,
            pathPoints,
            distanceStr: distKm,
            timeMin,
            eta,
            destLat: endCoord.lat,
            destLng: endCoord.lon,
        });

        // 지도 중심 이동
        if (map && pathPoints.length > 0) map.setCenter(pathPoints[0]);

        // 검색 리스트 숨김
        setSearchResults([]);
    };

    return (
        <div>
            <div className="section-title">목적지 탐색</div>

            <div className="search-row">
            <div className="input-wrap">
                <input
                className="input"
                placeholder="검색어 입력"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                />
            </div>

                <button className="primary-btn" onClick={searchTmapPOI}>
                    검색
                </button>
            </div>

            <hr />

            {/* 검색 결과 */}
            {searchResults.length > 0 && (
                <div style={{ marginTop: 12, backgroundColor: "white", borderRadius: 8, maxHeight: "400px", overflowY: "auto", border: "1px solid #eee" }}>
                    <div style={{padding: "12px 8px", borderBottom: "1px solid #eee",color:"black",fontSize:18,fontWeight:"bold"}}>검색 결과  {searchResults.length}개</div>
                    {searchResults.map((poi, idx) => (
                        <div key={idx} style={{ padding: "12px 8px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", whiteSpace: "nowrap", height:"80px", transition: "background-color 0.2s",color:"black" }}
                             onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
                             onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                        >
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                {poi.name} ({poi.upperAddrName} {poi.middleAddrName} {poi.lowerAddrName})
                            </div>
                            <button
                                className="primary-btn"
                                style={{ marginLeft: 8, fontSize: 12, flexShrink: 0, padding: "4px 8px", height: "30px" }}
                                onClick={() => handleRouteSearch(poi)}
                            >
                                탐색
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* 선택된 경로 정보 */}
            {selectedRoute && (
                <div style={{ marginTop: 12, padding: 12, backgroundColor: "#fafafa", borderRadius: 8, border: "1px solid #eee" }}>
                    <div className="ep-drive-stats" style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <div className="ep-stat"><span>거리</span><b>{selectedRoute.distanceStr} km</b></div>
                        <div className="ep-stat"><span>소요시간</span><b>{selectedRoute.timeMin} 분</b></div>
                        <div className="ep-stat"><span>도착시간</span><b>{selectedRoute.eta}</b></div>
                    </div>
                    <hr />
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "nowrap" }}>
                        <button
                            className="btn btn-start"
                            style={{ flex: 1, minWidth: 0 }}
                            onClick={() => {
                                setGO(true);
                                setMode("drive");
                                setRouteInfo({
                                    destination: selectedRoute.poi.name,
                                    time: selectedRoute.timeMin,
                                    distance: selectedRoute.distanceStr,
                                    isParking: false,               // 비주차장 플래그
                                    destLat: selectedRoute.destLat, // 목적지 위도
                                    destLng: selectedRoute.destLng, // 목적지 경도
                                    });
                                }}
                                >
                            안내 시작
                        </button>
                        <button
                            className="btn btn-close"
                            style={{ flex: 1, minWidth: 0 }}
                            onClick={() => {
                                if (window.currentRouteLine) {
                                    window.currentRouteLine.setMap(null);
                                    window.currentRouteLine = null;
                                }
                                setSelectedRoute(null);
                                window.__routeLocked = false; // 잠금 해제
                            }}
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
