import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../css/Main.css"; // ← 아래 CSS 파일 임포트

export default function Main() {
  const [mode, setMode] = useState("destination"); // destination | drive | favorites

  return (
    <div className="app">
      {/* 왼쪽: 고정 사이드바 */}
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand">Eazypark</div>
          <span className="pill">Beta</span>
        </div>

        <div className="tabs">
          <button
            className={`tab ${mode === "destination" ? "active" : ""}`}
            onClick={() => setMode("destination")}
          >
            목적지
          </button>
          <button
            className={`tab ${mode === "drive" ? "active" : ""}`}
            onClick={() => setMode("drive")}
          >
            주행
          </button>
          <button
            className={`tab ${mode === "favorites" ? "active" : ""}`}
            onClick={() => setMode("favorites")}
          >
            즐겨찾기
          </button>
        </div>

        <div className="panel-wrap">
          {mode === "destination" && <DestinationPanel />}
          {mode === "drive" && <DrivePanel />}
          {mode === "favorites" && <FavoritesPanel />}
        </div>

        <div className="footer">
          @Eazypark
        </div>
      </aside>

      {/* 오른쪽: 반응형 지도 영역 */}
      <main className="map-area">
        {/* 우상단 링크 */}
        <div className="header-links">
          <Link className="link-btn" to="/admin">관리자</Link>
          <Link className="link-btn" to="/login">로그인</Link>
        </div>

        {/* 실제 카카오 지도 마운트 위치 (UI만 제공) */}
        <div id="map" className="map-canvas" />
      </main>
    </div>
  );
}

/* ───────────────── Panels (UI만) ───────────────── */

function DestinationPanel() {
  return (
    <div>
      <div className="section-title">목적지 모드</div>

      <div className="input-wrap">
        <input className="input" placeholder="출발지 (미입력시 내 위치)" />
      </div>

      <div className="mt-12" style={{ display: "flex", justifyContent: "center" }}>
        <button className="swap-btn">↻ 바꾸기</button>
      </div>

      <div className="mt-12 input-wrap">
        <input className="input" placeholder="목적지" />
      </div>

      <div className="mt-12" style={{ display: "flex", gap: 8 }}>
        <button className="primary-btn" style={{ flex: 1 }}>경로 조회</button>
        <button className="ghost-btn">★ 즐겨찾기</button>
      </div>
    </div>
  );
}

function DrivePanel() {
  return (
    <div>
      <div className="section-title">주행 모드</div>

      <div className="card">
        <div className="subtle">현재 목적지</div>
        <div style={{ marginTop: 6, fontWeight: 600 }}>목적지 미설정</div>
      </div>

      <div className="grid-3 mt-12">
        <div className="stat-card">
          <div className="subtle">경과 시간</div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>00:00:00</div>
        </div>
        <div className="stat-card">
          <div className="subtle">평균 속도</div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>— km/h</div>
        </div>
        <div className="stat-card">
          <div className="subtle">예상 도착</div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>—:—</div>
        </div>
      </div>

      <button className="primary-btn-center">안심 주행</button>
    </div>
  );
}

function FavoritesPanel() {
  return (
    <div>
      <div className="section-title">즐겨찾기</div>

      <div className="tip-box">
        아직 저장된 즐겨찾기가 없습니다. 목적지 모드에서 ★ 버튼으로 추가하세요.
      </div>

      <ul className="list mt-12">
        <li className="list-item">
          <span
            style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            예시 목적지
          </span>
          <button className="small-btn">내비</button>
          <button className="small-btn">편집</button>
          <button className="small-btn" style={{ color: "#d12", borderColor: "#f0d2d2" }}>
            삭제
          </button>
        </li>
      </ul>
    </div>
  );
}