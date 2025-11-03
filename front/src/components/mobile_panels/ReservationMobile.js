import React, { useMemo, useState } from "react";
import "../../mobile_css/ReservationMobile.css";

const TICKETS = [
    { key: "60",  label: "1시간권",  minutes: 60 },
    { key: "120", label: "2시간권",  minutes: 120 },
    { key: "180", label: "3시간권",  minutes: 180 },
    { key: "240", label: "4시간권",  minutes: 240 },
    { key: "360", label: "6시간권",  minutes: 360 },
    { key: "480", label: "8시간권",  minutes: 480 },
    { key: "DAY", label: "당일권",   minutes: 720 }, // 필요시 조정
];

export default function ReservationMobile({
                                             park, eta, unitPrice5min,
                                             onConfirm, onClose
                                         }) {
    const [selected, setSelected] = useState(null);
    const [agree, setAgree] = useState(false);

    const priceFor = (minutes) => {
        if (!unitPrice5min || isNaN(unitPrice5min)) return null;
        const blocks = Math.ceil(minutes / 5);
        return unitPrice5min * blocks;
    };

    const tickets = useMemo(() => TICKETS.map(t => ({
        ...t, price: priceFor(t.minutes)
    })), [unitPrice5min]);

    return (
        <div>
            <div className="section-title">권종 선택</div>
            <div className="ticket-grid">
                {tickets.map(t => {
                    const active = selected?.key === t.key;
                    return (
                        <button key={t.key}
                                className={`ticket ${active ? "active" : ""}`}
                                onClick={() => setSelected(t)}>
                            <div className="ticket-label">{t.label}</div>
                            <div className="ticket-price">
                                {t.price == null ? "요금정보 없음" : `${t.price.toLocaleString()}원`}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="reserve-summary">
                <div><span>도착</span><b>{eta ?? "-"}</b></div>
                <div><span>권종</span><b>{selected?.label ?? "-"}</b></div>
                <div><span>결제금액</span>
                    <b>{selected?.price == null ? "-" : `${selected.price.toLocaleString()}원`}</b>
                </div>
            </div>

            <label className="agree-row">
                <input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)} />
                <span>이용 안내 및 환불정책에 동의합니다</span>
            </label>

            <div className="route-actions">
                <button className="btn btn-start"
                        disabled={!selected || !agree}
                        onClick={()=>{
                            if (!selected) return;
                            onConfirm?.({
                                parkName: park?.PKLT_NM,
                                ticket: selected.key,
                                minutes: selected.minutes,
                                price: selected.price ?? null,
                                eta
                            });
                        }}>
                    예약 확정
                </button>
                <button className="btn btn-close" onClick={onClose}>취소</button>
            </div>
        </div>
    );
}