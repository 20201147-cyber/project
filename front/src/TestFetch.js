import { useEffect } from "react";

function TestFetch() {
    useEffect(() => {
        const fetchData = async () => {
            try {
                const numOfRows = 50; // 한 페이지 데이터 수
                const totalToFetch = 10; // 총 100개만 가져오기
                let pageNo = 1;
                let allItems = [];

                while (allItems.length < totalToFetch) {
                    const response = await fetch(
                        `http://apis.data.go.kr/B553881/Parking/PrkSttusInfo` +
                        `?serviceKey=UJwIk6dRRbBUl%2F%2Fx4CaTlCUPXgy5sJHsu%2BqaC1SDrpCBt%2B6fRG75s6BYi6sWJuIRLAGagNh23q8F6y820JW70g%3D%3D` +
                        `&numOfRows=${numOfRows}&pageNo=${pageNo}&format=2`
                    );
                    const result = await response.json();
                    const items = result.PrkSttusInfo || [];

                    if (items.length === 0) break; // 더 이상 데이터 없으면 종료

                    allItems = allItems.concat(items);
                    pageNo++;
                }

                // 최대 100개만
                allItems = allItems.slice(0, 100);
                console.log("가져온 주차장 데이터:", allItems);

            } catch (err) {
                console.error("API 호출 실패:", err);
            }
        };

        fetchData();
    }, []);

    return <div>데이터 콘솔 확인</div>;
}

export default TestFetch;