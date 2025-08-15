import { useState, useRef, useEffect } from "react";
import {
  Send,
  Mic,
  MicOff,
  Loader2,
  User,
  Bot,
  AlertCircle,
  Command,
} from "lucide-react";
import MarkdownMessage from "../components/MarkdownMessage";
import ToolUsageDisplay from "../components/ToolUsageDisplay";
import VoiceModal from "../components/VoiceModal";
import FloatingVoiceButton from "../components/FloatingVoiceButton";
import useVoiceCommand from "../hooks/useVoiceCommand";
import { useTheme } from "../contexts/ThemeContext";
import { langflowAPI } from "../services/langflowApi";
import { speechToTextService } from "../services/speechToText";

const Chat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "assistant",
      content: (() => {
        try {
          const saved = localStorage.getItem("lanxin-amr-settings");
          const aiName = saved ? (JSON.parse(saved).aiName || "AMR Assistant") : "AMR Assistant";
          return `สวัสดี ฉันคือ ${aiName} มีอะไรให้ช่วยไหม?`;
        } catch {
          return "สวัสดี ฉันคือ AMR Assistant มีอะไรให้ช่วยไหม?";
        }
      })(),
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [voiceActivationMode, setVoiceActivationMode] = useState(() => {
    try {
      const saved = localStorage.getItem("lanxin-amr-settings");
      return saved ? (JSON.parse(saved).voiceActivationMode || "wake_word") : "wake_word";
    } catch {
      return "wake_word";
    }
  });
  const [alwaysListening, setAlwaysListening] = useState(() => {
    try {
      const saved = localStorage.getItem("lanxin-amr-settings");
      const mode = saved ? (JSON.parse(saved).voiceActivationMode || "wake_word") : "wake_word";
      return mode === "wake_word";
    } catch {
      return true;
    }
  });
  const [voiceStreamingActive, setVoiceStreamingActive] = useState(false);
  const [voiceStreamingText, setVoiceStreamingText] = useState("");
  const lastAutoSentRef = useRef("");
  const voiceActiveRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const [chatId] = useState(() => {
    const id = `chat_${Date.now()}`;
    // แจ้ง Sidebar แบบ real-time ว่ามีเซสชันใหม่
    try {
      const title = "แชตใหม่";
      const preview = "";
      window.dispatchEvent(
        new CustomEvent("lanxin:new-session", {
          detail: { sessionId: id, title, preview, timestamp: Date.now() },
        })
      );
    } catch {}
    return id;
  }); // สร้าง unique chat ID สำหรับแชตใหม่
  const messagesEndRef = useRef(null);

  // Voice command hook (เปิดเฉพาะโหมด spacebar)
  const voiceCommand = useVoiceCommand(voiceActivationMode === "spacebar");

  // Theme hook
  const { isDarkMode } = useTheme();
  const [isOnline, setIsOnline] = useState(() => {
    try {
      return localStorage.getItem("lanxin-online") !== "false";
    } catch {
      return true;
    }
  });

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

  // Handle voice command results (เฉพาะโหมด spacebar)
  useEffect(() => {
    if (voiceActivationMode !== "spacebar") return;
    if (voiceCommand.voiceResult) {
      const transcript = voiceCommand.consumeVoiceResult();
      if (transcript.trim()) {
        setInputValue(transcript);
        setTimeout(() => {
          const fakeEvent = { preventDefault: () => {} };
          handleSendMessage(fakeEvent, transcript);
        }, 100);
      }
    }
  }, [voiceCommand.voiceResult, voiceActivationMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ฟังไมค์แบบค้างและสตรีมข้อความเมื่อพบคำกระตุ้น (AI/เอไอ/ชื่อ AI)
  useEffect(() => {
    const getAiName = () => {
      try {
        const saved = localStorage.getItem("lanxin-amr-settings");
        return saved ? (JSON.parse(saved).aiName || "AMR Assistant") : "AMR Assistant";
      } catch {
        return "AMR Assistant";
      }
    };

    const stripWakeWords = (text) => {
      if (!text) return "";
      const aiName = (getAiName() || "");
      let out = text.replace(/\bai\b/gi, "").replace(/เอไอ/gi, "");
      if (aiName) {
        const re = new RegExp(aiName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        out = out.replace(re, "");
      }
      return out.replace(/\s{2,}/g, " ").trim();
    };

    const shouldAutoSend = (text) => {
      if (!text) return false;
      const t = text.toLowerCase();
      const aiName = (getAiName() || "").toLowerCase();
      const hasAiWord = /ai/i.test(t) || /a\s*i/i.test(t) || t.includes("เอไอ") || t.includes("เอ ไอ");
      const hasName = aiName ? t.includes(aiName) : false;
      return hasAiWord || hasName;
    };

    const handleFinal = (finalText) => {
      if (!finalText || !finalText.trim()) return;
      const gated = voiceActiveRef.current || shouldAutoSend(finalText) || voiceStreamingActive;
      if (!gated) return;
      let toSend = voiceActiveRef.current || voiceStreamingActive ? stripWakeWords(finalText) : finalText;
      toSend = toSend.trim();
      if (!toSend) return;
      if (lastAutoSentRef.current === toSend) return;
      lastAutoSentRef.current = toSend;
      setInputValue(toSend);
      setVoiceStreamingActive(false);
      voiceActiveRef.current = false;
      setVoiceStreamingText("");
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} };
        handleSendMessage(fakeEvent, toSend);
      }, 50);
    };

    if (!alwaysListening || voiceActivationMode !== "wake_word") {
      // หยุดฟังแบบค้าง
      try { speechToTextService.stopContinuousListening(); } catch {}
      setIsRecording(false);
      return;
    }

    try {
      speechToTextService.startContinuousListening(
        (data) => {
          const interim = data.interim || "";
          const triggered = shouldAutoSend(interim) || shouldAutoSend(data.final || "");
          if (!voiceActiveRef.current && triggered) {
            voiceActiveRef.current = true;
            setVoiceStreamingActive(true);
          }
          if (voiceActiveRef.current) {
            const display = stripWakeWords(interim);
            setVoiceStreamingText(display);
            setInputValue(display);
            // รีเซ็ตตัวจับเวลาความเงียบทุกครั้งที่มีอินพุตใหม่
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            const silenceSec = (() => {
              try {
                const saved = localStorage.getItem("lanxin-amr-settings");
                const s = saved ? JSON.parse(saved).silenceSeconds : 1.5;
                return Number.isFinite(s) ? s : 1.5;
              } catch {
                return 1.5;
              }
            })();
            silenceTimerRef.current = setTimeout(() => {
              // เมื่อเงียบครบกำหนด ถือว่าจบประโยคและส่งทันที
              handleFinal(display || interim);
            }, Math.max(300, silenceSec * 1000));
          }
        },
        (finalText) => {
          handleFinal(finalText);
        },
        () => {
          setIsRecording(true);
        }
      );
    } catch (e) {
      console.error("Continuous listening error:", e);
      setError(e.message);
    }

    return () => {
      try { speechToTextService.stopContinuousListening(); } catch {}
      setIsRecording(false);
      setVoiceStreamingActive(false);
      voiceActiveRef.current = false;
      setVoiceStreamingText("");
    };
  }, [alwaysListening, voiceActivationMode]);

  const handleSendMessage = async (e, messageContent = null) => {
    if (e) e.preventDefault();
    const content = messageContent || inputValue;
    if (!content.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: content,
      timestamp: new Date(),
    };

    // แสดงเฉพาะฝั่งขวา (user) ปกติ ไม่ยุ่งกับฝั่งซ้าย (agent)
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

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

      const final = await langflowAPI.sendMessageStream(
        content,
        chatId,
        (chunk) => {
          // รองรับทั้ง string และ object { text, tools, contentBlocks }
          if (typeof chunk === "string") {
            // กรองกรณี agent echo ข้อความผู้ใช้มาเป็นชิ้นแรก
            if (chunk.trim() === content.trim()) {
              return;
            }
            // แทนค่าทั้งหมดด้วยชิ้นล่าสุด (ไม่บวกต่อ)
            accumulated = chunk;
          } else if (chunk && typeof chunk === "object") {
            if (typeof chunk.text === "string") {
              // กรองกรณี agent echo ข้อความผู้ใช้มาเป็นชิ้นแรก/อัปเดต
              if (chunk.text.trim() === content.trim()) {
                return;
              }
              // ใช้ snapshot ล่าสุดเสมอ (ไม่บวกต่อ)
              accumulated = chunk.text;
            }
            if (Array.isArray(chunk.contentBlocks) && chunk.contentBlocks.length > 0) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, contentBlocks: chunk.contentBlocks } : m
                )
              );
            } else if (Array.isArray(chunk.tools) && chunk.tools.length > 0) {
              // สร้าง content_blocks แบบง่ายเพื่อให้ ToolUsageDisplay แสดงได้
              const syntheticBlocks = [
                {
                  title: "Agent Steps",
                  contents: chunk.tools.map((t) => ({
                    type: "tool_use",
                    name: t.name,
                    tool_input: t.input,
                    output: t.output,
                  })),
                },
              ];
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, contentBlocks: syntheticBlocks } : m
                )
              );
            }
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    // ถ้ามีข้อความจริงแล้ว ใช้ข้อความจริง ไม่งั้นแสดงกำลัง gen + อนิเมชันจุดไข่ปลา
                    content:
                      typeof accumulated === "string" && accumulated.length > 0
                        ? accumulated
                        : m.content,
                    typing: !(typeof accumulated === "string" && accumulated.length > 0),
                  }
                : m
            )
          );
        }
      );

      if (final && typeof final === "object") {
        const contentText = final.text || accumulated;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId) return m;
            const hasFinalBlocks = Array.isArray(final.content_blocks) && final.content_blocks.length > 0;
            return {
              ...m,
              content: contentText,
              // อย่าล้าง tool blocks ถ้าไม่มี content_blocks จากปลายทางตอนจบ
              contentBlocks: hasFinalBlocks ? final.content_blocks : m.contentBlocks || null,
              typing: false,
            };
          })
        );
        // แจ้ง Sidebar ว่า session นี้มีการอัปเดต (ให้ refresh รายการและ preview)
        try {
          const title = messages.find((m) => m.type === "user")?.content?.slice(0, 24) || content.slice(0, 24) || "แชต";
          const preview = content.slice(0, 80);
          window.dispatchEvent(
            new CustomEvent("lanxin:session-updated", {
              detail: { sessionId: chatId, title, preview, timestamp: Date.now() },
            })
          );
        } catch {}
        // หากไม่ได้ระบุว่าเป็นจบสตรีม แต่ response ไม่มี content_blocks เลย ให้เก็บของเดิมไว้ (ทำแล้วด้านบน)
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const friendly = /ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้/.test(error?.message || "")
        ? "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้"
        : (error?.message || "เกิดข้อผิดพลาด");
      setError(friendly);

      // แสดงข้อความแสดงข้อผิดพลาดแบบสั้นและชัดเจน
      const errorMessage = {
        id: Date.now() + 1,
        type: "assistant",
        content: friendly,
        timestamp: new Date(),
        isError: true,
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceToggle = async () => {
    setError(null);
    if (voiceActivationMode === "spacebar") {
      try { voiceCommand.openVoiceModal(); } catch {}
      return;
    }
    if (alwaysListening) {
      try { speechToTextService.stopContinuousListening(); } catch {}
      setAlwaysListening(false);
      setIsRecording(false);
      setVoiceStreamingActive(false);
      voiceActiveRef.current = false;
      setVoiceStreamingText("");
    } else {
      setAlwaysListening(true);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-screen flex flex-col">
      <div
        className={`h-full flex flex-col transition-colors duration-300 ${
          isDarkMode
            ? "bg-gradient-to-br from-[#0b1220] via-[#131a2a] to-[#0b1220]"
            : "bg-gradient-to-br from-[#f8fbff] via-white to-[#eef2ff]"
        }`}
      >
        {/* Chat Header */}
        <div
          className={`px-6 py-4 border-b transition-colors duration-300 ${
            isDarkMode
              ? "border-gray-700 bg-gray-800"
              : "border-gray-200 bg-white"
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#1677FF] rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2
                className={`font-semibold transition-colors duration-300 ${
                  isDarkMode ? "text-gray-100" : "text-gray-900"
                }`}
              >
                {(() => {
                  try {
                    const saved = localStorage.getItem("lanxin-amr-settings");
                    return saved ? (JSON.parse(saved).aiName || "AMR Assistant") : "AMR Assistant";
                  } catch {
                    return "AMR Assistant";
                  }
                })()}
              </h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-400 animate-pulse" : "bg-red-500"}`} />
                <p
                  className={`text-sm transition-colors duration-300 ${
                    isOnline
                      ? (isDarkMode ? "text-gray-400" : "text-gray-500")
                      : (isDarkMode ? "text-red-300" : "text-red-600")
                  }`}
                >
                  {isOnline ? "Online และพร้อมช่วยเหลือ" : "Offline: ไม่สามารถเชื่อมต่อได้"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex items-start space-x-3 max-w-[80%] ${
                  message.type === "user"
                    ? "flex-row-reverse space-x-reverse"
                    : ""
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === "user" ? "bg-[#1677FF]" : "bg-[#1677FF]"
                  }`}
                >
                  {message.type === "user" ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Message Container */}
                <div className="space-y-2">
                  {/* Tool Usage Display - แสดงข้างบนสำหรับ assistant message ที่มี contentBlocks */}
                  {message.type === "assistant" && message.contentBlocks && (
                    <div className="max-w-full">
                      <ToolUsageDisplay contentBlocks={message.contentBlocks} />
                    </div>
                  )}

                  {/* Message Bubble */}
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
                      className={`text-xs mt-1 transition-colors duration-300 ${
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

          {/* Loading indicator ถูกปิดตามคำขอ */}
          <div ref={messagesEndRef} />
        </div>

        {/* Error Display */}
        {error && (
          <div
            className={`px-6 py-3 border-t transition-colors duration-300 ${
              isDarkMode
                ? "bg-red-900/20 border-red-800/50"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div
              className={`flex items-center space-x-2 text-sm transition-colors duration-300 ${
                isDarkMode ? "text-red-300" : "text-red-700"
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className={`ml-auto transition-colors duration-300 ${
                  isDarkMode
                    ? "text-red-400 hover:text-red-300"
                    : "text-red-500 hover:text-red-700"
                }`}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Voice Command Button (ซ่อนเมื่อไมค์ค้าง) */}
        {!alwaysListening && (
          <div
            className={`px-6 py-3 border-t transition-colors duration-300 ${
              isDarkMode
                ? "border-gray-700 bg-gray-800"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center">
              <button
                onClick={voiceCommand.openVoiceModal}
                className="px-4 py-2 bg-[#1677FF] text-white rounded-full font-medium hover:bg-[#0f5fd4] transition-all duration-200 flex items-center space-x-2 shadow-lg transform hover:scale-105"
              >
                <Command className="w-4 h-4" />
                <span>Voice Command</span>
                <kbd className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                  Space
                </kbd>
              </button>
            </div>
            <p
              className={`text-xs text-center mt-1 transition-colors duration-300 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              กด Space เพื่อสั่งงานด้วยเสียงทันที หรือ Ctrl+Shift+V
            </p>
          </div>
        )}

        {/* Input Area */}
        <div
          className={`px-6 py-4 border-t transition-colors duration-300 ${
            isDarkMode
              ? "border-gray-700 bg-gray-800"
              : "border-gray-200 bg-white"
          }`}
        >
          <form
            onSubmit={handleSendMessage}
            className="flex items-center space-x-3"
          >
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
                onClick={handleVoiceToggle}
                disabled={isLoading}
                title={
                  voiceActivationMode === "spacebar"
                    ? "เปิด Voice Command"
                    : alwaysListening
                    ? "คลิกเพื่อปิดไมค์"
                    : "คลิกเพื่อเปิดไมค์"
                }
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRecording
                    ? "bg-red-100 text-red-600 hover:bg-red-200 animate-pulse"
                    : isDarkMode
                    ? "text-gray-400 hover:text-gray-300 hover:bg-gray-600"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
              >
                {voiceActivationMode === "spacebar" ? (
                  <Mic className="w-4 h-4" />
                ) : alwaysListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-6 py-3 bg-[#1677FF] text-white rounded-xl font-medium hover:bg-[#0f5fd4] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>ส่ง</span>
            </button>
          </form>
        </div>

        {/* Voice Modal (ซ่อนเมื่อไมค์ค้าง) */}
        {!alwaysListening && (
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
        )}

        {/* Floating Voice Button */}
        {/* <FloatingVoiceButton
          onClick={voiceCommand.openVoiceModal}
          isRecording={voiceCommand.isRecording}
        /> */}
      </div>
    </div>
  );
};

export default Chat;
