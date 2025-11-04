// src/context/RouteContext.js
import React, { createContext, useState } from "react";

export const RouteContext = createContext();

export const RouteProvider = ({ children }) => {

    // 거리 계산 함수 (미터 단위)
    function calcDistanceMeters(lat1, lng1, lat2, lng2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

// 모든 경로 라인 제거 (락 고려)
    function clearRoutePath() {
        if (window.__routeLocked && window.currentRouteLine) return;
        ["routeGlowLine", "routeShadowLine", "currentRouteLine"].forEach((k) => {
            if (window[k]) {
                window[k].setMap(null);
                window[k] = null;
            }
        });
    }
    // 3중 라인 그리기 (락 고려)
    function drawRoutePath(map, pathPoints, color = "#3897f0") {
        if (window.__routeLocked && window.currentRouteLine) return;

        // 바깥 글로우
        window.routeGlowLine = new window.kakao.maps.Polyline({
            path: pathPoints,
            strokeWeight: 14,
            strokeColor: color,
            strokeOpacity: 0.12,
            strokeStyle: "solid",
        });
        window.routeGlowLine.setMap(map);

        // 흰색 외곽선
        window.routeShadowLine = new window.kakao.maps.Polyline({
            path: pathPoints,
            strokeWeight: 10,
            strokeColor: "#ffffff",
            strokeOpacity: 0.95,
            strokeStyle: "solid",
        });
        window.routeShadowLine.setMap(map);

        // 본선
        window.currentRouteLine = new window.kakao.maps.Polyline({
            path: pathPoints,
            strokeWeight: 6,
            strokeColor: color,
            strokeOpacity: 1,
            strokeStyle: "solid",
        });
        window.currentRouteLine.setMap(map);
    }

// 경로 라인 제거 (락 고려)
    function clearRouteLine() {
        if (window.__routeLocked && window.currentRouteLine) return;
        if (window.currentRouteLine) {
            window.currentRouteLine.setMap(null);
            window.currentRouteLine = null;
        }
    }
    //좌회전 우회전 유턴 구현중
    // ===== Turn-by-turn utils =====
    // ✅ "표시할 턴만" 넣기 (직진은 아예 제거)
    const TURN_MAP = {
    12: { label: "좌회전", icon: "↰" },
    13: { label: "우회전", icon: "↱" },
    14: { label: "유턴",   icon: "⤴" },

    // 방향각 좌/우 회전도 필요하면 같은 아이콘으로 묶기
    16: { label: "좌회전", icon: "↰" },
    17: { label: "좌회전", icon: "↰" },
    18: { label: "우회전", icon: "↱" },
    19: { label: "우회전", icon: "↱" },
    };

    function formatMeters(m) {
    if (m == null) return "-";
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(1)} km`;
    }

    function TurnBanner({ turn, dist }) {
        if (turn == null) return null;

        const code = Number(turn);
        const t = TURN_MAP[code];
        // TURN_MAP 에 없는 코드(직진 등)는 표시하지 않음
        if (!t) return null;

        return (
            <div
            className="turn-banner"
            style={{
                position: "fixed",
                top: 88,          // 🔸 헤더(안심 주행중) 바로 아래 정도
                left: 12,
                zIndex: 1200,
                background: "rgba(17,24,39,0.96)",
                color: "#fff",
                padding: "12px 16px",
                borderRadius: 16,
                boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontWeight: 700,
                maxWidth: "80vw",
            }}
            >
            {/* 아이콘 박스 */}
            <div
                style={{
                width: 180,
                height: 80,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                }}
            >
                {t.icon}
            </div>

            {/* 텍스트 영역 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 14, opacity: 0.9 }}>
                앞으로 {formatMeters(dist)}
                </span>
                <span style={{ fontSize: 20 }}>{t.label}</span>
            </div>
            </div>
        );
        }

    // Tmap GeoJSON에서 회전 지점 추출 (turnType 있는 feature들을 Point로 간주)
    function extractManeuvers(data) {
        if (!data?.features?.length) return [];
        const list = [];
        data.features.forEach((f) => {
            const p = f.properties || {};
            const g = f.geometry || {};
            if (p.turnType == null) return;

            const code = Number(p.turnType);
            if (Number.isNaN(code)) return;

            if (g.type === "Point" && Array.isArray(g.coordinates)) {
                const [lon, lat] = g.coordinates;
                list.push({ lat, lon, turnType: code });
            } else if (
                g.type === "LineString" &&
                Array.isArray(g.coordinates) &&
                g.coordinates.length
            ) {
                const [lon, lat] = g.coordinates[0];
                list.push({ lat, lon, turnType: code });
            }
        });
        return list;
    }

    return (
        <RouteContext.Provider value={{calcDistanceMeters,clearRoutePath,drawRoutePath,clearRouteLine,TurnBanner,TURN_MAP,formatMeters,extractManeuvers}}>
            {children}
        </RouteContext.Provider>
    );
};