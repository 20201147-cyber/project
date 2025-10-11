import { Row, Col, Card, Button } from "react-bootstrap";
import React from "react";

const Dashboard = () => {
    return (
        <>
            <h2 className="mb-4">대시보드</h2>

            <Row className="mb-4">
                <Col md={4}>
                    <Card className="admin-card">
                        <Card.Body>
                            <Card.Title>총 회원 수</Card.Title>
                            <Card.Text>1,234명</Card.Text>
                            <Button variant="primary">자세히 보기</Button>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="admin-card">
                        <Card.Body>
                            <Card.Title>주차장 현황</Card.Title>
                            <Card.Text>23개</Card.Text>
                            <Button variant="success">관리</Button>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="admin-card">
                        <Card.Body>
                            <Card.Title>오늘 결제</Card.Title>
                            <Card.Text>₩1,200,000</Card.Text>
                            <Button variant="warning">상세보기</Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Card className="stats-card">
                <Card.Body>
                    <Card.Title>통계 그래프</Card.Title>
                    <p>차트나 테이블로 표시 가능</p>
                </Card.Body>
            </Card>
        </>
    );
};

export default Dashboard;
