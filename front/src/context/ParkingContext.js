// src/context/ParkingContext.js
import React, { createContext, useState } from "react";

export const ParkingContext = createContext();

export const ParkingProvider = ({ children }) => {
    const [visibleOnly, setVisibleOnly] = useState([]);

    return (
        <ParkingContext.Provider value={{ visibleOnly, setVisibleOnly }}>
            {children}
        </ParkingContext.Provider>
    );
};
