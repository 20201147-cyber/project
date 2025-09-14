import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Main from "./components/Main";

function KakaoMap() {
    const serviceKey =
        "UJwIk6dRRbBUl%2F%2Fx4CaTlCUPXgy5sJHsu%2BqaC1SDrpCBt%2B6fRG75s6BYi6sWJuIRLAGagNh23q8F6y820JW70g%3D%3D";
    /*
    const [map, setMap] = useState(null);

    // 맵 로드 및 초기화
    useEffect(() => {
        window.kakao.maps.load(() => {
            const container = document.getElementById("map");
            const options = {
                center: new window.kakao.maps.LatLng(37.7485, 127.0419),
                level: 2, // 기본 zoom level
            };
            const mapInstance = new window.kakao.maps.Map(container, options);
            setMap(mapInstance);
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
    }, [map]);*/

    // 공공API에서 실시간 주차장 데이터 가져오기
    const fetchParkingData = async () => {
        const numOfRows = 10000;
        const pageNo = 10;

        const response = await fetch(
            `http://apis.data.go.kr/B553881/Parking/PrkSttusInfo?&serviceKey=${serviceKey}&numOfRows=${numOfRows}&pageNo=${pageNo}&format=2`
        );
        const result = await response.json();
        return result.PrkSttusInfo;
    };

    const sendToDB = async (parkingList) => {
        try {
            const batchSize = 1000;
            for (let i = 0; i < parkingList.length; i += batchSize) {
                const batch = parkingList.slice(i, i + batchSize);
                await axios.post("/api/insertBulk", batch);
            }
            console.log("✅ 모든 데이터 전송 완료");
        } catch (err) {
            console.error("DB 전송 실패:", err);
        }
    };

    const handleSaveClick = async () => {
        console.log("주차장 데이터 fetch 시작");
        const parkingList = await fetchParkingData();
        console.log("API 데이터 가져옴:", parkingList.length);

        await sendToDB(parkingList);
    };


    return (
        <>
            <div id="flex-container" style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: "100vh" }}>
                <div id="main">
                    <Main />
                </div>

            </div>


            {/*
            <button onClick={handleSaveClick}>주차장 데이터 저장</button>*/}
        </>
    );
}

export default KakaoMap;
