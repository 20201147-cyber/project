import { useEffect, useState } from "react";

function ParkingInfo() {
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(
                    "http://apis.data.go.kr/B553881/Parking/PrkSttusInfo" +
                    "?serviceKey=UJwIk6dRRbBUl%2F%2Fx4CaTlCUPXgy5sJHsu%2BqaC1SDrpCBt%2B6fRG75s6BYi6sWJuIRLAGagNh23q8F6y820JW70g%3D%3D" +
                    "&numOfRows=10&pageNo=1&format=2"
                );
                const result = await response.json(); // JSON 응답
                console.log("API 응답:", result);
                setData(result);
            } catch (error) {
                console.error("API 호출 실패:", error);
            }
        };

        fetchData();
    }, []);

    return (
        <div>
            <h2>주차장 정보</h2>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
}

export default ParkingInfo;