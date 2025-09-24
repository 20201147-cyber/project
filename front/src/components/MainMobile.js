//$env:HOST="0.0.0.0"; npm start 모바일넣은 파워셸 명령어
import React, { useState, useEffect } from "react";
import "../css/MainMobile.css";

import DestinationPanel from "./panels/DestinationPanel";
import DrivePanel from "./panels/DrivePanel";
import FavoritesPanel from "./panels/FavoritesPanel";

export default function MainMobile() {
    const [mode, setMode] = useState("destination");
    const [map, setMap] = useState(null);
    const [coordinates, setCoordinates] = useState({ lat: 37.5662952, lng: 126.9779451 });
    const [go, setGO] = useState(false);
    const [parkingList, setParkingList] = useState([]);

    // 카카오 지도 초기화
    useEffect(() => {
        window.kakao.maps.load(() => {
            const container = document.getElementById("map-mobile");
            const options = { center: new window.kakao.maps.LatLng(coordinates.lat, coordinates.lng), level: 3 };
            const mapInstance = new window.kakao.maps.Map(container, options);
            setMap(mapInstance);
        });
    }, []);

    useEffect(() => {
        if (!map) return;

        const fetchAndShowMarkers = async () => {
            try {
                const response = await fetch("/api/mobile-api/parking");

                const data=await response.json();
                const realtimeList = data.realtime.GetParkingInfo?.row || [];
                const fullParkingList = data.parkInfo.GetParkInfo?.row || [];

                // 이름 기준 중복 제거 + 기존 속성 보존
                const parkMapByName = {};
                fullParkingList.forEach((park) => {
                    const name = park.PKLT_NM;
                    if (!name) return;
                    if (!parkMapByName[name]) parkMapByName[name] = { ...park, LATs: [], LOTs: [] };
                    else parkMapByName[name].TPKCT += park.TPKCT;
                    parkMapByName[name].LATs.push(parseFloat(park.LAT));
                    parkMapByName[name].LOTs.push(parseFloat(park.LOT));
                });

                const uniqueParkingList = Object.values(parkMapByName).map((park) => ({
                    ...park,
                    LAT: park.LATs[0],
                    LOT: park.LOTs[0],
                }));

                // 실시간 데이터 이름 기준 합산
                const realtimeMapByName = {};
                realtimeList.forEach((item) => {
                    const name = item.PKLT_NM;
                    if (!name) return;
                    if (!realtimeMapByName[name]) realtimeMapByName[name] = 0;
                    realtimeMapByName[name] += item.NOW_PRK_VHCL_CNT ?? 0;
                });

                // 정적 + 실시간 병합
                const mergedParkingList = uniqueParkingList.map((park) => {
                    const liveCnt = realtimeMapByName[park.PKLT_NM] ?? null;
                    const remainCnt = liveCnt != null ? park.TPKCT - liveCnt : null;
                    return { ...park, liveCnt, remainCnt };
                });

                setParkingList(mergedParkingList);

                // 마커 생성
                const clusterer = new window.kakao.maps.MarkerClusterer({ map, averageCenter: true, minLevel: 6 });
                const markers = mergedParkingList.map((park) => {
                    const marker = new window.kakao.maps.Marker({
                        position: new window.kakao.maps.LatLng(park.LAT, park.LOT),
                        title: park.PKLT_NM,
                    });

                    const infowindow = new window.kakao.maps.InfoWindow({
                        content: `
                            <div class="my-infowindow">
                                <h4>${park.PKLT_NM}</h4>
                                <p>총자리: ${park.TPKCT}</p>
                                <p>현재 대수: ${park.liveCnt ?? "정보 없음"}</p>
                                <p>남은 자리: ${park.remainCnt ?? "정보 없음"}</p>
                                <p>가격: ${park.PRK_CRG ?? "정보 없음"}원</p>
                            </div>
                        `,
                        removable: true,
                    });

                    window.kakao.maps.event.addListener(marker, "mouseover", () => infowindow.open(map, marker));
                    window.kakao.maps.event.addListener(marker, "mouseout", () => infowindow.close());

                    return marker;
                });
                clusterer.addMarkers(markers);

            } catch (err) {
                console.error("공공 API 불러오기 실패:", err);
            }
        };

        fetchAndShowMarkers();
    }, [map]);

    return (
        <div className="app-mobile">
            <header className="mobile-header">
                <div className="brand-row">
                    <div className="brand">Ezpark</div>
                    <span className="pill">Beta</span>
                </div>
                <div className="tabs-mobile">
                    <button className={`tab-mobile ${mode === "destination" ? "active" : ""}`} onClick={() => setMode("destination")}>목적지</button>
                    <button className={`tab-mobile ${mode === "drive" ? "active" : ""}`} onClick={() => setMode("drive")}>주행</button>
                    <button className={`tab-mobile ${mode === "favorites" ? "active" : ""}`} onClick={() => setMode("favorites")}>즐겨찾기</button>
                </div>
            </header>

            <div id="map-mobile" className="map-mobile" />

            <div className="panel-mobile">
                {mode === "destination" && <DestinationPanel map={map} coordinates={coordinates} ParkingList={parkingList} />}
                {mode === "drive" && <DrivePanel map={map} go={go} setGO={setGO} coordinates={coordinates} ParkingList={parkingList} />}
                {mode === "favorites" && <FavoritesPanel />}
            </div>
        </div>
    );
}
