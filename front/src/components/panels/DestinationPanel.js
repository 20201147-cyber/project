import React, { useState } from "react";
import FavoritesPanel from "./FavoritesPanel";
import ParkingChart from "../ParkingChart";

export default function DestinationPanel({ map, coordinates }) {
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");

    const handleRouteSearch = () => {
        if (!end) return alert("목적지를 입력하세요");
        console.log("경로 검색:", { start, end, coordinates });
        // TODO: 카카오 경로 검색 API 연동
    };

    return (
        <div>
            <div className="section-title">목적지 모드</div>
            <div className="input-wrap">
                <input
                    className="input"
                    placeholder="출발지 (미입력시 내 위치)"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                />
            </div>
            <div className="mt-12" style={{ display: "flex", justifyContent: "center" }}>
                <button className="swap-btn">↻ 바꾸기</button>
            </div>
            <div className="mt-12 input-wrap">
                <input
                    className="input"
                    placeholder="목적지"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                />
            </div>
            <div className="mt-12" style={{ display: "flex", gap: 8 }}>
                <button className="primary-btn" style={{ flex: 1 }} onClick={handleRouteSearch}>
                    경로 조회
                </button>
                <button className="ghost-btn">★ 추가</button>
            </div>
        </div>
    );
}
