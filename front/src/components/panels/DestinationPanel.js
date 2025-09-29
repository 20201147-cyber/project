import React, { useState } from "react";
import FavoritesPanel from "./FavoritesPanel";
import ParkingChart from "../ParkingChart";


export default function DestinationPanel({ map, coordinates,routeInfo,setRouteInfo,go,setGO,setMode}) {
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
                    value={routeInfo.destination}
                    onChange={(e) => setEnd(e.target.value)}
                />
            </div>
            <div className="mt-12" style={{ display: "flex", gap: 8 }}>
                <button className="primary-btn" style={{ flex: 1 }} onClick={handleRouteSearch}>
                    경로 조회
                </button>
                <button className="ghost-btn">★ 추가</button>
            </div>
            <hr/>
            {routeInfo?.destination && (
                //안내 시작 및 예약
                //setRouteInfo({ distance: distKm, time: timeMin, destination: park.PKLT_NM });
                <div>
                    <div>
                        {routeInfo.destination}
                        <div>거리:{routeInfo.distance}KM</div>
                        <div>소요시간:{routeInfo.time}분</div>
                        <div>
                            도착시간: {
                            (() => {
                                if (!routeInfo.time) return "-";

                                const now = new Date();
                                const arrival = new Date(now.getTime() + routeInfo.time * 60 * 1000); // 분 → 밀리초
                                const hh = arrival.getHours().toString().padStart(2, "0");
                                const mm = arrival.getMinutes().toString().padStart(2, "0");
                                return `${hh}:${mm}`;
                            })()
                        }
                        </div>
                        <div>도착시 예상 여석</div>
                        <button className="primary-btn" style={{ flex: 1 }}>
                            예약하기
                        </button>
                        <button className="primary-btn" style={{ flex: 1 }} onClick={() => {setGO(true);setMode("drive")} }>
                            안내 시작
                        </button>
                        <button className="primary-btn" style={{ flex: 1 }} onClick={() => {
                            if (window.currentRouteLine) {
                            window.currentRouteLine.setMap(null); // 폴리라인 제거
                            window.currentRouteLine = null;
                            }
                            if (window.routeInfoOverlay) {
                                window.routeInfoOverlay.setMap(null); // 경로 정보 오버레이 제거
                                window.routeInfoOverlay = null;
                                }
                            setRouteInfo({});
                            }}>
                            닫기
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
}
