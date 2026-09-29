"use client";
import { createContext, useContext, useState, useEffect } from "react";

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [selectedLocation, setSelectedLocationState] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("selectedLocation");
      if (stored) setSelectedLocationState(JSON.parse(stored));
    } catch {}
  }, []);

  const setSelectedLocation = (location) => {
    setSelectedLocationState(location);
    if (location) localStorage.setItem("selectedLocation", JSON.stringify(location));
    else localStorage.removeItem("selectedLocation");
  };

  return (
    <LocationContext.Provider value={{ selectedLocation, setSelectedLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useSelectedLocation = () => useContext(LocationContext);
