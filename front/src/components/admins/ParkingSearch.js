import React, { useContext } from "react";
import { ParkingContext } from "../../context/ParkingContext";
import "../../css/ParkingSearch.css"; // CSS 따로 분리 가능

const ParkingSearch = () => {
    const { visibleOnly } = useContext(ParkingContext);

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
                        <th>5분당 가격</th>
                        <th>총자리</th>
                        <th>현재 대수</th>
                        <th>남은 자리</th>
                        <th>평일 오픈시간</th>
                        <th>평일 마감시간</th>
                        <th>주말 오픈시간</th>
                        <th>주말 마감시간</th>
                    </tr>
                    </thead>
                    <tbody>
                    {visibleOnly.map((park, idx) => (
                        <tr key={idx}>
                            <td>{park.PKLT_CD}</td>
                            <td>{park.PKLT_NM}</td>
                            <td>{park.PRK_CRG}</td>
                            <td>{park.TPKCT}</td>
                            <td>{park.liveCnt}</td>
                            <td>{park.remainCnt}</td>
                            <td>{park.WD_OPER_BGNG_TM}</td>
                            <td>{park.WD_OPER_END_TM}</td>
                            <td>{park.WE_OPER_BGNG_TM}</td>
                            <td>{park.WE_OPER_END_TM}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ParkingSearch;
