// src/context/ParkingContext.js
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
    const TURN_MAP = {
        11: { label: "좌회전", icon: "↰" },
        12: { label: "우회전", icon: "↱" },
        13: { label: "유턴",   icon: "⤴" },
        14: { label: "직진",   icon: "↑"  },
        // 필요하면 추가 (Tmap turnType 값 사용)
    };

    function formatMeters(m) {
        if (m == null) return "-";
        if (m < 1000) return `${Math.round(m)} m`;
        return `${(m / 1000).toFixed(1)} km`;
    }

    // 간단 배너 UI (map 우상단 고정)
    function TurnBanner({ turn, dist }) {
        if (!turn) return null;
        const t = TURN_MAP[turn] || { label: "안내", icon: "•" };
        return (
            <div style={{
                position: "fixed", top: 12, right: 12, zIndex: 1100,
                background: "#111", color: "#fff", padding: "10px 12px",
                borderRadius: 12, boxShadow: "0 6px 18px rgba(0,0,0,.25)",
                display: "flex", alignItems: "center", gap: 8, fontWeight: 700
            }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{t.icon}</span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 13, opacity: .8 }}>앞으로</span>
                    <span>{formatMeters(dist)} {t.label}</span>
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
            // 일부 응답은 LineString 세그먼트에도 turnType이 들어오기도 함 -> 좌표의 첫 점을 지점으로 취급
            if (p.turnType != null) {
                if (g.type === "Point" && Array.isArray(g.coordinates)) {
                    const [lon, lat] = g.coordinates;
                    list.push({ lat, lon, turnType: p.turnType });
                } else if (g.type === "LineString" && Array.isArray(g.coordinates) && g.coordinates.length) {
                    const [lon, lat] = g.coordinates[0];
                    list.push({ lat, lon, turnType: p.turnType });
                }
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
