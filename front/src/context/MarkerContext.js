// src/context/ParkingContext.js
import React, { createContext, useState } from "react";

export const MarkerContext = createContext();

export const MarkerProvider = ({ children }) => {
    // 시간 "HHMM" → "HH:MM"
    const fmtHM = (s) =>
        s && s.length === 4 ? `${s.slice(0, 2)}:${s.slice(2)}` : s || "-";

    // 오버레이 HTML 생성
    const buildOverlayHTML = (park, idx) => {
        const total = park.TPKCT ?? "-";
        const live = park.liveCnt ?? "정보 없음";
        const remain = park.remainCnt ?? "정보 없음";
        const price = park.PRK_CRG != null ? `${park.PRK_CRG}원` : "정보 없음";
        const wd = `${fmtHM(park.WD_OPER_BGNG_TM)} - ${fmtHM(
            park.WD_OPER_END_TM
        )}`;

        return `
          <div class="ep-overlay">
            <div class="ep-overlay__head">
              <div class="ep-overlay__title">${
            park.PKLT_NM || "주차장"
        }</div>
              <div class="ep-overlay__badge">${park.CHGD_FREE_NM || ""}</div>
              <button class="ep-close" aria-label="닫기">×</button>
            </div>
            <div class="ep-overlay__body">
              <div class="ep-kv">
                <span>총자리</span><b>${total}</b>
                <span>현재</span><b>${live}</b>
                <span>남음</span><b>${remain}</b>
              </div>
              <div class="ep-row"><span>가격 (5분당)</span><b>${price}</b></div>
              <div class="ep-row"><span>운영시간</span><b>${wd}</b></div>
              <div class="ep-row"><span>유형</span><b>${
            park.PKLT_KND_NM || "-"
        }</b></div>
              <div class="ep-row"><span>전화</span><b>${park.TELNO || "-"}</b></div>
            </div>
            <div class="ep-overlay__actions">
              <button class="ep-overlay__btn" id="detail-zone">상세분석</button>&nbsp
              <a href="#" class="ep-overlay__btn" id="route-search" onClick={onRerouteClick}>경로탐색</a>
            </div>
          </div>`;
    };
    // 남은 좌석 비율에 따른 브랜드 컬러
    const colorByRemain = (remain, total) => {
        if (remain == null || total <= 0) return "#9CA3AF"; // 정보 없음
        const r = remain / total;
        if (r >= 0.5) return "#3897f0"; // 파랑
        if (r >= 0.2) return "#f59e0b"; // 주황
        return "#ef4444"; // 빨강
    };

    // SVG 마커 이미지 생성 (scale로 크기 제어)
    const buildMarkerImage = (park, scale = 0.75) => {
        const BASE_W = 44,
            BASE_H = 56;
        const w = Math.round(BASE_W * scale);
        const h = Math.round(BASE_H * scale);

        const total = Number(park.TPKCT) || 0;
        const remain = park.remainCnt ?? null;
        const fill = colorByRemain(remain, total);
        const label = remain != null ? remain : "–";

        const circleR = 12 * scale;
        const fontSize = 14 * scale;

        const svg = `
          <svg width="${w}" height="${h}" viewBox="0 0 44 56" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="${2 * scale}" stdDeviation="${
            3 * scale
        }" flood-color="rgba(0,0,0,0.25)"/>
              </filter>
            </defs>
            <path filter="url(#shadow)" d="M22 1c11 0 20 9 20 20 0 14-20 34-20 34S2 35 2 21C2 10 11 1 22 1z" fill="${fill}"/>
            <circle cx="22" cy="21" r="${circleR}" fill="#ffffff"/>
            <text x="22" y="${
            25 * scale + (1 - scale) * 25
        }" font-size="${fontSize}"
              font-family="Inter, Apple SD Gothic Neo, Arial" text-anchor="middle"
              fill="${fill}" font-weight="700">${label}</text>
          </svg>`;
        return new window.kakao.maps.MarkerImage(
            "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
            new window.kakao.maps.Size(w, h),
            { offset: new window.kakao.maps.Point(w / 2, h) } // 핀 끝점 보정
        );
    };

    return (
        <MarkerContext.Provider value={{buildMarkerImage,buildOverlayHTML}}>
            {children}
        </MarkerContext.Provider>
    );
};
