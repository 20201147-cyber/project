// FavoritesPanel.js
import React, { useContext, useEffect, useMemo, useState } from "react";
import "../../css/FavoritesPanel.css";
import { ParkingContext } from "../../context/ParkingContext";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const formatKRW = (n) => (n == null ? "-" : `${Number(n).toLocaleString()}원`);
const toHMS = (sec) => {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}시간 ${m}분 ${r}초 남음`;
  if (m > 0) return `${m}분 ${r}초 남음`;
  return `${r}초 남음`;
};
const euclid = (lat1, lng1, lat2, lng2) => Math.hypot(lat1 - lat2, lng1 - lng2);

export default function FavoritesPanel({
  map, ParkingList, onRerouteClick, doRoute, routeInfo, setRouteInfo,
}) {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [nearbyList, setNearbyList] = useState(null);
  const [nearbyOverlays, setNearbyOverlays] = useState([]);
  const [cancellingId, setCancellingId] = useState(null);
  const [now, setNow] = useState(new Date());
  const { visibleOnly } = useContext(ParkingContext);

  /* 시계 */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hhmm = useMemo(() => {
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [now]);

  /* 더미 데이터 */
  useEffect(() => {
    const dummyReservations = [
      { id: 1, parkName: "서울역 주차장",   startTime: "21:30", minutes: 120, price: 3000, ticket: "HOUR", remainCnt: 7 },
      { id: 2, parkName: "강남역 제1주차장", startTime: "22:00", minutes: 60,  price: 2000, ticket: "HOUR", remainCnt: 2 },
    ];
    setList(dummyReservations);
    setLoading(false);
  }, []);

  /* 버튼 폰트 자동 축소(폴백, 컨테이너쿼리 미지원/극단 폭 보호) */
  const fitActionButtons = () => {
    document.querySelectorAll(".res-actions-row > button").forEach((btn) => {
      // CSS 기본값으로 초기화
      btn.style.fontSize = "";
      const min = 10;
      let fs = parseFloat(getComputedStyle(btn).fontSize) || 14;
      // 필요하면 0.5px씩 줄이며 맞추기
      let guard = 0;
      while (btn.scrollWidth > btn.clientWidth && fs > min && guard < 20) {
        fs -= 0.5;
        btn.style.fontSize = fs + "px";
        guard++;
      }
    });
  };
  useEffect(() => {
    fitActionButtons(); // 최초
    const onResize = () => requestAnimationFrame(fitActionButtons);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => { fitActionButtons(); }, [list, now]);

  /* 유틸 */
  const findParkByName = (name) => {
    const src = (visibleOnly?.length ? visibleOnly : ParkingList) || [];
    return src.find((p) => p.PKLT_NM === name) || null;
  };
  const secondsUntil = (startHHMM) => {
    if (!startHHMM) return null;
    const [H, M] = (startHHMM || "").split(":").map(Number);
    if (Number.isNaN(H) || Number.isNaN(M)) return null;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), H, M, 0, 0);
    return Math.floor((start - now) / 1000);
  };
  const getStatus = (sec) => {
    if (sec == null) return { key: "unknown", label: "정보 없음" };
    if (sec <= 0)   return { key: "done", label: "완료" };
    if (sec <= 900) return { key: "soon", label: "임박" };
    return { key: "wait", label: "대기" };
  };

  /* 액션 */
  const handleNavigate = async (r) => {
    const park = findParkByName(r?.parkName);
    if (!map || !park) return alert("경로 안내를 시작할 수 없습니다. (지도/좌표 미확인)");
    setRouteInfo({ destination: park.PKLT_NM, isParking: true });
    try {
      const c = map.getCenter?.();
      if (doRoute && c) await doRoute(c.getLat(), c.getLng(), park.PKLT_NM);
    } catch {}
  };
  const handleCancel = async (r) => {
    if (!r?.id) return alert("이 예약은 식별자가 없어 취소할 수 없습니다.");
    if (!window.confirm("이 예약을 취소할까요?")) return;
    setCancellingId(r.id);
    await new Promise((res) => setTimeout(res, 500));
    setList((prev) => prev.filter((x) => x.id !== r.id));
    setCancellingId(null);
  };
  const handleRecommendNearby = (r) => {
    const main = findParkByName(r?.parkName);
    if (!map || !main) return alert("주변 주차장을 찾을 수 없습니다. (지도/주차장 미확인)");
    nearbyOverlays.forEach((ov) => ov.setMap(null));
    setNearbyOverlays([]);
    const baseLat = parseFloat(main.LAT);
    const baseLng = parseFloat(main.LOT);
    if (Number.isNaN(baseLat) || Number.isNaN(baseLng)) return alert("예약 주차장 좌표가 올바르지 않습니다.");
    const src = (visibleOnly?.length ? visibleOnly : ParkingList) || [];
    const candidates = src
      .filter((p) => p.PKLT_NM !== main.PKLT_NM && p.LAT && p.LOT)
      .map((p) => ({
        name: p.PKLT_NM,
        lat: parseFloat(p.LAT),
        lng: parseFloat(p.LOT),
        remainCnt: p.remainCnt ?? null,
        d: euclid(baseLat, baseLng, parseFloat(p.LAT), parseFloat(p.LOT)),
      }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 5);

    const overlays = [];
    const mainOverlay = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(baseLat, baseLng),
      content: `<div class="recommend-overlay main-overlay" role="note" aria-label="${main.PKLT_NM}">📍 ${main.PKLT_NM}</div>`,
      yAnchor: 2.0,
      zIndex: 9999,
    });
    mainOverlay.setMap(map);
    overlays.push(mainOverlay);

    candidates.forEach((p, idx) => {
      const ov = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(p.lat, p.lng),
        content: `<div class="recommend-overlay" role="note" aria-label="추천 ${idx + 1}">${idx + 1}</div>`,
        yAnchor: 1.8,
      });
      ov.setMap(map);
      overlays.push(ov);
    });

    setNearbyOverlays(overlays);
    setNearbyList(candidates);
  };
  const handleCloseNearby = () => {
    nearbyOverlays.forEach((ov) => ov.setMap(null));
    setNearbyOverlays([]);
    setNearbyList(null);
  };

  /* 로딩/빈 상태 */
  if (loading) {
    return (
      <div>
        <div className="section-title">예약</div>
        <div className="skeleton-list">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skel-card">
              <div className="skel skel-title" />
              <div className="skel skel-line" />
              <div className="skel skel-line" />
              <div className="skel skel-line" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (!nearbyList && list.length === 0) {
    return (
      <div className="empty-wrap">
        <div className="empty-card">
          <div className="empty-ico">🅿️</div>
          <div className="empty-title">등록된 예약이 없습니다</div>
          <div className="empty-sub">경로를 탐색하고 원하는 주차장을 예약해 보세요.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="res-nowtime">{hhmm} <span className="muted">(테스트모드)</span></p>

      {nearbyList ? (
        <div className="nearby-list">
          <button className="btn-close-nearby" onClick={handleCloseNearby} aria-label="추천 목록 닫기">닫기</button>
          {nearbyList.map((p, i) => (
            <article key={`${p.name}-${i}`} className="nearby-card">
              <div className="nearby-head"><div className="nearby-title">{p.name}</div></div>
              <div className="nearby-grid"><div className="nearby-cell">남은여석: {p.remainCnt ?? "-"}</div></div>
              <button className="btn-path" onClick={() => setRouteInfo({ destination: p.name, isParking: true })} aria-label={`${p.name}로 경로 탐색`}>경로 탐색</button>
            </article>
          ))}
        </div>
      ) : (
        <div className="res-list">
          {list.map((r) => {
            const sec = secondsUntil(r.startTime);
            const status = getStatus(sec);

            /* 바: 60분 스케일(많을수록 더 채움) */
            const barPct = sec == null ? 0 : sec <= 0 ? 0 : Math.min(100, Math.round((sec / 3600) * 100));
            let barClass = "gray";
            if (sec > 30 * 60)      barClass = "green";
            else if (sec > 15 * 60) barClass = "amber";
            else if (sec > 0)       barClass = "red";

            const badgeLabel = r.ticket === "DAY" ? "당일권" : `${Math.round((r.minutes || 0) / 60)}시간권`;

            return (
              <article key={r.id} className={`res-card ${status.key === "done" ? "is-done" : ""}`} aria-live="polite">
                <header className="res-head">
                  <div className="res-title" title={r.parkName}>{r.parkName}</div>
                  <div className="res-badges">
                    <span className={`res-chip chip-${status.key}`}>{status.label}</span>
                    <span className={`res-badge ${r.ticket === "DAY" ? "day" : "hour"}`}>{badgeLabel}</span>
                  </div>
                </header>

                <div className="res-grid">
                  <div className="res-cell full-width">
                    <div className="res-label">예약까지</div>
                    <div className="res-value">{sec == null ? "-" : sec <= 0 ? "완료된 예약" : toHMS(sec)}</div>

                    <div className={`res-progress ${barClass}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={barPct} aria-label="예약까지 남은 시간">
                      <div className="fill" style={{ width: `${barPct}%` }} />
                      <div className="tick tick-30"><span>30m</span></div>
                      <div className="tick tick-15"><span>15m</span></div>
                    </div>

                    <div className="res-progress-info">
                      <span className={`mini-chip ${status.key}`}>{status.label}</span>
                      <span className="eta">ETA {r.startTime ?? "-"}</span>
                    </div>
                  </div>

                  <div className="res-cell"><div className="res-label">시작시간</div><div className="res-value">{r.startTime ?? "-"}</div></div>
                  <div className="res-cell"><div className="res-label">남은여석</div><div className="res-value">{r.remainCnt ?? "-"}</div></div>
                  <div className="res-cell"><div className="res-label">결제금액</div><div className="res-value res-amount">{formatKRW(r.price)}</div></div>

                  {/* 버튼 1줄/동일 폭 + 자동 폰트 축소 */}
                  <div className="res-actions-row">
                    <button className="btn-primary--sm" onClick={() => handleNavigate(r)} aria-label={`${r.parkName} 경로 안내 시작`}>경로 안내</button>
                    <button className="btn-blue" onClick={() => handleRecommendNearby(r)} aria-label={`${r.parkName} 주차장 추천`}>주차장 추천</button>
                    <button className="btn-cancel btn-cancel--sm" onClick={() => handleCancel(r)} disabled={cancellingId === r.id} aria-busy={cancellingId === r.id} aria-label={`${r.parkName} 예약 취소`}>
                      {cancellingId === r.id ? "취소 중…" : "예약 취소"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
