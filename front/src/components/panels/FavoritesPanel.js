// src/components/panels/FavoritesPanel.js
import React, { useEffect, useState } from "react";
import "../../css/FavoritesPanel.css";

export default function FavoritesPanel() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [list, setList] = useState([]);
  const [cancellingId, setCancellingId] = useState(null);

  // ✅ 개발용 가짜 로그인 스위치
  const devLogin =
      new URLSearchParams(window.location.search).has("devLogin") ||
      localStorage.getItem("devLogin") === "1";

  // 로그인 상태 확인
  useEffect(() => {
    let abort = false;

    if (devLogin) {
      if (!abort) {
        setMe({ username: "dev-user" });
        setLoading(false);
      }
      return () => { abort = true; };
    }

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
  }, [devLogin]);

  // 예약 목록 가져오기
  useEffect(() => {
    if (devLogin) {
      const stash = JSON.parse(localStorage.getItem("mockReservations") || "[]");
      setList(Array.isArray(stash) ? stash : []);
      setLoading(false);
      return;
    }

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
  }, [me?.username, devLogin]);

  // 예약 취소
  const handleCancel = async (r) => {
    if (!r?.id) {
      alert("이 예약은 식별자가 없어 취소할 수 없습니다.");
      return;
    }
    if (!window.confirm("이 예약을 취소할까요?")) return;

    setCancellingId(r.id);

    try {
      if (devLogin) {
        // 로컬 목 데이터에서 삭제
        const cur = JSON.parse(localStorage.getItem("mockReservations") || "[]");
        const next = cur.filter((x) => x.id !== r.id);
        localStorage.setItem("mockReservations", JSON.stringify(next));
        setList(next);
        return;
      }

      // 1) DELETE /api/reservations/:id
      let res = await fetch(`/api/reservations/${encodeURIComponent(r.id)}`, {
        method: "DELETE",
        credentials: "include",
      });

      // 2) 폴백: POST /api/reservations/cancel
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

      // 성공: 리스트에서 제거
      setList((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e) {
      console.error(e);
      alert("예약 취소에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setCancellingId(null);
    }
  };

  // 로딩 중
  if (loading) {
    return (
        <div>
          <div className="section-title">예약</div>
          <div className="tip-box">불러오는 중…</div>
        </div>
    );
  }

  // 비로그인 (개발 모드가 아닐 때만)
  if (!me?.username && !devLogin) {
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
          <div className="tip-box">
            아직 예약된 내역이 없습니다. 경로 카드에서 예약을 진행해 보세요.
          </div>
        </div>
    );
  }

  // 예약 목록
  return (
      <div>
        <div className="section-title">예약</div>

        <div className="res-list">
          {list.map((r) => (
              <article
                  key={r.id ?? `${r.parkName}-${r.createdAt ?? Math.random()}`}
                  className="res-card"
              >
                {/* 헤더 */}
                <div className="res-head">
                  <div className="res-title" title={r.parkName}>{r.parkName}</div>
                  <span className={`res-badge ${r.ticket === "DAY" ? "day" : "hour"}`}>
                {r.ticket === "DAY"
                    ? "당일권"
                    : `${Math.round((r.minutes || 0) / 60)}시간권`}
              </span>
                </div>

                {/* 본문 */}
                <div className="res-grid">
                  <div className="res-cell">
                    <div className="res-label">도착</div>
                    <div className="res-value">{r.eta ?? "-"}</div>
                  </div>
                  <div className="res-cell">
                    <div className="res-label">시간</div>
                    <div className="res-value">
                      {r.minutes ? `${Math.round(r.minutes / 60)}시간` : "-"}
                    </div>
                  </div>
                  <div className="res-cell">
                    <div className="res-label">결제금액</div>
                    <div className="res-value res-amount">
                      {r.price != null ? `${Number(r.price).toLocaleString()}원` : "-"}
                    </div>
                  </div>
                </div>

                {/* 보조정보 */}
                <div className="res-meta-row">
                  {r.createdAt ? (
                      <div className="res-meta">
                        예약일시&nbsp;
                        <time>{new Date(r.createdAt).toLocaleString()}</time>
                      </div>
                  ) : (
                      <span />   // 자리 맞춤
                  )}

                  <button
                      className="btn-cancel btn-cancel--sm"
                      onClick={() => handleCancel(r)}
                      disabled={cancellingId === r.id}
                      aria-busy={cancellingId === r.id}
                  >
                    {cancellingId === r.id ? "취소 중…" : "예약 취소"}
                  </button>
                </div>
              </article>
          ))}
        </div>
      </div>
  );
}