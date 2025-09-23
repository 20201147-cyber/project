// DrivePanel.js
import React, { useState, useEffect } from "react";

// 거리 계산 함수 (Haversine 공식)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // 지구 반경 (km)
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // km 단위
};

export default function DrivePanel({ map, go, setGO, coordinates, ParkingList }) {
    const [nearbyParking, setNearbyParking] = useState([]);

    const fmtHM = (s) => (s && s.length === 4) ? `${s.slice(0,2)}:${s.slice(2)}` : "-";

    const getStatus = (park) => {
        const total = Number(park.TPKCT) || 0;
        const remain = park.remainCnt;
        if (remain == null || total === 0) return { label: "정보 없음", variant: "gray", pct: 0 };
        const r = remain / total;
        if (r >= 0.5) return { label: "여유", variant: "green", pct: Math.round(r*100) };
        if (r >= 0.2) return { label: "보통", variant: "amber", pct: Math.round(r*100) };
        return { label: "혼잡", variant: "red", pct: Math.round(r*100) };
    };

    // 주행모드 on/off
    const handleSafeDriveClick = () => {
        setGO(prev => !prev);
    };

    // 지도 줌/이동 제한
    useEffect(() => {
        if (!map) return;
        if (go) {
            map.setLevel(1);
            map.setZoomable(false);
        } else {
            map.setLevel(3);
            map.setZoomable(true);
        }
    }, [go, map]);

    // 키보드 이동
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (!map) return;
            const currentCenter = map.getCenter();
            const lat = currentCenter.getLat();
            const lng = currentCenter.getLng();
            const moveDistance = 0.0001;

            switch (event.key) {
                case "w": map.panTo(new window.kakao.maps.LatLng(lat + moveDistance, lng)); break;
                case "a": map.panTo(new window.kakao.maps.LatLng(lat, lng - moveDistance)); break;
                case "s": map.panTo(new window.kakao.maps.LatLng(lat - moveDistance, lng)); break;
                case "d": map.panTo(new window.kakao.maps.LatLng(lat, lng + moveDistance)); break;
                default: break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [map]);

    // 가까운 주차장 5개 계산
    useEffect(() => {
        if (!ParkingList || ParkingList.length === 0) return;

        const parksWithDistance = ParkingList.map((park) => {
            const lat = park.LAT ?? 0;
            const lng = park.LOT ?? 0;
            const distance = calculateDistance(coordinates.lat, coordinates.lng, lat, lng);
            return { ...park, distance };
        });

        const sorted = parksWithDistance
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5); // 상위 5개

        setNearbyParking(sorted);
    }, [ParkingList, coordinates]);

    return (
        <div>
            <div className="section-title">주행 모드</div>
            <div className="card">
                <div className="subtle">현재 목적지</div>
                <div style={{ marginTop: 6, fontWeight: 600 }}>목적지 미설정</div>
            </div>
            <button className="primary-btn-center" onClick={handleSafeDriveClick}>
                {go ? "안심 주행 종료" : "안심 주행"}
            </button>

            <div className="nearby-parking" style={{ marginTop: 12 }}>
                {go && nearbyParking.length > 0
                    ? nearbyParking.map((park, index) => {
                        const status = getStatus(park);
                        const distanceStr =
                            park.distance < 1
                            ? `${Math.round(park.distance * 1000)} m`
                            : `${park.distance.toFixed(2)} km`;
                        const chargeClass = (park.CHDG_FREE_NM || park.CHGD_FREE_NM) === "무료" ? "green" : "blue";
                        const pctText = status.pct ? `${status.pct}%` : "—";

                        return (
                            <article key={index} className="ep-drive-card">
                            <header className="ep-drive-top">
                                <h4 className="ep-drive-title">{park.PKLT_NM ?? "이름없는 주차장"}</h4>
                                <button
                                className="ep-drive-route-btn"
                                onClick={() => {
                                    const url = `https://map.kakao.com/link/to/${encodeURIComponent(
                                    park.PKLT_NM
                                    )},${park.LAT},${park.LOT}`;
                                    window.open(url, "_blank");
                                }}
                                >
                                길찾기
                                </button>
                            </header>

                            <div className="ep-drive-badges">
                                <span className="badge blue">{distanceStr}</span>
                                <span className={`badge ${chargeClass}`}>{park.CHGD_FREE_NM ?? "-"}</span>
                                <span className={`badge ${status.variant}`}>{status.label}</span>
                                {park.PKLT_KND_NM && <span className="badge outline">{park.PKLT_KND_NM}</span>}
                            </div>

                            <div className="ep-drive-stats">
                                <div className="ep-stat"><span>총자리</span><b>{park.TPKCT ?? "-"}</b></div>
                                <div className="ep-stat"><span>현재</span><b>{park.liveCnt ?? "-"}</b></div>
                                <div className="ep-stat"><span>남음</span><b>{park.remainCnt ?? "-"}</b></div>
                            </div>

                            <div className={`ep-meter ${status.variant}`}>
                                <div className="fill" style={{ width: `${status.pct}%` }} />
                                <div className="cap">{pctText}</div>
                            </div>

                            <div className="ep-drive-meta">
                                <span>운영시간</span>
                                <div>{fmtHM(park.WD_OPER_BGNG_TM)} - {fmtHM(park.WD_OPER_END_TM)}</div>

                                <span>연락처</span>
                                <div>{park.TELNO ?? "-"}</div>

                                {park.ADDR && (<><span>주소</span><div>{park.ADDR}</div></>)}
                            </div>
                            </article>
                        );
                        })
                    : go ? <div>주차장 탐색중...</div> : null}
            </div>
        </div>
    );
}
