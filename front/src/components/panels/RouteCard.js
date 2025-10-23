// RouteCard.js
import React from "react";

export default function RouteCard({
                                      map,
                                      coordinates,
                                      mode,
                                      routeInfo,
                                      parkingList,
                                      reserveMode,
                                      setReserveMode,
                                      selectedTicket,
                                      setSelectedTicket,
                                      agree,
                                      setAgree,
                                      startTime,
                                      setStartTime,
                                      endTime,
                                      user,
                                      onEditRoute,
                                      onReserve,
                                      setGO,
                                      setMode,
                                      setRouteInfo,
                                      TICKETS,
                                      HOURS_24,
                                      pad2,
                                      calcTicketPrice
                                  }) {
    if (mode !== "destination" || !routeInfo?.destination) return null;

    const getStatus = (park) => {
        const total = Number(park.TPKCT) || 0;
        const remain = park.remainCnt;
        if (remain == null || total === 0) return { label: "정보 없음", variant: "gray", pct: 0 };
        const r = remain / total;
        if (r >= 0.5) return { label: "여유", variant: "green", pct: Math.round(r*100) };
        if (r >= 0.2) return { label: "보통", variant: "amber", pct: Math.round(r*100) };
        return { label: "혼잡", variant: "red", pct: Math.round(r*100) };
    };
    const park = parkingList.find(p => p.PKLT_NM === routeInfo.destination) || {};
    const distanceStr = routeInfo.distance ?? routeInfo.distanceKm ?? "-";
    const timeMin = routeInfo.time ?? routeInfo.timeMin ?? "-";
    const eta = (() => {
        const m = Number(timeMin);
        if (!m || Number.isNaN(m)) return "-";
        const d = new Date(Date.now() + m * 60000);
        return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    })();
    const expectedRemain = park?.remainCnt ?? "-";
    const chargeClass = park?.CHGD_FREE_NM ? "blue" : "gray";
    const status = getStatus(park); // 필요시 계산

    const fmtHM = s => s && s.length === 4 ? `${s.slice(0,2)}:${s.slice(2)}` : s || "-";
    //발표때 한번만
    const totalSpots = 1317;
    const parkedCars = 1280;
    const remaining = totalSpots - parkedCars;
    const fillPct = Math.round((remaining / totalSpots) * 100);

    // [REPLACE] 도착시 표기값: 하드코딩값만 사용
    const arrivalTotal  = totalSpots;
    const arrivalParked = parkedCars;
    const arrivalRemain = remaining;
    const arrivalPct    = Math.round((arrivalRemain / arrivalTotal) * 100);
    const arrivalLabel  = arrivalPct >= 50 ? "여유" : arrivalPct >= 20 ? "보통" : "혼잡";

    return (
        <div className="route-card mt-12">
            <div className="route-title-row">
                <div className="route-title">{routeInfo.destination}</div>
                <button className="btn-edit" onClick={onEditRoute} aria-label="경로 수정">
                    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                    </svg>
                </button>
            </div>

            <div className="ep-drive-badges">
                <span className={`badge ${chargeClass}`}>{park.CHGD_FREE_NM ?? "-"}</span>
                <span className={`badge ${status.variant}`}>{status.label}</span>
                {park.PKLT_KND_NM && <span className="badge outline">{park.PKLT_KND_NM}</span>}
            </div>

            {reserveMode ? (
                <>
                    <div className="ep-drive-stats">
                        <div className="ep-stat"><span>거리</span><b>{distanceStr} km</b></div>
                        <div className="ep-stat"><span>도착시간</span><b>{eta}</b></div>
                        <div className="ep-stat"><span>현재 여석</span><b>{expectedRemain}</b></div>
                    </div>
                    <hr/>

                    {/* 권종 선택 */}
                    <div className="section-title" style={{marginTop:8}}>권종 선택</div>
                    <div className="ticket-grid">
                        {TICKETS.map(t => {
                            const price = calcTicketPrice(park, t.minutes, t.key);
                            const active = selectedTicket?.key === t.key;
                            return (
                                <button
                                    key={t.key}
                                    className={`ticket ${active ? "active" : ""}`}
                                    onClick={() => setSelectedTicket({ ...t, price })}
                                >
                                    <div className="ticket-label">{t.label}</div>
                                    <div className="ticket-price">
                                        {price == null ? "무료" : `${price.toLocaleString()}원`}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* 요약/동의 */}
                    <div className="reserve-summary">
                        {/* 시작 */}
                        <div className="summary-item start">
                            <span>시작</span>
                            <select className="time-select" value={startTime || ""} onChange={e=>setStartTime(e.target.value)}>
                                <option value="" disabled>시간 선택</option>
                                {HOURS_24.map(h => {
                                    const v = `${pad2(h)}:00`;
                                    return <option key={v} value={v}>{v}</option>;
                                })}
                            </select>
                        </div>

                        {/* 선택 권종 */}
                        <div className="summary-item">
                            <span>시간</span>
                            <b>{selectedTicket ? selectedTicket.label : "-"}</b>
                        </div>

                        {/* 종료(자동 계산) */}
                        <div className="summary-item">
                            <span>종료시간</span>
                            <b>{endTime}</b>
                        </div>

                        {/* 결제금액 */}
                        <div className="summary-item">
                            <span>결제금액</span>
                            <b>{selectedTicket?.price == null ? "-" : `${selectedTicket.price.toLocaleString()}원`}</b>
                        </div>
                    </div>

                    <label className="agree-row">
                        <input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)} />
                        <span>이용 안내 및 환불정책에 동의합니다</span>
                    </label>

                    <div className="route-actions">
                        <button
                            className="btn btn-start"
                            disabled={!selectedTicket || !agree}
                            onClick={async () => {
                                try {
                                    await fetch("/api/reservations/create", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            parkCode: park.PKLT_CD,
                                            parkName: routeInfo.destination,
                                            minutes: selectedTicket.minutes,
                                            price: selectedTicket.price ?? null,
                                            eta,
                                            startTime,
                                            endTime,
                                            userId: user?.id,
                                            ticket: selectedTicket.key,
                                        }),
                                    });
                                    alert("예약이 완료되었습니다.");

                                    // 개발 모드(?devLogin)일 때는 로컬에도 저장해 '예약 내역'에서 보이게 함
                                    const mock = {
                                        id: Date.now(),
                                        parkName: routeInfo.destination,
                                        minutes: selectedTicket.minutes,
                                        price: selectedTicket.price ?? null,
                                        eta,
                                        startTime,
                                        endTime,
                                        createdAt: new Date().toISOString(),
                                        ticket: selectedTicket.key,
                                    };
                                    const stash = JSON.parse(localStorage.getItem("mockReservations") || "[]");
                                    stash.unshift(mock);
                                    localStorage.setItem("mockReservations", JSON.stringify(stash));

                                    setReserveMode(false);
                                    setSelectedTicket(null);
                                    setAgree(false);
                                    setStartTime("");
                                } catch (e) {
                                    console.error(e);
                                    alert("예약 처리에 실패했습니다.");

                                    // 서버 실패해도 ?devLogin 모드면 로컬 저장
                                    if (new URLSearchParams(window.location.search).has("devLogin")) {
                                        const mock = {
                                            id: Date.now(),
                                            parkName: routeInfo.destination,
                                            minutes: selectedTicket.minutes,
                                            price: selectedTicket.price ?? null,
                                            eta,
                                            startTime,
                                            endTime,
                                            createdAt: new Date().toISOString(),
                                            ticket: selectedTicket.key,
                                        };
                                        const stash = JSON.parse(localStorage.getItem("mockReservations") || "[]");
                                        stash.unshift(mock);
                                        localStorage.setItem("mockReservations", JSON.stringify(stash));
                                    }
                                }
                            }}
                        >
                            예약 확정
                        </button>
                        <button
                            className="btn btn-close"
                            onClick={() => { setReserveMode(false); setSelectedTicket(null); setAgree(false); }}
                        >
                            취소
                        </button>
                    </div>
                </>
            ) : (

                <>
                    <div className="ep-drive-stats">
                        <div className="ep-stat"><span>거리</span><b>{distanceStr} km</b></div>
                        <div className="ep-stat"><span>소요시간</span><b>{timeMin} 분</b></div>
                        <div className="ep-stat"><span>도착시간</span><b>{eta}</b></div>
                    </div>
                    <hr/>

                    {/* === [REPLACE-BEGIN] 도착시 블록 === */}
                    <div className="stat-stack">
                        {/* 헤더 */}
                        <div className="arrival-head" style={{fontSize:"20px"}}>
                            <span className="loading-mini" aria-hidden="true"></span>
                            <span>도착시</span>
                            <b style={{ marginLeft: 6 }}>{eta}</b>
                        </div>

                        {/* 3개 카드: 정가운데 정렬 */}
                        <div className="stats-row arrival-row">
                            <div className="ep-stat2"><span>총자리</span><b>{arrivalTotal}</b></div>
                            <div className="ep-stat2"><span>주차된 차량</span><b>{arrivalParked}</b></div>
                            <div className="ep-stat2"><span>도착시 여석</span><b>{arrivalRemain}</b></div>
                        </div>

                        {/* 도착시 혼잡도 게이지 (항상 노출) */}
                        <div className={`ep-meter arrival ${status.variant}`}>
                            <div className="fill" style={{ width: `${arrivalPct}%` }} />
                            <div className="cap">{arrivalLabel}</div>
                        </div>
                    </div>

                    {/* [2] 현재 블록 */}
                    <div className="stats-row">
                        <div className="ep-stat">
                            <b>
                          <span style={{ fontSize: "14px", color: "black" }}>
                            <div>현재</div>
                            <div>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</div>
                          </span>
                            </b>
                        </div>
                        <div className="ep-stat"><span>총자리</span><b>{park.TPKCT ?? "-"}</b></div>
                        <div className="ep-stat"><span>주차된 차량</span><b>{park.liveCnt ?? "-"}</b></div>
                        <div className="ep-stat"><span>현재 여석</span><b>{expectedRemain}</b></div>
                    </div>
                    {/* === [REPLACE-END] === */}

                    {/* 혼잡도 게이지는 그대로 유지 (현재 상태용) */}
                    <div className={`ep-meter ${status.variant}`}>
                        <div className="fill" style={{ width: `${status.pct}%` }} />
                        <div className="cap">{status.label}</div>
                    </div>

                    <div className="route-actions">
                        <button className="btn btn-reserve" onClick={onReserve}>예약하기</button>
                        <button className="btn btn-start" onClick={()=>{ setGO(true); setMode("drive");
                            const position = new window.kakao.maps.LatLng(coordinates.lat,coordinates.lng);
                            map.setCenter(position); }}>안내 시작</button>
                        <button className="btn btn-close" onClick={()=>{
                            setRouteInfo({});
                            setGO(false);
                            if (window.currentRouteLine){
                                window.currentRouteLine.setMap(null);
                                window.currentRouteLine = null;
                            }
                            window.__routeLocked = false; // 잠금 해제
                            }}>닫기</button>
                    </div>
                </>
            )}
        </div>
    );
}
