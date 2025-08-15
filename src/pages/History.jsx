import { useEffect, useState } from "react";
import { Clock, MessageSquare, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { langflowAPI } from "../services/langflowApi";
import ConfirmDialog from "../components/ConfirmDialog";

const History = () => {
  const { isDarkMode } = useTheme();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAllSessions, setShowAllSessions] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState(null);

  const openDeleteConfirm = (sessionId) => {
    setDeletingSessionId(sessionId);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    const sessionId = deletingSessionId;
    if (!sessionId) return;
    setConfirmLoading(true);
    setError("");
    try {
      const res = await langflowAPI.deleteSession(sessionId);
      if (!res.success) {
        throw new Error(res.message || `ลบไม่สำเร็จ (${res.status})`);
      }
      await loadFromApi(showAllSessions);
      setConfirmOpen(false);
      setDeletingSessionId(null);
    } catch (e) {
      setError(e.message || "ลบไม่สำเร็จ");
    } finally {
      setConfirmLoading(false);
    }
  };

  const loadFromApi = async (all = false) => {
    setIsLoading(true);
    setError("");
    try {
      const savedSettings = localStorage.getItem("lanxin-amr-settings");
      let defaultSessionId = null;
      try {
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          defaultSessionId = null;
        }
      } catch {}

      const data = await langflowAPI.getMessages({ sessionId: defaultSessionId, all });
      setIsOnline(true);
      const mapped = data
        .map((it) => {
          const ts = it.timestamp ? Date.parse(it.timestamp) || Date.now() : Date.now();
          return {
            title: (it.input || it.output || "").slice(0, 24) || "แชต",
            preview: it.input || it.output || "",
            timestamp: ts,
            raw: it,
          };
        })
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 50);
      setItems(mapped);
    } catch (e) {
      console.error("โหลดประวัติจาก API ไม่สำเร็จ:", e);
      setError(e.message || "โหลดข้อมูลไม่สำเร็จ");
      setIsOnline(false);
      // ไม่ใช้แคชเมื่อออฟไลน์: แสดงออฟไลน์อย่างเดียว
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFromApi(showAllSessions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAllSessions]);

  return (
    <div className="h-screen flex flex-col p-6">
      <div
        className={`h-full rounded-2xl shadow-xl border overflow-y-auto transition-colors duration-300 ${
          isDarkMode ? "bg-[#252626] border-gray-700/50" : "bg-white border-gray-200/50"
        }`}
      >
        <div className={`px-8 py-6 border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className={`text-xl font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
                ประวัติการสนทนา
              </h1>
              <p className={`${isDarkMode ? "text-gray-400" : "text-gray-600"} text-sm`}>ล่าสุด 50 รายการ</p>
              <div className="mt-1 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-400 animate-pulse" : "bg-red-500"}`} />
                <span className={`text-xs ${isOnline ? (isDarkMode ? "text-gray-400" : "text-gray-600") : (isDarkMode ? "text-red-300" : "text-red-600")}`}>
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className={`text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                <input
                  type="checkbox"
                  className="mr-2 align-middle"
                  checked={showAllSessions}
                  onChange={(e) => setShowAllSessions(e.target.checked)}
                />
                แสดงทุกเซสชัน (all)
              </label>
              <button
                onClick={() => loadFromApi(showAllSessions)}
                disabled={isLoading}
                className="px-3 py-2 rounded-lg text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                title="รีเฟรชจาก API"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} /> รีเฟรช
              </button>
            </div>
          </div>
          {error && (
            <div className={`mt-3 flex items-center gap-2 text-xs ${isDarkMode ? "text-yellow-300" : "text-yellow-700"}`}>
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}
        </div>

        <div className="p-6 space-y-3">
          {items.length === 0 && !isLoading && (
            <div
              className={`${
                isOnline
                  ? (isDarkMode ? "text-gray-400" : "text-gray-600")
                  : (isDarkMode ? "text-red-300" : "text-red-600")
              } text-sm`}
            >
              {isOnline ? "ยังไม่มีประวัติ" : "ออฟไลน์: ไม่สามารถเชื่อมต่อได้"}
            </div>
          )}
          {isLoading && (
            <div className={`${isDarkMode ? "text-gray-400" : "text-gray-600"} text-sm`}>กำลังโหลด...</div>
          )}
          {items.map((it, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                isDarkMode ? "border-gray-700 hover:bg-gray-800/60" : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1677FF] text-white flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className={`${isDarkMode ? "text-gray-100" : "text-gray-900"} text-sm font-medium`}>{it.title || it.preview || "แชต"}</div>
                  <div className={`${isDarkMode ? "text-gray-400" : "text-gray-500"} text-xs line-clamp-1`}>{it.preview || ""}</div>
                </div>
              </div>
              <div className={`flex items-center gap-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"} text-xs`}>
                <Clock className="w-3 h-3" />
                <span>{new Date(it.timestamp || Date.now()).toLocaleString("th-TH")}</span>
                {it.raw?.session_id && (
                  <button
                    onClick={() => openDeleteConfirm(it.raw.session_id)}
                    className={`ml-2 p-1 rounded hover:bg-red-50 text-red-600 ${isDarkMode ? "hover:bg-red-900/20" : ""}`}
                    title="ลบทั้งเซสชันนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <ConfirmDialog
          open={confirmOpen}
          title="ยืนยันการลบ"
          message="ต้องการลบประวัติของเซสชันนี้ทั้งหมดหรือไม่?"
          confirmText="ลบ"
          cancelText="ยกเลิก"
          isLoading={confirmLoading}
          onConfirm={confirmDelete}
          onCancel={() => { if (!confirmLoading) { setConfirmOpen(false); setDeletingSessionId(null); } }}
        />
      </div>
    </div>
  );
};

export default History;


