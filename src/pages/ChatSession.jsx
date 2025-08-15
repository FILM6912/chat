import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Bot, User, AlertCircle, Loader2, Send, Mic, MicOff, Command } from "lucide-react";
import MarkdownMessage from "../components/MarkdownMessage";
import ToolUsageDisplay from "../components/ToolUsageDisplay";
import { useTheme } from "../contexts/ThemeContext";
import { langflowAPI } from "../services/langflowApi";
import VoiceModal from "../components/VoiceModal";
import useVoiceCommand from "../hooks/useVoiceCommand";

const ChatSession = ({ overrideSessionId }) => {
  const params = useParams();
  const sessionId = overrideSessionId ?? params.sessionId;
  const { isDarkMode } = useTheme();
  const [isOnline, setIsOnline] = useState(() => {
    try {
      return localStorage.getItem("lanxin-online") !== "false";
    } catch {
      return true;
    }
  });
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const voiceCommand = useVoiceCommand();
  const aiName = (langflowAPI.settings && langflowAPI.settings.aiName) ? langflowAPI.settings.aiName : "AMR Assistant";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ฟังสถานะการเชื่อมต่อจาก Sidebar/Layout
  useEffect(() => {
    const handler = (e) => {
      const online = !!(e?.detail?.isOnline);
      setIsOnline(online);
    };
    window.addEventListener("lanxin:connection-status", handler);
    return () => window.removeEventListener("lanxin:connection-status", handler);
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setError("");
        const items = await langflowAPI.getSessionMessages(sessionId);
        if (!mounted) return;
        if (items.length === 0) {
          const aiName = langflowAPI.settings?.aiName || "AMR Assistant";
          setMessages([
            {
              id: 1,
              type: "assistant",
              content: `สวัสดี ฉันคือ ${aiName} มีอะไรให้ช่วยไหม?`,
              timestamp: new Date(),
            },
          ]);
        } else {
          setMessages(items);
        }
      } catch (e) {
        console.error("โหลดแชตเซสชันล้มเหลว:", e);
        if (!mounted) return;
        setError(e.message || "โหลดข้อมูลไม่สำเร็จ");
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  // เมื่อได้ผลจาก voice ให้เติมลงช่องอินพุตและส่งทันทีเหมือนหน้า Chat
  useEffect(() => {
    if (voiceCommand.voiceResult) {
      const transcript = voiceCommand.consumeVoiceResult();
      if (transcript.trim()) {
        setInputValue(transcript);
        setTimeout(() => handleSendMessage({ preventDefault: () => {} }), 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceCommand.voiceResult]);

  const formatTime = (date) => {
    try {
      return new Date(date).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const content = inputValue;
    if (!content.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError("");

    try {
      const assistantId = Date.now() + 1;
      const assistantPlaceholder = {
        id: assistantId,
        type: "assistant",
        content: "",
        contentBlocks: null,
        typing: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantPlaceholder]);

      let accumulated = "";

      const final = await langflowAPI.sendMessageStream(content, sessionId, (chunk) => {
        if (typeof chunk === "string") {
          if (chunk.trim() === content.trim()) return;
          accumulated = chunk;
        } else if (chunk && typeof chunk === "object") {
          if (typeof chunk.text === "string") {
            if (chunk.text.trim() === content.trim()) return;
            accumulated = chunk.text;
          }
          if (Array.isArray(chunk.contentBlocks) && chunk.contentBlocks.length > 0) {
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, contentBlocks: chunk.contentBlocks } : m)));
          } else if (Array.isArray(chunk.tools) && chunk.tools.length > 0) {
            const syntheticBlocks = [
              {
                title: "Agent Steps",
                contents: chunk.tools.map((t) => ({ type: "tool_use", name: t.name, tool_input: t.input, output: t.output })),
              },
            ];
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, contentBlocks: syntheticBlocks } : m)));
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: typeof accumulated === "string" && accumulated.length > 0 ? accumulated : m.content,
                  typing: !(typeof accumulated === "string" && accumulated.length > 0),
                }
              : m
          )
        );
      });

      if (final && typeof final === "object") {
        const contentText = final.text || accumulated;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId) return m;
            const hasFinalBlocks = Array.isArray(final.content_blocks) && final.content_blocks.length > 0;
            return {
              ...m,
              content: contentText,
              contentBlocks: hasFinalBlocks ? final.content_blocks : m.contentBlocks || null,
              typing: false,
            };
          })
        );
        // แจ้ง Sidebar ให้รีเฟรช preview/เวลาแบบ real-time
        try {
          const title = messages.find((m) => m.type === "user")?.content?.slice(0, 24) || userMessage.content.slice(0, 24) || "แชต";
          const preview = userMessage.content.slice(0, 80);
          window.dispatchEvent(
            new CustomEvent("lanxin:session-updated", {
              detail: { sessionId, title, preview, timestamp: Date.now() },
            })
          );
        } catch {}
      }
    } catch (err) {
      console.error("Error sending message:", err);
      const friendly = /ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้/.test(err?.message || "")
        ? "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้"
        : (err?.message || "เกิดข้อผิดพลาด");
      setError(friendly);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          type: "assistant",
          content: friendly,
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <div className={`h-full flex flex-col transition-colors duration-300 ${isDarkMode ? "bg-gradient-to-br from-[#0b1220] via-[#131a2a] to-[#0b1220]" : "bg-gradient-to-br from-[#f8fbff] via-white to-[#eef2ff]"}`}>
        {/* Header (แสดงชื่อห้อง/ปุ่ม Voice Command เหมือนหน้า Chat) */}
        <div
          className={`px-6 py-4 border-b transition-colors duration-300 ${
            isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[#1677FF] rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>{aiName}</h2>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-400 animate-pulse" : "bg-red-500"}`} />
                  <p className={`text-sm ${
                    isOnline
                      ? (isDarkMode ? "text-gray-400" : "text-gray-500")
                      : (isDarkMode ? "text-red-300" : "text-red-600")
                  }`}>
                    {isOnline ? `Session: ${sessionId}` : "Offline: ไม่สามารถเชื่อมต่อได้"}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={voiceCommand.openVoiceModal}
              className="px-3 py-2 bg-[#1677FF] text-white rounded-full text-xs font-medium hover:bg-[#0f5fd4] transition-all duration-200 flex items-center space-x-2 shadow-lg"
            >
              <Command className="w-4 h-4" />
              <span>Voice Command</span>
              <kbd className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-[10px]">Space</kbd>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex items-start space-x-3 max-w-[80%] ${message.type === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === "user" ? "bg-[#1677FF]" : "bg-[#1677FF]"}`}>
                  {message.type === "user" ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                </div>
                <div className="space-y-2">
                  {message.type === "assistant" && message.contentBlocks && (
                    <div className="max-w-full">
                      <ToolUsageDisplay contentBlocks={message.contentBlocks} />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 transition-colors duration-300 shadow-md ${
                      message.type === "user" ? "animate-slideInRight" : "animate-slideInLeft"
                    } ${
                      message.type === "user"
                        ? "bg-[#1677FF] text-white"
                        : message.isError
                        ? isDarkMode
                          ? "bg-red-900/30 text-red-200 border border-red-800/50"
                          : "bg-red-50 text-red-900 border border-red-200"
                        : isDarkMode
                        ? "bg-gray-700/70 text-gray-100 border border-gray-600 backdrop-blur"
                        : "bg-white/80 text-gray-900 border border-gray-200 backdrop-blur"
                    }`}
                  >
                    {message.type === "user" ? (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    ) : message.typing ? (
                      <div className="text-sm leading-relaxed">
                        <div className="mb-1 flex items-center gap-2">
                          <span>{message.content}</span>
                          <span className="ti-dots text-[#1677FF]">
                            <span className="ti-dot"></span>
                            <span className="ti-dot"></span>
                            <span className="ti-dot"></span>
                            <span className="ti-dot"></span>
                          </span>
                        </div>
                        <div className="ti-shimmer" />
                      </div>
                    ) : (
                      <MarkdownMessage content={message.content} isError={message.isError} />
                    )}
                    <p
                      className={`text-xs mt-1 ${
                        message.type === "user"
                          ? "text-blue-100"
                          : isDarkMode
                          ? "text-gray-500"
                          : "text-gray-400"
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className={`px-6 py-3 border-t ${isDarkMode ? "bg-red-900/20 border-red-800/50" : "bg-red-50 border-red-200"}`}>
            <div className={`flex items-center space-x-2 text-sm ${isDarkMode ? "text-red-300" : "text-red-700"}`}>
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div
          className={`px-6 py-4 border-t transition-colors duration-300 ${
            isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
          }`}
        >
          <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="พิมพ์ข้อความของคุณที่นี่..."
                className={`w-full px-4 py-3 pr-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#1677FF] focus:border-transparent transition-colors duration-300 ${
                  isDarkMode
                    ? "border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400"
                    : "border-gray-200 bg-white text-gray-900 placeholder-gray-500"
                }`}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={voiceCommand.isRecording ? voiceCommand.stopRecording : voiceCommand.startRecording}
                disabled={isLoading}
                title={voiceCommand.isRecording ? "คลิกเพื่อหยุดการบันทึกเสียง" : "คลิกเพื่อเริ่มการบันทึกเสียง"}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  voiceCommand.isRecording
                    ? "bg-red-100 text-red-600 hover:bg-red-200 animate-pulse"
                    : isDarkMode
                    ? "text-gray-400 hover:text-gray-300 hover:bg-gray-600"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
              >
                {voiceCommand.isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-6 py-3 bg-[#1677FF] text-white rounded-xl font-medium hover:bg-[#0f5fd4] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>ส่ง</span>
            </button>
          </form>
        </div>

        {/* Voice Modal */}
        <VoiceModal
          isOpen={voiceCommand.isModalOpen}
          onClose={voiceCommand.closeVoiceModal}
          isRecording={voiceCommand.isRecording}
          interimText={voiceCommand.interimText}
          finalText={voiceCommand.finalText}
          onStartRecording={voiceCommand.startRecording}
          onStopRecording={voiceCommand.stopRecording}
          error={voiceCommand.error}
        />
      </div>
    </div>
  );
};

export default ChatSession;


