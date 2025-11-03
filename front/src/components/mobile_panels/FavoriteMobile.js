// src/components/panels/FavoritesPanel.js
import React, { useContext, useEffect, useState } from "react";
import "../../css/FavoritesPanel.css";
import { ParkingContext } from "../../context/ParkingContext";

const calculateDistance = (lat1, lng1, lat2, lng2) => {
    return Math.sqrt((lat1 - lat2) ** 2 + (lng1 - lng2) ** 2);
};

export default function FavoritesPanel({ map, ParkingList, onRerouteClick, doRoute, routeInfo, setRouteInfo,mode,setMode }) {
    const [loading, setLoading] = useState(true);
    const [me, setMe] = useState(null);
    const [list, setList] = useState([]);
    // 주변 주차장 리스트
    const [cancellingId, setCancellingId] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const { visibleOnly,nearbyList,setNearbyList,nearbyOverlays,setNearbyOverlays} = useContext(ParkingContext);

    const formatTime = (date) => {
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const seconds = date.getSeconds().toString().padStart(2, "0");
        return `${hours}:${minutes}:${seconds}`;
    };
    const getRemainingTime = (startTimeStr) => {
        if (!startTimeStr) return "-";
        const today = new Date();
        const [hours, minutes] = startTimeStr.split(":").map(Number);
        if (isNaN(hours) || isNaN(minutes)) return "-";
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
        const diffMs = start - currentTime;
        const diffSec = Math.floor(diffMs / 1000);

        if (diffSec <= 0) return "완료된 예약";

        const h = Math.floor(diffSec / 3600);
        const m = Math.floor((diffSec % 3600) / 60);
        const s = diffSec % 60;

        if (h > 0) return `${h}시간 ${m}분 ${s}초 남음`;
        if (m > 0) return `${m}분 ${s}초 남음`;
        return `${s}초 남음`;
    };
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

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

        // ✅ 기존 오버레이만 제거 (마커는 그대로 유지)
        nearbyOverlays.forEach((ov) => ov.setMap(null));
        setNearbyOverlays([]);

        const parkInfo = ParkingList.find(p => String(p.PKLT_NM) === String(r.parkName));
        if (!parkInfo) return;

        const lat = parseFloat(parkInfo.LAT);
        const lng = parseFloat(parkInfo.LOT);

        // 지도 중심 이동
        map.setCenter(new window.kakao.maps.LatLng(lat, lng));

        // ✅ 여석이 20% 이상인 주차장 중 가까운 순 5개
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
            .filter(p => p.remainRatio >= 0.2) // ✅ 남은 비율 20% 이상만
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5);

        if (nearby.length === 0) {
            alert("여석이 충분한 주변 주차장이 없습니다.");
            return;
        }

        const overlays = [];

        // 예약 주차장 오버레이
        const myPos = new window.kakao.maps.LatLng(lat, lng);
        const myOverlayContent = `
        <div class="recommend-overlay main-overlay">
            예약한 주차장
        </div>
    `;
        const myOverlay = new window.kakao.maps.CustomOverlay({
            position: myPos,
            content: myOverlayContent,
            yAnchor: 4,
            zIndex: 1
        });
        myOverlay.setMap(map);
        overlays.push(myOverlay);

        // ✅ 여석이 충분한 추천 주차장 오버레이만 추가
        nearby.forEach((p, idx) => {
            const position = new window.kakao.maps.LatLng(parseFloat(p.LAT), parseFloat(p.LOT));
            const content = `
            <div class="recommend-overlay" >
                추천 ${idx + 1}
            </div>
        `;
            const overlay = new window.kakao.maps.CustomOverlay({
                position,
                content,
                yAnchor: 4,
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
                <div className="section-title" style={{fontSize:30}}>예약</div>
                <div className="tip-box" style={{ textAlign: "center",fontSize:30 }}>
                    예약 내역을 보려면 로그인이 필요합니다.
                    <div style={{ marginTop: 10 }}>
                        <button
                            className="primary-btn-center"
                            onClick={() => { window.location.href = "/login"; }}
                            style={{fontSize:30}}
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
            <p style={{ fontSize: "50px", color: "black", paddingLeft: "8px", textShadow: "1px 2px 5px rgba(0,0,0,0.5)" }}>
                {formatTime(currentTime)}
            </p>

            {nearbyList ? (
                <div className="nearby-list">
                    <button className="ep-overlay__btn" onClick={handleCloseNearby} style={{fontSize:30}}>추천 종료</button>
                    {nearbyList.map((p,idx) => {
                        const total = p.TPKCT ?? 0;
                        const remain = p.remainCnt ?? 0;
                        const ratio = total > 0 ? (remain / total) * 100 : 0;

                        return (
                            <article
                                key={p.PKLT_NM}
                                className={`nearby-card ${p.isReserved ? "reserved-card" : ""}`}
                            >
                                <div className="recommend-rank" style={{fontSize:40,color:"black",fontWeight:"bold"}}>추천 주차장{idx + 1}</div>
                                <hr style={{color:"black"}}></hr>
                                <div className="nearby-head">

                                    <div className="nearby-title" style={{fontSize:30}}>{p.PKLT_NM}</div>
                                    {p.isReserved && <span className="reserved-badge" style={{fontSize:30}}>예약한 곳</span>}
                                </div>

                                <div className="nearby-grid">
                                    <div className="nearby-cell" style={{fontSize:30}}>총 좌석: {total}</div>
                                    <div className="nearby-cell" style={{fontSize:30}}>남은 좌석: {remain}</div>
                                </div>

                                {/* ✅ 여석 비율 바 */}
                                <div className="progress-container">
                                    <div
                                        className="progress-bar"
                                        style={{
                                            width: `${ratio}%`,
                                            backgroundColor:
                                                ratio >= 50 ? "#4CAF50" : ratio >= 20 ? "#FFC107" : "#F44336",
                                        }}
                                    />

                                </div>

                                <button
                                    className="ep-overlay__btn"
                                    onClick={() => {
                                        if (!map) return;
                                        const lat = parseFloat(p.LAT);
                                        const lng = parseFloat(p.LOT);
                                        const pos = new window.kakao.maps.LatLng(lat, lng);
                                        map.setCenter(pos);
                                        map.setLevel(3);

                                        const marker = new window.kakao.maps.Marker({ position: pos });

                                    }}
                                    style={{fontSize:30}}

                                >
                                    위치보기
                                </button>
                            </article>
                        );
                    })}
                </div>
            ) : (
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
                            <article
                                key={r.id ?? `${r.parkName}-${r.createdAt ?? Math.random()}`}
                                className="res-card"
                            >
                                <div className="res-head">
                                    <div className="res-title" style={{fontSize:30}} title={r.parkName}>{r.parkName}</div>
                                    <span className={`res-badge ${r.ticket === "DAY" ? "day" : "hour"}`} style={{textAlign:"center",fontSize:15}}>
                                        {r.ticket === "DAY"
                                            ? "당일권"
                                            : `${Math.round((r.minutes || 0) / 60)}시간권`}
                                    </span>
                                </div>

                                <div className="res-grid">
                                    <div className="res-cell full-width">
                                        <div className="res-label" style={{ fontSize: "30px", color: "black" }}>예약까지</div>
                                        <div className="res-value" style={{fontSize:30}}>
                                            {getRemainingTime(r.startTime ?? r.START_TIME ?? r.start_time)}
                                        </div>
                                    </div>
                                    <div className="res-cell">
                                        <div className="res-label" style={{fontSize:30}}>시작시간</div>
                                        <div className="res-value" style={{fontSize:30}}>{r.startTime ?? "-"}</div>
                                    </div>
                                    <div className="res-cell">
                                        <div className="res-label" style={{fontSize:30}}>시간</div>
                                        <div className="res-value" style={{fontSize:30}}>{r.minutes ? `${Math.round(r.minutes / 60)}시간` : "-"}</div>
                                    </div>
                                    <div className="res-cell">
                                        <div className="res-label" style={{fontSize:30}}>결제금액</div>
                                        <div className="res-value res-amount" style={{fontSize:30}}>{r.price != null ? `${Number(r.price).toLocaleString()}원` : "-"}</div>
                                    </div>
                                    <div className="res-cell">
                                        <div className="res-label" style={{fontSize:30}}>여석</div>
                                        <div className="res-value" style={{fontSize:30}}>{remainCnt}</div>
                                    </div>

                                    {remainRatio < 0.2 && (
                                        <button
                                            className="ep-overlay__btn"
                                            onClick={() => handleRecommendNearby(r)}
                                            style={{fontSize:30}}
                                        >
                                            주차장 추천
                                        </button>
                                    )}

                                    <button
                                        className="ep-overlay__btn"
                                        onClick={() => handleCancel(r)}
                                        disabled={cancellingId === r.id}
                                        aria-busy={cancellingId === r.id}
                                        style={{backgroundColor:"red",border:"none",fontSize:30}}
                                    >
                                        {cancellingId === r.id
                                            ? "취소 중…"
                                            : getRemainingTime(r.startTime ?? r.START_TIME ?? r.start_time) === "완료된 예약"
                                                ? "기록 삭제"
                                                : "예약 취소"
                                        }
                                    </button>
                                </div>

                                <div className="res-meta-row">
                                    {r.createdAt ? (
                                        <div className="res-meta" style={{fontSize:30}}>
                                            예약일시&nbsp;
                                            <time>{new Date(r.createdAt).toLocaleString()}</time>
                                        </div>
                                    ) : (
                                        <span />
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}