// /src/components/ParkingChart.js
import React, { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceDot,
} from "recharts";
import "../css/ParkingChart.css";

const COLORS = {
  live: "var(--pc-ink)",
  remain: "#10b981",
  grid: "#eef2f7",
  axis: "#6b7280",
  axisLine: "#e5e7eb",
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const live = payload.find(p => p.dataKey === "liveCnt")?.value;
  const remain = payload.find(p => p.dataKey === "remainCnt")?.value;
  return (
    <div className="pc-tooltip" role="dialog" aria-label="차트 툴팁">
      <div className="pc-tip-time">{label}</div>
      <div className="pc-tip-row"><span className="pc-badge live">주차</span><b>{live ?? "–"}</b>대</div>
      <div className="pc-tip-row"><span className="pc-badge remain">남음</span><b>{remain ?? "–"}</b>대</div>
    </div>
  );
}

export default function ParkingChart({ parkName, csvDataByName }) {
  // 오늘 기준 이전주 같은 요일 계산
  const lastWeekDateStr = useMemo(() => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7); // 7일 전

    // 요일 계산
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const dayOfWeek = lastWeek.getDay(); // 0~6
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
  const last = points ? data[points - 1] : null;

  const maxLive = points ? Math.max(...data.map(d => d.liveCnt)) : null;
  const minLive = points ? Math.min(...data.map(d => d.liveCnt)) : null;
  const maxPoint = points ? data.find(d => d.liveCnt === maxLive) : null;
  const minPoint = points ? data.find(d => d.liveCnt === minLive) : null;

  return (
      <div className="pc-wrap" role="region" aria-label={`${parkName} 주차장 상세`}>
        {/* Header */}
        <div className="pc-header">
          <h3 className="pc-title">{parkName}</h3>
          <div className="pc-stats">
            <h2>{lastWeekDateStr}</h2>
          </div>
          <div className="pc-stats">
            <span className="pc-chip"><span className="pc-dot live" />피크 {maxPoint?.time} / {maxPoint?.liveCnt}대</span>
            <span className="pc-chip"><span className="pc-dot remain" />로우 {minPoint?.time} / {minPoint?.liveCnt}대</span>
          </div>
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
                <LineChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 10 }}>
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

                  {maxPoint && (
                      <ReferenceDot x={maxPoint.time} y={maxPoint.liveCnt} r={4} fill="var(--pc-ink)" />
                  )}
                  {minPoint && (
                      <ReferenceDot x={minPoint.time} y={minPoint.liveCnt} r={4} fill="#ef4444" />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
        )}
      </div>
  );
}
