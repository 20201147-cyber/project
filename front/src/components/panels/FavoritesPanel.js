// src/components/panels/FavoritesPanel.js
import React, { useEffect, useState } from "react";

export default function FavoritesPanel() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [list, setList] = useState([]);

  // 로그인 상태 확인
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

  // 로그인 되어있으면 예약 목록 가져오기
  useEffect(() => {
    if (!me?.username) return;
    let abort = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/reservations", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const data = res.ok ? await res.json() : [];
        if (!abort) setList(Array.isArray(data) ? data : []);
      } catch {
        if (!abort) setList([]);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [me?.username]);

  // 로딩 중
  if (loading) {
    return (
      <div>
        <div className="section-title">예약</div>
        <div className="tip-box">불러오는 중…</div>
      </div>
    );
  }

  // 비로그인
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

  // 예약 없음
  if (!list.length) {
    return (
      <div>
        <div className="section-title">예약</div>
        <div className="tip-box">아직 예약된 내역이 없습니다. 경로 카드에서 예약을 진행해 보세요.</div>
      </div>
    );
  }

  // 예약 목록
  return (
    <div>
      <div className="section-title">예약</div>
      <div style={{ display: "grid", gap: 10 }}>
        {list.map((r) => (
          <article
            key={r.id ?? `${r.parkName}-${r.createdAt ?? Math.random()}`}
            className="card"
            style={{ padding: 12 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {r.parkName}
              </div>
              <span className="badge blue">
                {r.ticket === "DAY" ? "당일권" : `${Math.round((r.minutes || 0) / 60)}시간권`}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 8 }}>
              <div>
                <span className="subtle">도착</span>
                <div style={{ fontWeight: 700 }}>{r.eta ?? "-"}</div>
              </div>
              <div>
                <span className="subtle">시간</span>
                <div style={{ fontWeight: 700 }}>{r.minutes ? `${Math.round(r.minutes / 60)}시간` : "-"}</div>
              </div>
              <div>
                <span className="subtle">결제금액</span>
                <div style={{ fontWeight: 700 }}>
                  {r.price != null ? `${Number(r.price).toLocaleString()}원` : "-"}
                </div>
              </div>
            </div>

            {r.createdAt && (
              <div className="subtle" style={{ marginTop: 8 }}>
                예약일시: {new Date(r.createdAt).toLocaleString()}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}