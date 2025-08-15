import { useMemo } from "react";
import ChatSession from "./ChatSession";

// หน้าสำหรับเริ่มแชตใหม่ แต่ UI และพฤติกรรมเหมือนห้องจากประวัติ
// จะสร้าง session ใหม่แล้วส่งให้ ChatSession ใช้งานต่อ
const NewChat = () => {
  const newSessionId = useMemo(() => `chat_${Date.now()}`, []);

  // ยิงอีเวนต์ให้ Sidebar ทราบว่ามีห้องใหม่แบบ real-time
  try {
    window.dispatchEvent(
      new CustomEvent("lanxin:new-session", {
        detail: { sessionId: newSessionId, title: "แชตใหม่", preview: "", timestamp: Date.now() },
      })
    );
  } catch {}

  return <ChatSession overrideSessionId={newSessionId} />;
};

export default NewChat;


