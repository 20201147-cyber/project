import React, { useState, useEffect } from "react";
import "../css/MainMobile.css";

import DestinationPanel from "./panels/DestinationPanel";
import DrivePanel from "./panels/DrivePanel";
import FavoritesPanel from "./panels/FavoritesPanel";

export default function MainMobile() {
    const [mode, setMode] = useState("destination"); // destination | drive | favorites
    const [map, setMap] = useState(null);
    const [coordinates, setCoordinates] = useState({
        lat: 37.5662952,
        lng: 126.9779451,
    });
    const [go, setGO] = useState(false);
    const [parkingList, setParkingList] = useState([]);

    // 카카오 지도 초기화
    useEffect(() => {
        window.kakao.maps.load(() => {
            const container = document.getElementById("map-mobile");
            const options = {
                center: new window.kakao.maps.LatLng(coordinates.lat, coordinates.lng),
                level: 3,
            };
            const mapInstance = new window.kakao.maps.Map(container, options);
            setMap(mapInstance);
        });
    }, []);

    return (
        <div className="app-mobile">
            {/* 상단 메뉴 */}
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

            {/* 지도 */}
            <div id="map-mobile" className="map-mobile" />

            {/* 패널 */}
            <div className="panel-mobile">
                {mode === "destination" && (
                    <DestinationPanel map={map} coordinates={coordinates} ParkingList={parkingList} />
                )}
                {mode === "drive" && (
                    <DrivePanel map={map} go={go} setGO={setGO} coordinates={coordinates} ParkingList={parkingList} />
                )}
                {mode === "favorites" && <FavoritesPanel />}
            </div>
        </div>
    );
}
