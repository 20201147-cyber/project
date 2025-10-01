// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Owner from "./pages/Owner";
import Main from "./components/Main";
import MainMobile from "./components/MainMobile";
import Tmap from "./pages/Tmap";

// 라우팅 컴포넌트
const App = () => (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Main />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/login" element={<Login />} />
            <Route path="/owner" element={<Owner />} />
            <Route path="/mobile" element={<MainMobile />} />
        </Routes>
    </BrowserRouter>
);

// 실제 DOM에 렌더링
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
