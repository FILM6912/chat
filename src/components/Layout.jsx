import { Outlet, Link, useLocation } from "react-router-dom";
import { MessageCircle, Settings, Bot, Sun, Moon, Trash2, Plus, History, Sparkles, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useEffect, useState } from "react";
import { langflowAPI } from "../services/langflowApi";
import ConfirmDialog from "./ConfirmDialog";

const Layout = () => {
  const location = useLocation();
  const { isDarkMode, toggleTheme } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("lanxin-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  
  const openDeleteConfirm = (sessionId) => {
    if (!sessionId) return;
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
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      setConfirmOpen(false);
      setDeletingSessionId(null);
    } catch (e) {
      setError(e.message || "ลบไม่สำเร็จ");
    } finally {
      setConfirmLoading(false);
    }
  };

  const loadSessions = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await langflowAPI.listSessions(Number.POSITIVE_INFINITY);
      const sorted = Array.isArray(list)
        ? [...list].sort((a, b) => (b?.timestamp || 0) - (a?.timestamp || 0))
        : [];
      setSessions(sorted);
      setIsOnline(true);
      try {
        localStorage.setItem("lanxin-online", "true");
        window.dispatchEvent(new CustomEvent("lanxin:connection-status", { detail: { isOnline: true } }));
      } catch {}
    } catch (e) {
      setError(e.message || "โหลดประวัติไม่สำเร็จ");
      setIsOnline(false);
      try {
        localStorage.setItem("lanxin-online", "false");
        window.dispatchEvent(new CustomEvent("lanxin:connection-status", { detail: { isOnline: false } }));
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem("lanxin-sidebar-collapsed", isCollapsed ? "true" : "false");
    } catch {}
  }, [isCollapsed]);

  useEffect(() => {
    const onNewSession = (evt) => {
      const detail = evt?.detail || {};
      if (detail?.sessionId) {
        setSessions((prev) => {
          const exists = prev.some((s) => s.session_id === detail.sessionId);
          if (exists) return prev;
          const optimistic = {
            session_id: detail.sessionId,
            title: detail.title || "แชต",
            preview: detail.preview || "",
            timestamp: detail.timestamp || Date.now(),
          };
          return [optimistic, ...prev]
            .sort((a, b) => (b?.timestamp || 0) - (a?.timestamp || 0));
        });
      }
      loadSessions();
    };
    const onSessionUpdated = () => {
      loadSessions();
    };
    window.addEventListener("lanxin:new-session", onNewSession);
    window.addEventListener("lanxin:session-updated", onSessionUpdated);
    return () => {
      window.removeEventListener("lanxin:new-session", onNewSession);
      window.removeEventListener("lanxin:session-updated", onSessionUpdated);
    };
  }, []);

  const getAIName = () => {
    try {
      const saved = localStorage.getItem("lanxin-amr-settings");
      return saved ? (JSON.parse(saved).aiName || "AMR Assistant") : "AMR Assistant";
    } catch {
      return "AMR Assistant";
    }
  };

  return (
    <div className={`min-h-screen flex transition-all duration-500 ${
      isDarkMode 
        ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" 
        : "bg-gradient-to-br from-gray-50 via-white to-blue-50"
    }`}>
      {/* Elegant Sidebar */}
      <aside className={`${isCollapsed ? "w-20" : "w-80"} min-h-screen relative transition-all duration-500 ${
        isDarkMode 
          ? "bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50" 
          : "bg-white/95 backdrop-blur-xl border-r border-gray-200/50"
      } shadow-xl`}>
        
        {/* Subtle gradient overlay */}
        <div className={`absolute inset-0 ${
          isDarkMode 
            ? "bg-gradient-to-b from-blue-900/10 to-purple-900/10" 
            : "bg-gradient-to-b from-blue-50/50 to-purple-50/30"
        } pointer-events-none`} />
        
        <div className="flex flex-col h-full relative z-10">
          
          {/* Header */}
          <div className={`p-5 border-b transition-colors duration-300 ${
            isDarkMode ? "border-slate-700/50" : "border-gray-200/50"
          }`}>
            <div className="flex items-center justify-between">
              
              {/* Logo Section */}
              <div className={`flex items-center ${isCollapsed ? "flex-1 justify-center -translate-x-1.5" : "gap-4"}`}>
                <div className="relative">
                  <button
                    onClick={() => { if (isCollapsed) setIsCollapsed(false); }}
                    className={`bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400/60 transition-all duration-300 ${
                      isCollapsed ? "w-12 h-12 rounded-xl" : "w-12 h-12 rounded-xl"
                    }`}
                    title={isCollapsed ? "ขยายแถบข้าง" : undefined}
                  >
                    <Bot className="w-6 h-6 text-white" />
                  </button>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
                </div>
                
                {!isCollapsed && (
                  <div>
                    <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {getAIName()}
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${
                        isOnline ? "bg-green-400 animate-pulse" : "bg-red-400"
                      }`} />
                      <p className={`text-sm ${
                        isOnline 
                          ? (isDarkMode ? "text-slate-400" : "text-gray-500") 
                          : (isDarkMode ? "text-red-300" : "text-red-600")
                      }`}>
                        {isOnline ? "Online" : "Offline"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Collapse Button */}
              {!isCollapsed && (
                <button
                  onClick={() => setIsCollapsed(true)}
                  className={`p-2 rounded-lg border transition-all duration-300 hover:scale-105 ${
                    isDarkMode
                      ? "bg-gray-800/80 border-gray-700 text-gray-200 hover:bg-gray-700/80"
                      : "bg-white/80 border-gray-200 text-gray-700 hover:bg-gray-100/80"
                  }`}
                  title="ย่อแถบข้าง"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <Link
              to="/"
              className={`group w-full flex items-center transition-all duration-300 hover:scale-[1.02] ${
                isCollapsed
                  ? "justify-center p-3 rounded-xl"
                  : "gap-3 px-4 py-3 rounded-xl"
              } text-sm font-medium ${
                location.pathname === "/"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                  : (isDarkMode
                      ? "text-slate-300 hover:text-white hover:bg-slate-800/60 border border-slate-700/50 hover:border-slate-600/50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 border border-gray-200/50 hover:border-gray-300/50")
              }`}
              title={isCollapsed ? "แชตใหม่" : undefined}
            >
              <div className={`p-1.5 rounded-lg ${
                location.pathname === "/"
                  ? "bg-white/20"
                  : "bg-blue-500/10 group-hover:bg-blue-500/20"
              } transition-colors`}>
                <Plus className="w-4 h-4" />
              </div>
              {!isCollapsed && (
                <>
                  <span>เริ่มการสนทนาใหม่</span>
                  <Sparkles className="w-4 h-4 ml-auto opacity-60 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </Link>
          </div>

          {/* History Section */}
          <div className="px-4 pb-4 flex-1 overflow-y-auto">
            
            {/* History Header */}
            {!isCollapsed && (
              <div className={`flex items-center gap-2 px-3 py-2 mb-3 text-xs uppercase tracking-wider font-semibold ${
                isDarkMode ? "text-slate-400" : "text-gray-500"
              }`}>
                <History className="w-3 h-3" />
                <span>ประวัติการสนทนา</span>
              </div>
            )}
            
            {/* Sessions List */}
            <div className="space-y-2">
              
              {/* Loading State */}
              {loading && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                  {!isCollapsed && (
                    <span className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                      กำลังโหลด...
                    </span>
                  )}
                </div>
              )}
              
              {/* Error State */}
              {error && (
                <Link
                  to="/history"
                  className={`block px-4 py-3 rounded-xl text-sm transition-all duration-300 hover:scale-[1.02] ${
                    isDarkMode 
                      ? "text-amber-300 hover:bg-amber-900/20 border border-amber-800/30" 
                      : "text-amber-700 hover:bg-amber-50 border border-amber-200/50"
                  }`}
                >
                  {isCollapsed ? "⚠️" : "⚠️ ไม่สามารถโหลดจาก API ได้ คลิกเพื่อดูทั้งหมด"}
                </Link>
              )}
              
              {/* Session Items */}
              {sessions.slice(0, 8).map((s, index) => (
                <div
                  key={s.session_id}
                  className="group relative animate-fadeInUp"
                  style={{animationDelay: `${index * 0.05}s`}}
                >
                  {isCollapsed ? (
                    // Collapsed Session Item
                    <>
                      <Link
                        to={`/chat/${encodeURIComponent(s.session_id)}`}
                        className={`w-full flex items-center justify-center p-3 rounded-xl transition-all duration-300 hover:scale-105 ${
                          isDarkMode 
                            ? "text-slate-300 hover:bg-slate-800/60 border border-slate-700/30" 
                            : "text-gray-700 hover:bg-gray-50 border border-gray-200/30"
                        }`}
                        title={s.title}
                      >
                        <MessageCircle className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDeleteConfirm(s.session_id); }}
                        className={`absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all duration-300 ${
                          isDarkMode ? "text-slate-400 hover:text-red-400 hover:bg-red-900/20" : "text-gray-500 hover:text-red-600 hover:bg-red-50"
                        }`}
                        title="ลบเซสชันนี้"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    // Expanded Session Item
                    <>
                      <Link
                        to={`/chat/${encodeURIComponent(s.session_id)}`}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-300 hover:scale-[1.02] ${
                          isDarkMode 
                            ? "text-slate-300 hover:bg-slate-800/60 hover:shadow-lg border border-slate-700/30 hover:border-slate-600/50" 
                            : "text-gray-700 hover:bg-gray-50 hover:shadow-md border border-gray-200/30 hover:border-gray-300/50"
                        }`}
                        title={s.preview}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{s.title}</div>
                          <div className={`flex items-center gap-2 mt-1 text-xs ${
                            isDarkMode ? "text-slate-500" : "text-gray-500"
                          }`}>
                            <MessageCircle className="w-3 h-3" />
                            <span>{new Date(s.timestamp).toLocaleString("th-TH", {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                        </div>
                      </Link>
                      <button
                        onClick={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          openDeleteConfirm(s.session_id); 
                        }}
                        className={`absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all duration-300 hover:scale-110 ${
                          isDarkMode 
                            ? "text-slate-400 hover:text-red-400 hover:bg-red-900/20" 
                            : "text-gray-500 hover:text-red-600 hover:bg-red-50"
                        }`}
                        title="ลบเซสชันนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className={`p-4 border-t transition-colors duration-300 ${
            isDarkMode ? "border-slate-700/50" : "border-gray-200/50"
          }`}>
            <div className={`${isCollapsed ? "flex flex-col items-center gap-3" : "flex items-center gap-2"}`}>
              
              {/* Settings Link */}
              <Link
                to="/settings"
                className={`${isCollapsed ? "flex-none" : "flex-1"} flex items-center ${
                  isCollapsed ? "justify-center p-3 rounded-xl" : "gap-3 px-4 py-3 rounded-xl"
                } text-sm font-medium transition-all duration-300 hover:scale-[1.02] ${
                  location.pathname === "/settings"
                    ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg"
                    : isDarkMode
                    ? "text-slate-300 hover:text-white hover:bg-slate-800/60 border border-slate-700/50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 border border-gray-200/50"
                }`}
                title={isCollapsed ? "ตั้งค่า" : undefined}
              >
                <Settings className="w-4 h-4" />
                {!isCollapsed && <span>ตั้งค่า</span>}
              </Link>
              
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 group ${
                  isDarkMode 
                    ? "text-slate-300 hover:bg-slate-800/60 border border-slate-700/50" 
                    : "text-gray-600 hover:bg-gray-100/80 border border-gray-200/50"
                }`}
                title={isDarkMode ? "โหมดสว่าง" : "โหมดมืด"}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                ) : (
                  <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform duration-300" />
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen relative">
        <div className={`absolute inset-0 ${
          isDarkMode 
            ? "bg-gradient-to-br from-slate-900/50 to-slate-800/50" 
            : "bg-gradient-to-br from-white/50 to-blue-50/50"
        } pointer-events-none`} />
        <div className="relative z-10">
          <Outlet />
        </div>
      </main>
      
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
  );
};

export default Layout;