// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Owner from "./pages/Owner";
import Main from "./components/Main";
import MainMobile from "./components/MainMobile";
import Dashboard from "./components/admins/Dashboard";
import ParkingManage from "./components/admins/ParkingManage";
import ReservationManage from "./components/admins/ReservationManage";
import ParkingSearch from "./components/admins/ParkingSearch";
import { Navigate } from "react-router-dom";
import {ParkingProvider} from "./context/ParkingContext";

// 라우팅 컴포넌트
const App = () => (
    <ParkingProvider>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Main />} />
                <Route path="/admin/*" element={<Admin />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="parkingSearch" element={<ParkingSearch />} />
                    <Route path="parking" element={<ParkingManage />} />
                    <Route path="reservation" element={<ReservationManage />} />
                </Route>
                <Route path="/login" element={<Login />} />
                <Route path="/owner" element={<Owner />} />
                <Route path="/mobile" element={<MainMobile />} />
            </Routes>
        </BrowserRouter>
    </ParkingProvider>
);

// 실제 DOM에 렌더링
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
