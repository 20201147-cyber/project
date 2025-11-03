import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../css/ParkingManage.css";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";

const ParkingManage = () => {
    const navigate = useNavigate();
    const [admins, setAdmins] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const location = useLocation();

    useEffect(() => {
        // 로그인 정보 다시 불러오기
        fetch("/api/auth/me", { credentials: "include" })
            .then(res => res.ok ? res.json() : null)
            .then(setUser)
            .catch(() => setUser(null));
    }, [location]); // 페이지 이동 시마다 재실행
    useEffect(() => {
        fetch("/api/auth/me", { credentials: "include" })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                setUser(data);
                console.log("로그인 유저 정보:", data);
            })
            .catch(() => {
                setUser(null);
                console.log("유저 정보 가져오기 실패");
            });
    }, []);
    // 데이터 불러오기
    const fetchAdmins = async () => {
        setLoading(true);
        try {
            const res = search
                ? await axios.get(`/api/admin/parks/search?pkltCd=${search}`)
                : await axios.get("/api/admin/parks");
            setAdmins(res.data);
        } catch (err) {
            console.error(err);
            setAdmins([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmins();
    }, [search]);

    // 삭제
    const handleDelete = async (pkltCd) => {
        if (!window.confirm(`주차장 ${pkltCd}를 삭제하시겠습니까?`)) return;
        try {
            await axios.delete(`/api/admin/parks/${pkltCd}`);
            alert("삭제 완료!");
            fetchAdmins();
        } catch (err) {
            console.error(err);
            alert("삭제 실패");
        }
    };

    return (
        <div className="parking-manage-container">
            <h2>주차장 관리</h2>
            <div className="table-wrapper">
                <table className="parking-table">
                    <thead>
                    <tr>
                        <th>관리자 ID</th>
                        <th>관리자 이름</th>
                        <th>주차장 번호 (PKLT_CD)</th>
                    </tr>
                    </thead>
                    <tbody>
                    {user ? (
                        <>
                            <tr>
                                <td>{user.id??"-"}</td>
                                <td>{user.username??"-"}</td>
                                <td>{user.parkCode??"-"}
                                <span className="btn-group">
                                    <button
                                        onClick={() => {
                                            navigate("/admin/parkingSearch");
                                            }}
                                    >
                                      수정
                                    </button>
                                    <button
                                        style={{ background: "red" }}
                                        onClick={async () => {
                                            if (!window.confirm("주차장 연결을 해제하시겠습니까?")) return;
                                            try {
                                                const res = await axios.post("/api/unregisterPark", {
                                                    adminId: user.id, // 현재 로그인한 관리자 ID
                                                });
                                                alert(res.data); // 서버에서 보낸 메시지 출력
                                                // 새로고침 or 정보 갱신
                                                window.location.reload();
                                            } catch (err) {
                                                console.error(err);
                                                alert("삭제(해제) 실패");
                                            }
                                        }}
                                    >
                                      삭제
                                    </button>
                                </span></td>
                            </tr>
                        </>
                    ) : (
                        <tr>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ParkingManage;
