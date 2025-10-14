import React, {useContext, useEffect, useState} from "react";
import {ParkingContext} from "../../context/ParkingContext";
import "../../css/ReservationManage.css"
const ReservationManage = () => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const { visibleOnly, setVisibleOnly } = useContext(ParkingContext);

    // 로그인한 관리자 정보 가져오기
    useEffect(() => {
        fetch("/api/auth/me", { credentials: "include" })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                setUser(data);
                console.log("로그인 유저 정보:", data);
                console.log(visibleOnly);
            })
            .catch(() => {
                setUser(null);
                console.log("유저 정보 가져오기 실패");
            });
    }, []);

    // 서버에서 예약 데이터 가져오기
    useEffect(() => {
        fetch("/api/findReserve", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error("서버 응답 오류");
                return res.json();
            })
            .then((data) => {
                setReservations(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) return <p>로딩 중...</p>;
    if (error) return <p>오류 발생: {error}</p>;
    if (!user) return <p>로그인이 필요합니다.</p>;

    // 로그인한 관리자의 주차장 코드
    const adminParkCode = user.parkCode;
    console.log(reservations)
    console.log(adminParkCode)
    console.log(visibleOnly)
    // 해당 주차장 예약만 필터링
    const filteredReservations = reservations.filter(r => r.parkCode === adminParkCode);

    // 시간 배열 (6~24시)
    const hours = Array.from({ length: 19 }, (_, i) => i + 6);

    // 사용자 ID 배열
    const userIds = Array.from(new Set(filteredReservations.map(r => r.userId)));

    const myPark = visibleOnly.find(park => String(park.PKLT_CD) === String(adminParkCode));

    console.log("내 주차장"+myPark);
    return (
        <div className="reservation-container">
            <h2 className="title">예약 관리</h2>

            {myPark && (
                <div className="park-info">
                    <div><strong>주차장 이름:</strong> {myPark.PKLT_NM}</div>
                    <div><strong>총 자리:</strong> {myPark.TPKCT}</div>
                    <div><strong>현재 주차 대수:</strong> {myPark.liveCnt || 0}</div>
                    <div><strong>남은 자리:</strong> {myPark.remainCnt || 0}</div>
                </div>
            )}

            {filteredReservations.length === 0 ? (
                <p className="no-reservation">예약 내역이 없습니다.</p>
            ) : (
                <div className="table-container">
                    <table className="reservation-table">
                        <thead>
                        <tr>
                            <th>시간</th>
                            {userIds.map(uid => (
                                <th key={uid}>{uid}</th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {hours.map(hour => (
                            <tr key={hour}>
                                <td className="time-cell">{hour}:00</td>
                                {userIds.map(uid => {
                                    const hasReservation = filteredReservations.some(r => {
                                        const startH = parseInt(r.startTime.split(":")[0]);
                                        const endH = parseInt(r.endTime.split(":")[0]);
                                        return r.userId === uid && hour >= startH && hour < endH;
                                    });
                                    return (
                                        <td
                                            key={uid}
                                            className={hasReservation ? "reserved" : "empty"}
                                            style={{
                                                backgroundColor: hasReservation ? "#4da6ff" : "#fff", // 여기만 변경
                                                textAlign: "center"
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
