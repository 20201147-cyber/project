// src/components/panels/FavoritesPanel.js
import React, { useContext, useEffect, useState } from "react";
import "../../css/FavoritesPanel.css";
import { ParkingContext } from "../../context/ParkingContext";

const calculateDistance = (lat1, lng1, lat2, lng2) => {
    return Math.sqrt((lat1 - lat2) ** 2 + (lng1 - lng2) ** 2);
};

export default function FavoritesPanel({ map, ParkingList, onRerouteClick, doRoute, routeInfo, setRouteInfo, mode, setMode }) {
    const [loading, setLoading] = useState(true);
    const [me, setMe] = useState(null);
    const [list, setList] = useState([]);
    const [cancellingId, setCancellingId] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const { visibleOnly, nearbyList, setNearbyList, nearbyOverlays, setNearbyOverlays } = useContext(ParkingContext);
    const [recommendSort, setRecommendSort] = useState("distance"); // distance | price | remain

    const formatTime = (date) => {
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const seconds = date.getSeconds().toString().padStart(2, "0");
        return `${hours}:${minutes}:${seconds}`;
    };

    const getRemainingTime = (dateStr, startTimeStr) => {
        if (!dateStr || !startTimeStr) return "-";
        const [hours, minutes] = startTimeStr.split(":").map(Number);
        if (isNaN(hours) || isNaN(minutes)) return "-";
        const [year, month, day] = dateStr.split("-").map(Number); // "yyyy-MM-dd" 형식 가정
        const start = new Date(year, month - 1, day, hours, minutes);
        const diffMs = start - currentTime;
        const diffSec = Math.floor(diffMs / 1000);

        if (diffSec <= 0) return "완료된 예약";

        let remaining = diffSec;
        const days = Math.floor(remaining / 86400); // 24*60*60
        remaining %= 86400;
        const h = Math.floor(remaining / 3600);
        remaining %= 3600;
        const m = Math.floor(remaining / 60);
        //const s = remaining % 60;

        let result = "";
        if (days > 0) result += `${days}일 `;
        if (h > 0 || days > 0) result += `${h}시간 `;
        if (m > 0 || h > 0 || days > 0) result += `${m}분 `;
        result += ` 남음`;

        return result;
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    //카테고리 변경시 추천 오버레이 재생성
    useEffect(() => {
        if (!nearbyList || !map) return;

        const mainPark = nearbyList.find(p => p.isReserved); // 예약한 주차장
        const recommended = nearbyList.filter(p => !p.isReserved).slice(); // 추천 주차장만 복사

        // 추천 주차장 정렬
        recommended.sort((a, b) => {
            if (recommendSort === "distance") return a.distance - b.distance;
            if (recommendSort === "price") return (a.ADD_CRG ?? 0) - (b.ADD_CRG ?? 0);
            if (recommendSort === "remain") return (b.remainCnt ?? 0) - (a.remainCnt ?? 0);
            return 0;
        });

        // 기존 추천 오버레이 제거 (예약 주차장은 제외)
        nearbyOverlays
            .filter(ov => !ov.isMain)
            .forEach(ov => ov.setMap(null));

        const overlays = nearbyOverlays.filter(ov => ov.isMain) || []; // 기존 예약 오버레이 유지

        // 추천 주차장 오버레이 생성
        recommended.forEach((p, idx) => {
            const pos = new window.kakao.maps.LatLng(parseFloat(p.LAT), parseFloat(p.LOT));
            const overlay = new window.kakao.maps.CustomOverlay({
                position: pos,
                content: `<div class="recommend-overlay">추천 ${idx + 1}</div>`,
                yAnchor: 3,
                zIndex: 1
            });
            overlay.setMap(map);
            overlays.push(overlay);
        });

        // 예약 주차장이 없고 overlays에 없는 경우 새로 생성
        if (mainPark && !overlays.some(ov => ov.isMain)) {
            const pos = new window.kakao.maps.LatLng(parseFloat(mainPark.LAT), parseFloat(mainPark.LOT));
            const myOverlay = new window.kakao.maps.CustomOverlay({
                position: pos,
                content: `<div class="recommend-overlay main-overlay">예약한 주차장</div>`,
                yAnchor: 3,
                zIndex: 1
            });
            myOverlay.setMap(map);
            myOverlay.isMain = true; // 예약 주차장 표시용 플래그
            overlays.push(myOverlay);
        }

        // 상태 갱신
        setNearbyOverlays(overlays);
        setNearbyList(mainPark ? [mainPark, ...recommended] : recommended);
    }, [recommendSort]);


    useEffect(() => {
        let abort = false;
        (async () => {
            try {
                const res = await fetch("/api/auth/me", { credentials: "include" });
                const data = res.ok ? await res.json() : null;
                if (!abort) setMe(data || null);
            } catch {
                if (!abort) setMe(null);
            } finally {
                if (!abort) setLoading(false);
            }
        })();
        return () => { abort = true; };
    }, []);

    useEffect(() => {
        if (!me?.id) return;
        let abort = false;
        setLoading(true);
        (async () => {
            try {
                const res = await fetch("/api/reservations", {
                    credentials: "include",
                    headers: { Accept: "application/json" },
                });
                const data = res.ok ? await res.json() : [];
                if (!abort) {
                    const arr = Array.isArray(data) ? data : [];
                    const myReservations = arr.filter(r => String(r.userId ?? r.USER_ID) === String(me.id));
                    setList(myReservations);
                }
            } catch {
                if (!abort) setList([]);

            } finally {
                if (!abort) setLoading(false);
            }
        })();
        return () => { abort = true; };
    }, [me?.id]);

    const handleCancel = async (r) => {
        if (!r?.id) {
            alert("이 예약은 식별자가 없어 취소할 수 없습니다.");
            return;
        }
        if (!window.confirm("이 예약을 취소할까요?")) return;

        setCancellingId(r.id);

        try {
            let res = await fetch(`/api/reservations/${encodeURIComponent(r.id)}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!res.ok) {
                res = await fetch(`/api/reservations/cancel`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: r.id }),
                });
            }

            if (!res.ok) {
                const msg = await res.text().catch(() => "");
                throw new Error(msg || "취소 요청 실패");
            }

            setList((prev) => prev.filter((x) => x.id !== r.id));
        } catch (e) {
            console.error(e);
            alert("예약 취소에 실패했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setCancellingId(null);
        }
    };

    const handleRecommendNearby = (r) => {
        if (!ParkingList || ParkingList.length === 0 || !map) return;

        nearbyOverlays.forEach((ov) => ov.setMap(null));
        setNearbyOverlays([]);

        const parkInfo = ParkingList.find(p => String(p.PKLT_NM) === String(r.parkName));
        if (!parkInfo) return;

        const lat = parseFloat(parkInfo.LAT);
        const lng = parseFloat(parkInfo.LOT);

        map.setCenter(new window.kakao.maps.LatLng(lat, lng));

        const nearby = ParkingList
            .filter(p => String(p.PKLT_NM) !== String(r.parkName))
            .map(p => {
                const total = p.TPKCT ?? p.totalCnt ?? 0;
                const remain = p.remainCnt ?? 0;
                const ratio = total > 0 ? remain / total : 0;
                return {
                    ...p,
                    distance: calculateDistance(lat, lng, parseFloat(p.LAT), parseFloat(p.LOT)),
                    remainRatio: ratio
                };
            })
            .filter(p => p.remainRatio >= 0.2)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5);

        if (nearby.length === 0) {
            alert("여석이 충분한 주변 주차장이 없습니다.");
            return;
        }

        const overlays = [];

        const myPos = new window.kakao.maps.LatLng(lat, lng);
        const myOverlayContent = `<div class="recommend-overlay main-overlay">예약한 주차장</div>`;
        const myOverlay = new window.kakao.maps.CustomOverlay({
            position: myPos,
            content: myOverlayContent,
            yAnchor: 3,
            zIndex: 1
        });
        myOverlay.isMain = true;
        myOverlay.setMap(map);
        overlays.push(myOverlay);

        nearby.forEach((p, idx) => {
            const position = new window.kakao.maps.LatLng(parseFloat(p.LAT), parseFloat(p.LOT));
            const content = `<div class="recommend-overlay">추천 ${idx + 1}</div>`;
            const overlay = new window.kakao.maps.CustomOverlay({
                position,
                content,
                yAnchor: 3,
                zIndex: 1,
            });
            overlay.setMap(map);
            overlays.push(overlay);
        });

        setNearbyOverlays(overlays);
        setNearbyList(nearby);
    };

    const handleCloseNearby = () => {
        setNearbyOverlays(prev => {
            prev.forEach((ov) => ov.setMap(null));
            return [];
        });
        setNearbyList(null);
    };

    if (loading) {
        return (
            <div>
                <div className="section-title">예약</div>
                <div className="tip-box">불러오는 중…</div>
            </div>
        );
    }

    if (!me?.username) {
        return (
            <div>
                <div className="section-title">예약</div>
                <div className="tip-box" style={{ textAlign: "center" }}>
                    예약 내역을 보려면 로그인이 필요합니다.
                    <div style={{ marginTop: 10 }}>
                        <button
                            className="primary-btn-center"
                            onClick={() => { window.location.href = "/login"; }}
                        >
                            로그인 하러 가기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!list.length) {
        return (
            <div>
                <div className="section-title">예약</div>
                <div className="tip-box">
                    아직 예약된 내역이 없습니다. 경로 카드에서 예약을 진행해 보세요.
                </div>
            </div>
        );
    }

    return (
        <div>
            {nearbyList ? (
                <div className="nearby-list">
                    <div style={{  alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                            <input
                                type="radio"
                                id="distance"
                                name="recommendSort"
                                value="distance"
                                checked={recommendSort === "distance"}
                                onChange={(e) => setRecommendSort(e.target.value)}
                                className="radio-btn"
                            />
                            <label htmlFor="distance" className="radio-label">거리순</label>

                            <input
                                type="radio"
                                id="price"
                                name="recommendSort"
                                value="price"
                                checked={recommendSort === "price"}
                                onChange={(e) => setRecommendSort(e.target.value)}
                                className="radio-btn"
                            />
                            <label htmlFor="price" className="radio-label">가격순</label>

                            <input
                                type="radio"
                                id="remain"
                                name="recommendSort"
                                value="remain"
                                checked={recommendSort === "remain"}
                                onChange={(e) => setRecommendSort(e.target.value)}
                                className="radio-btn"
                            />
                            <label htmlFor="remain" className="radio-label">여석순</label>
                            <button className="btn-recommend-close" onClick={handleCloseNearby}>
                                종료
                            </button>
                        </div>
                    </div>
                    {nearbyList
                        .slice()
                        .sort((a, b) => {
                            if (recommendSort === "distance") return a.distance - b.distance;
                            if (recommendSort === "price") return (a.ADD_CRG ?? 0) - (b.ADD_CRG ?? 0);
                            if (recommendSort === "remain") return (b.remainCnt ?? 0) - (a.remainCnt ?? 0); // 내림차순
                            return 0;
                        })
                        .map((p, idx) => {
                            const total = p.TPKCT ?? p.totalCnt ?? 0; // total 다시 계산
                            const remain = p.remainCnt ?? 0;          // remain 다시 계산
                            const ratio = total > 0 ? (remain / total) * 100 : 0;

                            return (
                                <article key={p.PKLT_NM} className={`nearby-card ${p.isReserved ? "reserved-card" : ""}`}>

                                        <div className="recommend-rank" style={{ fontSize: 20, color: "black", fontWeight: "bold" }}>추천 주차장{idx + 1}</div>
                                        <hr style={{ color: "black" }} />
                                        <div className="nearby-head">
                                            <div className="nearby-title">{p.PKLT_NM}</div>
                                            {p.isReserved && <span className="reserved-badge">예약한 곳</span>}
                                        </div>

                                        <div className="nearby-grid">
                                            <div className="nearby-cell">유형: {p.PKLT_KND_NM
                                            }</div>
                                            <div className="nearby-cell">가격(5분당): {(p.ADD_CRG==0)?("무료"):(`${p.ADD_CRG}`)
                                            }</div>
                                            <div className="nearby-cell">총 좌석: {total}</div>
                                            <div className="nearby-cell" style={{fontWeight:"bold"}}>남은 좌석: {remain}</div>
                                        </div>

                                        <div className="progress-container">
                                            <div className="progress-bar"
                                                 style={{
                                                     width: `${ratio}%`,
                                                     backgroundColor: ratio >= 50 ? "#4CAF50" : ratio >= 20 ? "#FFC107" : "#F44336",
                                                 }}
                                            />
                                        </div>

                                        <button className="ep-overlay__btn" onClick={() => {
                                            if (!map) return;
                                            const lat = parseFloat(p.LAT);
                                            const lng = parseFloat(p.LOT);
                                            const pos = new window.kakao.maps.LatLng(lat, lng);
                                            map.setCenter(pos);
                                            map.setLevel(3);
                                            new window.kakao.maps.Marker({ position: pos });
                                        }}>
                                            위치보기
                                        </button>
                                </article>
                            );
                        })}
                </div>
            ) : (
                <>
                <p style={{ fontSize: "30px", color: "black", paddingLeft: "8px", textShadow: "1px 2px 5px rgba(0,0,0,0.5)" }}>
                    {formatTime(currentTime)}
                </p>
                <div className="res-list">
                    {list.map((r) => {
                        const remainCnt = visibleOnly.length > 0
                            ? visibleOnly.find(v => String(v.PKLT_NM) === String(r.parkName))?.remainCnt ?? 0
                            : 0;

                        const totalCnt = visibleOnly.length > 0
                            ? visibleOnly.find(v => String(v.PKLT_NM) === String(r.parkName))?.totalCnt ?? 100
                            : 100;

                        const remainRatio = totalCnt > 0 ? remainCnt / totalCnt : 1;

                        return (
                            <article key={r.id ?? `${r.parkName}-${r.createdAt ?? Math.random()}`} className="res-card">
                                <div className="res-head">
                                    <div className="res-title" title={r.parkName}>{r.parkName}</div>
                                    <span className={`res-badge ${r.ticket === "DAY" ? "day" : "hour"}`} style={{ textAlign: "center" ,width:"100px"}}>
                                        {r.ticket === "DAY"
                                            ? "당일권"
                                            : (() => {
                                                if (!r.date) return "-";
                                                const [year, month, day] = r.date.split("-").map(Number);
                                                return `${month}월${day}일`;
                                            })()
                                        }
                                    </span>
                                </div>

                                <div className="res-grid">
                                    <div className="res-cell full-width">
                                        <div className="res-label" style={{ fontSize: "15px", color: "black" }}>예약까지</div>
                                        <div className="res-value">
                                            {getRemainingTime(r.date, r.startTime ?? r.START_TIME ?? r.start_time)}
                                        </div>
                                    </div>
                                    <div className="res-cell">
                                        <div className="res-label">시작시간</div>
                                        <div className="res-value">{r.startTime ?? "-"}</div>
                                    </div>
                                    <div className="res-cell">
                                        <div className="res-label">시간</div>
                                        <div className="res-value">{r.minutes ? `${Math.round(r.minutes / 60)}시간` : "-"}</div>
                                    </div>
                                    <div className="res-cell">
                                        <div className="res-label">결제금액</div>
                                        <div className="res-value res-amount">{r.price != null ? `${Number(r.price).toLocaleString()}원` : "-"}</div>
                                    </div>
                                    <div className="res-cell">
                                        <div className="res-label">여석</div>
                                        <div className="res-value">{remainCnt}</div>
                                    </div>

                                    {remainRatio < 0.2 && (
                                        <button className="ep-overlay__btn" onClick={() => handleRecommendNearby(r)} style={{ fontSize: 12 }}>
                                            주차장 추천
                                        </button>
                                    )}

                                    <button className="ep-overlay__btn" onClick={() => handleCancel(r)} disabled={cancellingId === r.id} aria-busy={cancellingId === r.id} style={{ backgroundColor: "red", border: "none" }}>
                                        {cancellingId === r.id
                                            ? "취소 중…"
                                            : getRemainingTime(r.date, r.startTime ?? r.START_TIME ?? r.start_time) === "완료된 예약"
                                                ? "기록 삭제"
                                                : "예약 취소"
                                        }
                                    </button>
                                </div>
                                <div className="res-meta-row">
                                    {r.createdAt ? (
                                        <div className="res-meta">
                                            예약일시&nbsp;
                                            <time>{new Date(r.createdAt).toLocaleString()}</time>
                                        </div>
                                    ) : <span />}
                                </div>
                            </article>
                        );
                    })}
                </div>
                </>
            )}
        </div>

    );
}
