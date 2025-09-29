// Tmap.js

import React, { useEffect } from "react";

export default function TmapRoute() {
    useEffect(() => {
        // 1. 지도 생성
        const map = new window.Tmap.Map({
            div: "map_div",
            width: "100%",
            height: "400px",
            zoom: 15,
        });

        // 2. 출발지/도착지 좌표 (예시)
        const start = new window.Tmap.LonLat(127.027619, 37.497942); // 출발지
        const end = new window.Tmap.LonLat(127.028630, 37.498820);   // 도착지

        // 3. API로 경로 요청
        fetch("/api/tmap/time", { method: "POST" })
            .then(res => res.json())
            .then(data => {
                console.log("예상 소요시간(초):", data.totalTime);
                console.log("예상 거리(미터):", data.totalDistance);
                console.log("예상 요금:", data.totalFare);

                // 4. 좌표 배열로 경로 그리기
                const coordinates = data.pathPoints.map(p => new window.Tmap.LonLat(p.lon, p.lat));

                // coordinates = [{lon, lat}, ...] 배열
                const tmapCoordinates = coordinates.map(p => new window.Tmapv2.LatLng(p.lat, p.lon));

                const polyline = new window.Tmapv2.Polyline({
                    map: map,
                    path: tmapCoordinates,
                    strokeColor: "#FF0000",
                    strokeWeight: 5,
                    strokeOpacity: 0.7,
                });

                map.setCenter(tmapCoordinates[0]); // 지도 중심

                // 5. 시작/도착 마커 추가
                const startMarker = new window.Tmap.Marker(start, { title: "출발지" });
                const endMarker = new window.Tmap.Marker(end, { title: "도착지" });
                map.addMarker(startMarker);
                map.addMarker(endMarker);

                // 6. 지도 중심 이동
                map.setCenter(start);
            })
            .catch(err => console.error(err));
    }, []);

    return (
        <div>
            <h2>Tmap 경로 표시 예제</h2>
            <div id="map_div" style={{ width: "100%", height: "400px" }}></div>
        </div>
    );
}