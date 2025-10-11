import "bootstrap/dist/css/bootstrap.min.css";
import "../css/Admin.css";
import { Container, Row, Col, Nav, Navbar } from "react-bootstrap";
import { Link, Outlet } from "react-router-dom";
import React from "react";
import { ParkingContext } from "../context/ParkingContext";

const Admin = () => {
    return (
        <div className="admin-page">
            {/* 상단 수평 Navbar */}
            <Navbar className="custom-navbar" expand="lg">
                <Container>
                    <Navbar.Brand href="/admin">
                        <div className="brand">
                            Ezpark
                        </div>
                    </Navbar.Brand>
                    <Nav className="ms-auto">
                        <Nav.Link as={Link} to="#">설정</Nav.Link>
                        <Nav.Link as={Link} to="/">메인으로</Nav.Link>
                        <Nav.Link href="#">로그아웃</Nav.Link>
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
                            <Nav.Link as={Link} to="/admin/parkingSearch">주차장 찾기</Nav.Link>
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
