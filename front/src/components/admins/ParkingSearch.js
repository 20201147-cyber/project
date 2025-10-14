import React, {useContext, useEffect, useState} from "react";
import { ParkingContext } from "../../context/ParkingContext";
import "../../css/ParkingSearch.css"; // CSS 따로 분리 가능
import axios from "axios";


const ParkingSearch = () => {
    const { visibleOnly } = useContext(ParkingContext);
    const [user, setUser] = useState(null);
    useEffect(() => {
        fetch("/api/auth/me", { credentials: "include" })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                setUser(data);
                console.log("로그인 유저 정보:", data); // 여기서 찍으면 fetch 결과 확인 가능
            })
            .catch(() => {
                setUser(null);
                console.log("유저 정보 가져오기 실패");
            });
    }, []);
    async function saveDB(){
        try{
            await axios.post("/api/saveDB",visibleOnly);
        }catch(e){
            console.log("오류 발생"+e);
        }
    }
    async function registerPark(pkltCd) {
        try {
            // 관리자 ID와 pkltCd를 함께 전송
            await axios.post("/api/registerPark", {
                adminId: user.id,
                pkltCd
            }, { withCredentials: true });

            alert(`주차장 ${pkltCd} 등록 완료!`);
        } catch (e) {
            console.log("오류 발생: " + e);
        }
    }
    return (
        <div>
            <h2>🅿️ 주차장 찾기</h2>
            <p>주차장 등록, 수정, 삭제 기능을 제공합니다.</p>

            {/* 스크롤 가능한 div */}
            <div className="table-wrapper">
                <table border="1" cellPadding="5" cellSpacing="0">
                    <thead>
                    <tr>
                        <th>주차장 번호</th>
                        <th>주차장 이름</th>
                        <th>주차장 등록</th>
                    </tr>
                    </thead>
                    <tbody>
                    {visibleOnly.map((park, idx) => (
                        <tr key={idx}>
                            <td>{park.PKLT_CD}</td>
                            <td>{park.PKLT_NM}</td>
                            <td><button onClick={() => registerPark(park.PKLT_CD)}>등록</button></td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
            {/*초기 디비저장코드 <button onClick={saveDB}>주차장 저장</button>*/}
            <button onClick={saveDB}>주차장 저장</button>
        </div>
    );
};

export default ParkingSearch;
