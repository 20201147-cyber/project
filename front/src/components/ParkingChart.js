import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceDot,
} from "recharts";

export default function ParkingChart() {
    const [data, setData] = useState([]);

    useEffect(() => {
        Papa.parse("/20250922.csv", {
            download: true,
            header: true,
            complete: (result) => {
                const filtered = result.data.filter(
                    (row) => row.PKLT_NM && row.PKLT_NM.includes("종묘주차장")
                );

                const formatted = filtered.map((row) => ({
                    time: row.timestamp ? row.timestamp.split(" ")[1].slice(0, 5) : "",
                    liveCnt: Number(row.liveCnt) || 0,
                    remainCnt: Number(row.remainCnt) || 0,
                }));

                setData(formatted);
            },
            error: (err) => {
                console.error("CSV 파싱 에러:", err);
            },
        });
    }, []);

    // 최대값/최소값 계산
    const maxLive = data.length ? Math.max(...data.map(d => d.liveCnt)) : 0;
    const minLive = data.length ? Math.min(...data.map(d => d.liveCnt)) : 0;
    const maxPoint = data.find(d => d.liveCnt === maxLive);
    const minPoint = data.find(d => d.liveCnt === minLive);

    return (
        <div style={{ width: "100%", height: 400 }}>
            <div>2025-09-22</div>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="liveCnt"
                        stroke="#1f77b4"
                        name="주차된 차량"
                        dot={{ r: 3 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="remainCnt"
                        stroke="#ff7f0e"
                        name="남은 자리"
                        dot={{ r: 3 }}
                    />

                    {/* 최대값 점 */}
                    {maxPoint && (
                        <ReferenceDot
                            x={maxPoint.time}
                            y={maxPoint.liveCnt}
                            r={6}
                            fill="red"
                            stroke="none"
                            label={{ value: `최대: ${maxPoint.liveCnt}`, position: 'top' }}
                        />
                    )}

                    {/* 최소값 점 */}
                    {minPoint && (
                        <ReferenceDot
                            x={minPoint.time}
                            y={minPoint.liveCnt}
                            r={6}
                            fill="green"
                            stroke="none"
                            label={{ value: `최소: ${minPoint.liveCnt}`, position: 'bottom' }}
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
            <div>가장 혼잡한 시간대:14시 13분</div>
            <div></div>
        </div>
    );
}