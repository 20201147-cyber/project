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

    // 1️⃣ Kakao 지도 SDK 로드 및 초기화
    useEffect(() => {
        // 스크립트 중복 방지
        if (document.getElementById("kakao-map-script")) {
            if (window.kakao && !map) initMap();
            return;
        }

        const script = document.createElement("script");
        script.id = "kakao-map-script";
        script.src = "//dapi.kakao.com/v2/maps/sdk.js?appkey=e976d6b999ba7e5b40468df4f16b5a55&autoload=false";
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            initMap();
        };

        const initMap = () => {
            if (!window.kakao) return;
            window.kakao.maps.load(() => {
                const container = document.getElementById("map-mobile");
                const options = {
                    center: new window.kakao.maps.LatLng(coordinates.lat, coordinates.lng),
                    level: 3
                };
                const mapInstance = new window.kakao.maps.Map(container, options);
                setMap(mapInstance);
            });
        };

        return () => {
            document.head.removeChild(script);
        };
    }, [coordinates]);

    // 2️⃣ 마커 및 클러스터링
    useEffect(() => {
        if (!map) return;

        const fetchAndShowMarkers = async () => {
            try {
                const response = await fetch("/api/mobile-api/parking");
                const data = await response.json();

                const realtimeList = data.realtime.GetParkingInfo?.row || [];
                const fullParkingList = data.parkInfo.GetParkInfo?.row || [];

                // 이름 기준 중복 제거
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

                // 실시간 데이터 합산
                const realtimeMapByName = {};
                realtimeList.forEach((item) => {
                    const name = item.PKLT_NM;
                    if (!name) return;
                    if (!realtimeMapByName[name]) realtimeMapByName[name] = 0;
                    realtimeMapByName[name] += item.NOW_PRK_VHCL_CNT ?? 0;
                });

                // 병합
                const mergedParkingList = uniqueParkingList.map((park) => {
                    const liveCnt = realtimeMapByName[park.PKLT_NM] ?? null;
                    const remainCnt = liveCnt != null ? park.TPKCT - liveCnt : null;
                    return { ...park, liveCnt, remainCnt };
                });

                setParkingList(mergedParkingList);

                // 마커 생성
                const clusterer = new window.kakao.maps.MarkerClusterer({
                    map,
                    averageCenter: true,
                    minLevel: 6
                });

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
                    <div className="brand">Eazypark</div>
                    <span className="pill">Beta</span>
                </div>
                <div className="tabs-mobile">
                    <button
                        className={`tab-mobile ${mode === "destination" ? "active" : ""}`}
                        onClick={() => setMode("destination")}
                    >
                        목적지
                    </button>
                    <button
                        className={`tab-mobile ${mode === "drive" ? "active" : ""}`}
                        onClick={() => setMode("drive")}
                    >
                        주행
                    </button>
                    <button
                        className={`tab-mobile ${mode === "favorites" ? "active" : ""}`}
                        onClick={() => setMode("favorites")}
                    >
                        즐겨찾기
                    </button>
                </div>
            </header>

            <div id="map-mobile" className="map-mobile" style={{ width: "100%", height: "400px" }} />

            <div className="panel-mobile">
                {mode === "destination" && <DestinationPanel map={map} coordinates={coordinates} ParkingList={parkingList} />}
                {mode === "drive" && <DrivePanel map={map} go={go} setGO={setGO} coordinates={coordinates} ParkingList={parkingList} />}
                {mode === "favorites" && <FavoritesPanel />}
            </div>
        </div>
    );
}
