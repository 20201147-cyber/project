import React, { useContext, useEffect, useState } from "react";
import { ParkingContext } from "../../context/ParkingContext";
import "../../css/Dashboard.css";

const ReservationManage = () => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const { visibleOnly } = useContext(ParkingContext);

    const today = new Date().toISOString().split("T")[0];
    // 로그인한 관리자 정보 가져오기
    useEffect(() => {
        fetch("/api/auth/me", { credentials: "include" })
            .then(res => res.ok ? res.json() : null)
            .then(data => setUser(data))
            .catch(() => setUser(null));
    }, []);

    // 서버에서 예약 데이터 가져오기
    useEffect(() => {
        fetch("/api/reservations/findReserve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        })
            .then(res => {
                if (!res.ok) throw new Error("서버 응답 오류");
                return res.json();
            })
            .then(data => {
                setReservations(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) return <p>로딩 중...</p>;
    if (error) return <p>오류 발생: {error}</p>;
    if (!user) return <p>로그인이 필요합니다.</p>;

    const adminParkCode = user.parkCode;

    // 해당 주차장 예약만 필터링
    const filteredReservations = reservations.filter(r => r.parkCode === adminParkCode);

    // 시간 배열 (6~24시)
    const hours = Array.from({ length: 19 }, (_, i) => i + 6);

    // 사용자 ID 배열
    const userIds = Array.from(new Set(filteredReservations.map(r => r.userId)));

    const myPark = visibleOnly.find(park => String(park.PKLT_CD) === String(adminParkCode));

    return (
        <div className="reservation-container">
            <h2 className="title">대시보드</h2>
            <h2>{today}</h2>
            {myPark && (
                <div className="park-info">
                    <div><strong>주차장 이름</strong> {myPark.PKLT_NM}</div>
                    <div><strong>총 자리</strong> {myPark.TPKCT}</div>
                    <div><strong>현재 주차 대수</strong> {myPark.liveCnt || 0}</div>
                    <div><strong>남은 자리</strong> {myPark.remainCnt || 0}</div>
                </div>
            )}

            {filteredReservations.length === 0 ? (
                <p className="no-reservation">예약 내역이 없습니다.</p>
            ) : (
                <div className="table-container" style={{ overflowX: "auto" }}>
                    <table className="reservation-table">
                        <thead>
                        <tr>
                            <th>사용자 ID</th>
                            {hours.map(hour => (
                                <th key={hour}>{hour}:00</th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {userIds.map(uid => (
                            <tr key={uid}>
                                <td className="user-cell">{uid}</td>
                                {hours.map(hour => {
                                    const hasReservation = filteredReservations.some(r => {
                                        const startH = parseInt(r.startTime.split(":")[0]);
                                        const endH = parseInt(r.endTime.split(":")[0]);
                                        return r.userId === uid && hour >= startH && hour < endH;
                                    });
                                    return (
                                        <td
                                            key={hour}
                                            className={hasReservation ? "reserved" : "empty"}
                                            style={{
                                                backgroundColor: hasReservation ? "#4da6ff" : "#fff",
                                                textAlign: "center",
                                                minWidth: "40px"
                                            }}
                                        ></td>
                                    );
                                })}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ReservationManage;
