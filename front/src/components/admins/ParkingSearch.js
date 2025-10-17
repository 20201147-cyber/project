import React, { useContext, useEffect, useState } from "react";
import { ParkingContext } from "../../context/ParkingContext";
import "../../css/ParkingSearch.css";
import axios from "axios";

const ParkingSearch = () => {
    const { visibleOnly } = useContext(ParkingContext);
    const [user, setUser] = useState(null);
    const [search, setSearch] = useState(""); // 검색어 상태
    const [filteredParks, setFilteredParks] = useState(visibleOnly);

    useEffect(() => {
        fetch("/api/auth/me", { credentials: "include" })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                setUser(data);
                console.log("로그인 유저 정보:", data);
            })
            .catch(() => {
                setUser(null);
                console.log("유저 정보 가져오기 실패");
            });
    }, []);

    useEffect(() => {
        // 검색어 기반 필터링
        setFilteredParks(
            visibleOnly.filter(park =>
                park.PKLT_NM.toLowerCase().includes(search.toLowerCase())
            )
        );
    }, [search, visibleOnly]);

    async function saveDB() {
        try {
            await axios.post("/api/saveDB", visibleOnly);
            alert("DB 저장 완료!");
        } catch (e) {
            console.log("오류 발생: " + e);
        }
    }

    async function registerPark(pkltCd) {
        try {
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
        <div className="parking-container">
            <h2 className="title">주차장 찾기</h2>

            {/* 검색 input */}
            <div className="search-box">
                <input
                    type="text"
                    placeholder="주차장 이름으로 검색..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* 스크롤 가능한 테이블 */}
            <div className="table-wrapper">
                <table className="parking-table">
                    <thead>
                    <tr>
                        <th>주차장 번호</th>
                        <th>주차장 이름</th>
                        <th>등록</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredParks.map((park, idx) => (
                        <tr key={idx}>
                            <td>{park.PKLT_CD}</td>
                            <td>{park.PKLT_NM}</td>
                            <td>
                                <button onClick={() => registerPark(park.PKLT_CD)}>등록</button>
                            </td>
                        </tr>
                    ))}
                    {filteredParks.length === 0 && (
                        <tr>
                            <td colSpan="3" style={{ textAlign: "center", color: "#888" }}>
                                검색 결과가 없습니다.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            <button className="save-btn" onClick={saveDB}>주차장 저장</button>
        </div>
    );
};

export default ParkingSearch;
