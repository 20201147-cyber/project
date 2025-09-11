// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import KaKaoMap from "./KaKaoMap";
import Admin from "./pages/Admin";
import Login from "./pages/Login";

// 라우팅 컴포넌트
const App = () => (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<KaKaoMap />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/login" element={<Login />} />
        </Routes>
    </BrowserRouter>
);

// 실제 DOM에 렌더링
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
