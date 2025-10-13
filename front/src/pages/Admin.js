import "bootstrap/dist/css/bootstrap.min.css";
import "../css/Admin.css";
import { Container, Row, Col, Nav, Navbar } from "react-bootstrap";
import { Link, Outlet } from "react-router-dom";
import React, {useEffect, useState} from "react";
import { ParkingContext } from "../context/ParkingContext";

const Admin = () => {
    const [user, setUser] = useState(null);
    useEffect(() => {
        fetch("/api/auth/me", { credentials: "include" })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                setUser(data);
                console.log("로그인 유저 정보:", data); // 여기서 찍으면 fetch 결과 확인 가능
            })
            .catch(() => {
                setUser(null);
                console.log("유저 정보 가져오기 실패");
            });
    }, []);

    return (
        <div className="admin-page">
            {/* 상단 수평 Navbar */}
            <Navbar className="custom-navbar" expand="lg">
                <Container>
                    <Navbar.Brand >
                        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                        <div className="brand">
                            Ezpark
                        </div>
                            <div style={{paddingLeft:"10px"}}>{user?(user.username):("관리자")}님</div>
                        </div>
                    </Navbar.Brand>
                    <Nav className="ms-auto">

                        <Nav.Link as={Link} to="#">설정</Nav.Link>
                        <Nav.Link as={Link} to="/">메인으로</Nav.Link>
                    </Nav>
                </Container>
            </Navbar>

            {/* 좌측 수직 Navbar + 메인 콘텐츠 */}
            <Container fluid>
                <Row>
                    {/* 좌측 수직 Navbar */}
                    <Col xs={2} className="vertical-navbar p-3">
                        <Nav className="flex-column">
                            <Nav.Link as={Link} to="/admin/dashboard">대시보드</Nav.Link>
                            <Nav.Link as={Link} to="/admin/parkingSearch">주차장 등록</Nav.Link>
                            <Nav.Link as={Link} to="/admin/parking">주차장 관리</Nav.Link>
                            <Nav.Link as={Link} to="/admin/reservation">예약 관리</Nav.Link>
                        </Nav>
                    </Col>

                    {/* 오른쪽 메인 콘텐츠 (Outlet 자리) */}
                    <Col xs={10} className="main-content p-4">
                        <Outlet />
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Admin;
