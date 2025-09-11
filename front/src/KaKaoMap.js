import { useEffect, useState } from "react";
import axios from "axios";
import {Link} from "react-router-dom";
import Main from "./components/Main";

function KakaoMap() {

    const serviceKey =
        "UJwIk6dRRbBUl%2F%2Fx4CaTlCUPXgy5sJHsu%2BqaC1SDrpCBt%2B6fRG75s6BYi6sWJuIRLAGagNh23q8F6y820JW70g%3D%3D";

    useEffect(() => {
        window.kakao.maps.load(() => {
            const container = document.getElementById("map");
            const options = {
                center: new window.kakao.maps.LatLng(37.4138, 127.5183),
                level: 7,
            };
            new window.kakao.maps.Map(container, options);
        });
    }, []);

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
        // 저장 후 5개 조회
    };

    return (
        <>
            <div id="flex-container" style={{display:"flex",flexDirection:"row",justifyContent:"space-between",alignItems:"center",height:"100vh"}}>
            <div id="main"
                style={{width:"30%",height:"100%"}}>
                <Main/>
            </div>
            <div
                id="map"
                style={{ width: "70%", height: "100%", border: "1px solid black" }}
            ></div>
            </div>

            {/*초기 주차장 데이터베이스 로드시만
            <button onClick={handleSaveClick}>주차장 데이터 저장</button>
            */}
        </>
    );
}

export default KakaoMap;
