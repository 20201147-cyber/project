// src/context/ParkingContext.js
import React, { createContext, useState } from "react";

export const ParkingContext = createContext();

export const ParkingProvider = ({ children }) => {
    const [visibleOnly, setVisibleOnly] = useState([]);
    const [nearbyList, setNearbyList] = useState(null);
    const [nearbyOverlays, setNearbyOverlays] = useState([]); // 생성된 오버레이 목록
    return (
        <ParkingContext.Provider value={{ visibleOnly, setVisibleOnly,nearbyList,setNearbyList,nearbyOverlays,setNearbyOverlays }}>
            {children}
        </ParkingContext.Provider>
    );
};
