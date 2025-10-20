// src/context/ParkingContext.js
import React, { createContext, useState } from "react";

export const CalculationContext = createContext();

export const CalculationProvider = ({ children }) => {
    // ===== utils (define ONCE, top-level) =====
    const pad2 = (n) => String(n).padStart(2, "0");

    // "24:00" 허용
    function toDateFromHHMM(hhmm) {
        let [h, m] = hhmm.split(":").map(Number);
        const d = new Date();
        if (h === 24) { h = 0; d.setDate(d.getDate() + 1); }
        d.setHours(h, m, 0, 0);
        return d;
    }

    function addMinutesHHMM(hhmm, minutes) {
        if (!hhmm || typeof minutes !== "number") return "-";
        const d = toDateFromHHMM(hhmm);
        d.setMinutes(d.getMinutes() + minutes);
        return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }

    // 다음 정각(06~24로 클램핑)
    function roundToNextHourHH() {
        const d = new Date();
        let h = d.getMinutes() > 0 ? d.getHours() + 1 : d.getHours();
        if (h < 6) h = 6;
        if (h > 24) h = 24;
        return `${pad2(h)}:00`;
    }

    // 06~24 목록
    const HOURS_24 = Array.from({ length: 19 }, (_, i) => i + 6);

    // (예약) 5분 단가 기반 가격 계산
    function calcTicketPrice(park, minutes, key) {
        if (key === "DAY") {
            return park?.DAY_PRICE ?? 50000; // 예: 정액 3만원, 필요시 필드/값 조정
        }
        const unit = Number(park?.PRK_CRG); // 5분당 요금
        if (!unit || Number.isNaN(unit)) return null;
        return unit * Math.ceil(minutes / 5);
    }

    // (예약) 권종 정의
    const TICKETS = [
        { key: "60",  label: "1시간권", minutes: 60 },
        { key: "120", label: "2시간권", minutes: 120 },
        { key: "180", label: "3시간권", minutes: 180 },
        { key: "360", label: "6시간권",  minutes: 360 },
        { key: "480", label: "8시간권",  minutes: 480 },
        { key: "DAY", label: "당일권", minutes: 720 }, // 필요시 변경
    ];

    return (
        <CalculationContext.Provider value={{pad2,toDateFromHHMM,addMinutesHHMM,roundToNextHourHH,HOURS_24,calcTicketPrice,TICKETS}}>
            {children}
        </CalculationContext.Provider>
    );
};
