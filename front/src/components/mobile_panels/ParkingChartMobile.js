import React, { useMemo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import "../../css/ParkingChart.css";

const COLORS = {
    live: "#ef4444",   // 주차 대수 = 빨간색
    remain: "#3b82f6", // 여석 수 = 파란색
    grid: "#eef2f7",
    axis: "#6b7280",
    axisLine: "#e5e7eb",
};

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;

    const live = payload.find((p) => p.dataKey === "liveCnt")?.value;
    const remain = payload.find((p) => p.dataKey === "remainCnt")?.value;

    return (
        <div className="pc-tooltip" role="dialog" aria-label="차트 툴팁">
            <div className="pc-tip-time"  style={{fontSize:30}} >{label}</div>
            <div className="pc-tip-row">
                <span className="pc-badge live"  style={{fontSize:30}} >주차</span>
                <b  style={{fontSize:30}} >{live ?? "–"}</b>대
            </div>
            <div className="pc-tip-row">
                <span className="pc-badge remain"  style={{fontSize:30}} >여석</span>
                <b  style={{fontSize:30}} >{remain ?? "–"}</b>대
            </div>
        </div>
    );
}

export default function ParkingChart({ parkName, csvDataByName }) {
    // 오늘 기준 1주일 전 같은 요일
    const lastWeekDateStr = useMemo(() => {
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);

        const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
        const dayOfWeek = lastWeek.getDay();

        const yyyy = lastWeek.getFullYear();
        const mm = String(lastWeek.getMonth() + 1).padStart(2, "0");
        const dd = String(lastWeek.getDate()).padStart(2, "0");

        return `${yyyy}-${mm}-${dd} (${weekdays[dayOfWeek]})`;
    }, []);

    const data = useMemo(
        () => (csvDataByName?.[parkName] || []).filter(Boolean),
        [csvDataByName, parkName]
    );

    const points = data.length;

    const maxLive = points ? Math.max(...data.map((d) => d.liveCnt)) : null;
    const minLive = points ? Math.min(...data.map((d) => d.liveCnt)) : null;
    const maxPoint = points ? data.find((d) => d.liveCnt === maxLive) : null;
    const minPoint = points ? data.find((d) => d.liveCnt === minLive) : null;

    return (
        <div className="pc-wrap" role="region" aria-label={`${parkName} 주차장 상세`}>
            {/* Header */}
            <div className="pc-header">
                <div className="pc-header-main">
                    <h3 className="pc-title" style={{fontSize:40}}>{parkName}</h3>
                    <div className="pc-date" style={{fontSize:30}}>{lastWeekDateStr}</div>
                </div>

                {/* 범례 */}
                <div className="pc-stats">
          <span className="pc-chip pc-chip-live">
            <span className="pc-dot live"/>
              <span  style={{fontSize:30}} >주차 대수</span>
          </span>
                    <span className="pc-chip pc-chip-remain">
            <span className="pc-dot remain"  />
            <span style={{fontSize:30}}>여석 수</span>
          </span>
                </div>

                {/* 가장 혼잡 / 여유 시간 */}
                {maxPoint && minPoint && (
                    <div className="pc-peak-note" >
            <span className="pc-note" style={{fontSize:30}}>
              <span className="pc-note-label">가장 혼잡한 시간은?</span>
              <b>{maxPoint.time}</b>
            </span>
                        <span className="pc-note" style={{fontSize:30}}>
              <span className="pc-note-label">가장 여유로운 시간은?</span>
              <b>{minPoint.time}</b>
            </span>
                    </div>
                )}
            </div>

            {/* Chart */}
            {points === 0 ? (
                <div className="pc-empty">
                    <div className="pc-skel" style={{ width: "60%" }} />
                    <div className="pc-skel" style={{ width: "90%" }} />
                    <div className="pc-skel" style={{ width: "75%" }} />
                    <div className="pc-skel" style={{ width: "85%" }} />
                </div>
            ) : (
                <div className="pc-chart">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 16, right: 16, left: 8, bottom: 40 }}
                        >
                            <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                            <XAxis
                                dataKey="time"
                                tick={{ fontSize: 12, fill: COLORS.axis }}
                                tickMargin={8}
                                axisLine={{ stroke: COLORS.axisLine }}
                                tickLine={{ stroke: COLORS.axisLine }}
                            />
                            <YAxis
                                allowDecimals={false}
                                width={42}
                                tick={{ fontSize: 12, fill: COLORS.axis }}
                                axisLine={{ stroke: COLORS.axisLine }}
                                tickLine={{ stroke: COLORS.axisLine }}
                            />
                            <Tooltip content={<CustomTooltip />} />

                            <Line
                                type="monotone"
                                dataKey="liveCnt"
                                name="주차된 차량"
                                stroke={COLORS.live}
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 5 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="remainCnt"
                                name="남은 자리"
                                stroke={COLORS.remain}
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
