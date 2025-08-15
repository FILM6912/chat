import { useEffect, useState } from "react";
import { Mic, MicOff, Volume2, X } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

const VoiceModal = ({
  isOpen,
  onClose,
  isRecording,
  interimText,
  finalText,
  onStartRecording,
  onStopRecording,
  error,
}) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [showPulse, setShowPulse] = useState(false);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (isRecording) {
      setShowPulse(true);
      // Simulate audio level animation
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);

      return () => clearInterval(interval);
    } else {
      setShowPulse(false);
      setAudioLevel(0);
    }
  }, [isRecording]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        // เมื่อไมค์ถูกล็อกไว้ การกด ESC จะปิดไม่ได้
        return;
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [isOpen, isRecording, onClose, onStopRecording]);

  if (!isOpen) return null;

  const displayText = finalText || interimText || "";
  const isTextInterim = !finalText && interimText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={`relative rounded-3xl shadow-2xl border max-w-md w-full mx-4 overflow-hidden transition-colors duration-300 ${
          isDarkMode
            ? "bg-gray-800 border-gray-700/50"
            : "bg-white border-gray-200/50"
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b transition-colors duration-300 ${
            isDarkMode
              ? "bg-gradient-to-r from-gray-800 to-gray-700 border-gray-700/50"
              : "bg-gradient-to-r from-blue-50 to-purple-50 border-gray-200/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording
                    ? "bg-red-500 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {isRecording ? (
                  <Mic className="w-4 h-4" />
                ) : (
                  <MicOff className="w-4 h-4" />
                )}
              </div>
              <div>
                <h3
                  className={`font-semibold transition-colors duration-300 ${
                    isDarkMode ? "text-gray-100" : "text-gray-900"
                  }`}
                >
                  Voice Command
                </h3>
                <p
                  className={`text-xs transition-colors duration-300 ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {isRecording ? "กำลังฟัง..." : "กดเพื่อเริ่มพูด"}
                </p>
              </div>
            </div>
            <button className={`p-1 rounded-lg transition-colors ${
              isDarkMode
                ? "text-gray-500"
                : "text-gray-300"
            }`} disabled>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Audio Level Visualizer */}
          {isRecording && (
            <div className="mb-6">
              <div className="flex items-center justify-center space-x-1 h-12">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-gradient-to-t from-[#1677FF] to-blue-400 rounded-full transition-all duration-75"
                    style={{
                      height: `${Math.max(
                        8,
                        (audioLevel + Math.random() * 20) * 0.4
                      )}px`,
                      opacity: isRecording ? 0.7 + Math.random() * 0.3 : 0.3,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Text Display */}
          <div className="min-h-[80px] mb-6">
            {displayText ? (
              <div
                className={`p-4 rounded-xl border transition-colors duration-300 ${
                  isTextInterim
                    ? isDarkMode
                      ? "bg-blue-900/30 border-blue-700 text-blue-300"
                      : "bg-blue-50 border-blue-200 text-blue-800"
                    : isDarkMode
                    ? "bg-green-900/30 border-green-700 text-green-300"
                    : "bg-green-50 border-green-200 text-green-800"
                }`}
              >
                <div className="flex items-start space-x-2">
                  <Volume2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p
                    className={`text-sm leading-relaxed ${
                      isTextInterim ? "italic opacity-75" : "font-medium"
                    }`}
                  >
                    {displayText}
                    {isTextInterim && (
                      <span
                        className={`inline-block w-0.5 h-4 animate-pulse ml-1 ${
                          isDarkMode ? "bg-blue-400" : "bg-blue-500"
                        }`}
                      />
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div
                className={`flex items-center justify-center h-20 transition-colors duration-300 ${
                  isDarkMode ? "text-gray-500" : "text-gray-400"
                }`}
              >
                <div className="text-center">
                  <Mic className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">กดปุ่มด้านล่างเพื่อเริ่มพูด</p>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div
              className={`mb-4 p-3 border rounded-xl transition-colors duration-300 ${
                isDarkMode
                  ? "bg-red-900/30 border-red-800"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <p
                className={`text-sm transition-colors duration-300 ${
                  isDarkMode ? "text-red-300" : "text-red-700"
                }`}
              >
                {error}
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center space-x-4">
            <button
              className="px-6 py-3 bg-gray-300 text-gray-600 rounded-xl font-medium cursor-not-allowed"
              disabled
            >
              <Mic className="w-4 h-4" />
              <span>ไมค์กำลังฟังตลอดเวลา</span>
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-4 text-center">
            <p
              className={`text-xs transition-colors duration-300 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              กด{" "}
              <kbd
                className={`px-1.5 py-0.5 rounded text-xs transition-colors duration-300 ${
                  isDarkMode
                    ? "bg-gray-700 text-gray-300"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Space
              </kbd>{" "}
              เพื่อเริ่ม/หยุด หรือ{" "}
              <kbd
                className={`px-1.5 py-0.5 rounded text-xs transition-colors duration-300 ${
                  isDarkMode
                    ? "bg-gray-700 text-gray-300"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Esc
              </kbd>{" "}
              เพื่อปิด
            </p>
          </div>
        </div>

        {/* Floating Mic Animation */}
        {isRecording && (
          <div className="absolute -top-2 -right-2">
            <div className="relative">
              <div
                className={`w-6 h-6 bg-red-500 rounded-full flex items-center justify-center ${
                  showPulse ? "animate-ping" : ""
                }`}
              >
                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceModal;
