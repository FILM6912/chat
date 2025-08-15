import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // โหลดจาก localStorage หรือใช้ระบบ preference
    const saved = localStorage.getItem("lanxin-theme");
    if (saved) {
      return JSON.parse(saved);
    }

    // ใช้ system preference เป็นค่าเริ่มต้น
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    // บันทึกการตั้งค่าใน localStorage
    localStorage.setItem("lanxin-theme", JSON.stringify(isDarkMode));

    // อัปเดต document class
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDarkMode]);

  // ฟังการเปลี่ยนแปลง system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      // อัปเดตเฉพาะเมื่อไม่มีการตั้งค่าใน localStorage
      const saved = localStorage.getItem("lanxin-theme");
      if (!saved) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const value = {
    isDarkMode,
    toggleTheme,
    theme: isDarkMode ? "dark" : "light",
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
