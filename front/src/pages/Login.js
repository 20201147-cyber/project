// src/pages/Login.js
import { useState } from "react";
import { Link } from "react-router-dom";
import { Modal, Button, Form } from "react-bootstrap";
import "../css/Login.css";

const Login = () => {
  const [show, setShow] = useState(false);

  return (
    // 2열 레이아웃 컨테이너
    <div className="login-2col">
      {/* 왼쪽: 이미지 영역 */}
      <div className="login-left">
        {/* 3장 카드 스택 */}
        <div className="photo-stack">
          <img src="/images/parkimg2.jpg" alt="이미지1" className="stack-card c1" />
          <img src="/images/parkimg3.jpg" alt="이미지2" className="stack-card c2" />
          <img src="/images/parkimg1.jpg" alt="이미지3" className="stack-card c3" />
        </div>
    </div>

      {/* 오른쪽: 기존 로그인 박스 (기존 스타일 재사용) */}
      <div className="login-right">
        <div className="login-page">
          <Link to="/">메인 페이지로</Link>
          <h1 className="logo-text">Eazypark</h1>

          <form>
            <fieldset>아이디 <input type="text" /></fieldset>
            <fieldset>비밀번호 <input type="password" /></fieldset>
            <button type="submit">로그인</button>
            <hr />
            <button type="button" onClick={() => setShow(true)}>회원가입</button>
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
          <Modal.Title>회원가입</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>아이디</Form.Label>
              <Form.Control type="text" placeholder="아이디 입력" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>비밀번호</Form.Label>
              <Form.Control type="password" placeholder="비밀번호 입력" />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="login-modal-footer">
          <Button variant="primary" onClick={() => setShow(false)}>가입</Button>
          <Button variant="secondary" onClick={() => setShow(false)}>닫기</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Login;
