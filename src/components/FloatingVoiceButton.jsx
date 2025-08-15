import { useState, useEffect } from "react";
import { Mic, Command, Zap } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

const FloatingVoiceButton = ({ onClick, isRecording = false }) => {
  const [showPulse, setShowPulse] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (isRecording) {
      setShowPulse(true);
    } else {
      setShowPulse(false);
    }
  }, [isRecording]);

  // Hide hint after a few seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed bottom-8 right-8 z-40">
      {/* Hint Tooltip */}
      {showHint && !isRecording && (
        <div className="absolute bottom-full right-0 mb-4 animate-bounce">
          <div
            className={`text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg transition-colors duration-300 ${
              isDarkMode
                ? "bg-gray-700 text-gray-200"
                : "bg-gray-900 text-white"
            }`}
          >
            กด Space เพื่อใช้ Voice Command
            <div
              className={`absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                isDarkMode ? "border-t-gray-700" : "border-t-gray-900"
              }`}
            ></div>
          </div>
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={onClick}
        className={`
           w-16 h-16 rounded-full shadow-2xl flex items-center justify-center
           transition-all duration-300 transform hover:scale-110 active:scale-95
           ${
             isRecording
               ? "bg-red-500 hover:bg-red-600 animate-pulse"
               : "bg-[#1677FF] hover:bg-[#0f5fd4]"
           }
           ${showPulse ? "ring-4 ring-red-300 ring-opacity-50" : ""}
         `}
      >
        {isRecording ? (
          <Mic className="w-6 h-6 text-white" />
        ) : (
          <Command className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Pulse Animation Ring */}
      {showPulse && (
        <div className="absolute inset-0 rounded-full bg-red-400 opacity-25 animate-ping"></div>
      )}

      {/* Quick Action Indicators */}
      {!isRecording && (
        <div className="absolute bottom-full right-0 mb-2 flex flex-col space-y-1">
          <div
            className={`backdrop-blur-sm px-2 py-1 rounded-full shadow-sm flex items-center space-x-1 transition-colors duration-300 ${
              isDarkMode ? "bg-gray-800/90" : "bg-white/90"
            }`}
          >
            <kbd
              className={`text-xs px-1.5 py-0.5 rounded border transition-colors duration-300 ${
                isDarkMode
                  ? "bg-gray-700 text-gray-300 border-gray-600"
                  : "bg-gray-100 text-gray-800 border-gray-300"
              }`}
            >
              Space
            </kbd>
            <Zap className="w-3 h-3 text-[#1677FF]" />
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingVoiceButton;
