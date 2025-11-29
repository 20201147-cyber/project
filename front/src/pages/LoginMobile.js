// src/pages/Login.js
import { useState } from "react";
import { Link } from "react-router-dom";
import { Modal, Button, Form } from "react-bootstrap";
import "../css/Login.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const LoginMobile = () => {
    const [show, setShow] = useState(false);
    const [signupData, setSignupData] = useState({ id: "", password: "", username: "" });
    const [loginData, setLoginData] = useState({ id: "", password: "" });
    const [signupType, setSignupType] = useState("user"); // 일반(user) or 관리자(admin)
    const navigate = useNavigate();

    const handleChange = (e) => {
        setSignupData({ ...signupData, [e.target.name]: e.target.value });
    };

    // 회원가입
    const handleSignup = async () => {
        if (!signupData.id) {
            alert("아이디를 입력하세요");
            return;
        }
        if (!/^[a-zA-Z0-9]{4,20}$/.test(signupData.id)) {
            alert("아이디는 영문+숫자 4~20자만 가능합니다");
            return;
        }
        if (!signupData.password) {
            alert("비밀번호를 입력하세요");
            return;
        }
        if (signupData.password.length < 6) {
            alert("비밀번호는 최소 6자 이상입니다");
            return;
        }
        if (!signupData.username) {
            alert("이름을 입력하세요");
            return;
        }

        try {
            // 일반/관리자 회원가입 URL 분기
            const url = signupType === "admin" ? "/api/auth/adminSignup" : "/api/auth/signup";
            const res = await axios.post(url, signupData);
            alert(res.data); // 성공 메시지
            setShow(false);  // 모달 닫기
            setSignupData({ id: "", password: "", username: "" }); // 초기화
            setSignupType("user"); // 기본값으로 초기화
        } catch (err) {
            alert(err.response?.data || "회원가입 실패");
        }
    };

    // 로그인
    const handleLogin = async (e) => {
        e.preventDefault();
        const { id, password } = loginData;
        if (!id || !password) {
            alert("아이디와 비밀번호를 입력하세요.");
            return;
        }
        try {
            const res = await axios.post("/api/auth/login", loginData, { withCredentials: true });
            alert("로그인 성공!");
            navigate("/mobile");
        } catch (err) {
            alert(err.response?.data || "로그인 실패");
        }
    };

    return (
        <div className="login-2col">
            {/* 왼쪽 이미지 영역 */}
            <div className="login-left">
                <div className="photo-stack">
                    <img src="/images/parkimg2.jpg" alt="이미지1" className="stack-card c1" />
                    <img src="/images/parkimg3.jpg" alt="이미지2" className="stack-card c2" />
                    <img src="/images/parkimg1.jpg" alt="이미지3" className="stack-card c3" />
                </div>
            </div>

            {/* 오른쪽 로그인 박스 */}
            <div className="login-right">
                <div className="login-page">
                    <Link to="/" style={{fontSize:40}}>메인 페이지로</Link>
                    <h1 className="logo-text" style={{fontSize:60}}>Ezpark</h1>

                    <form onSubmit={handleLogin} >
                        <Form.Control
                            type="text"
                            placeholder="아이디 입력"
                            name="id"
                            value={loginData.id}
                            onChange={(e) => setLoginData({ ...loginData, [e.target.name]: e.target.value })}
                            style={{fontSize:30}}
                        />
                        <Form.Control
                            type="password"
                            placeholder="비밀번호 입력"
                            name="password"
                            value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, [e.target.name]: e.target.value })}
                            style={{fontSize:30}}
                        />
                        <button type="submit" style={{fontSize:30}}>로그인</button>
                        <hr />
                        <button type="button" onClick={() => setShow(true)} style={{fontSize:30}}>회원가입</button>
                    </form>
                </div>
            </div>

            {/* 회원가입 모달 */}
            <Modal
                show={show}
                onHide={() => setShow(false)}
                centered
                dialogClassName="login-modal-dialog"
                contentClassName="login-modal-content"
            >
                <Modal.Header closeButton>
                    <Modal.Title style={{fontSize:40}}>회원가입</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* 일반/관리자 선택 버튼 */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                        <Button
                            variant={signupType === "user" ? "primary" : "outline-primary"}
                            onClick={() => setSignupType("user")}
                            style={{ marginRight: '10px',fontSize:30 }}
                        >
                            일반 회원
                        </Button>
                        <Button
                            variant={signupType === "admin" ? "danger" : "outline-danger"}
                            onClick={() => setSignupType("admin")}
                            style={{fontSize:30}}
                        >
                            관리자
                        </Button>
                    </div>

                    {/* 회원가입 폼 */}
                    <Form>
                        <Form.Group className="mb-3" style={{font:30}}>
                            <Form.Label style={{fontSize:30}}>아이디</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="아이디 입력"
                                name="id"
                                value={signupData.id}
                                onChange={handleChange}
                                style={{fontSize:30}}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label style={{fontSize:30}}>비밀번호</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="비밀번호 입력"
                                name="password"
                                value={signupData.password}
                                onChange={handleChange}
                                style={{fontSize:30}}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label style={{fontSize:30}}>이름</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="이름 입력"
                                name="username"
                                value={signupData.username || ""}
                                onChange={handleChange}
                                style={{fontSize:30}}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="login-modal-footer">
                    <Button variant="primary" onClick={handleSignup} style={{fontSize:30}}>가입</Button>
                    <Button variant="secondary" onClick={() => setShow(false)} style={{fontSize:30}}>닫기</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default LoginMobile;
