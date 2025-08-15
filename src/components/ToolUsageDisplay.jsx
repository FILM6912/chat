import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Hammer,
  MessageSquare,
  Clock,
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

const ToolUsageDisplay = ({ contentBlocks }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isDarkMode } = useTheme();

  // ถ้าไม่มี content_blocks ไม่แสดงอะไร
  if (
    !contentBlocks ||
    !Array.isArray(contentBlocks) ||
    contentBlocks.length === 0
  ) {
    return null;
  }

  // หา content_blocks ที่เป็น "Agent Steps"
  const agentSteps = contentBlocks.find(
    (block) => block.title === "Agent Steps"
  );
  if (!agentSteps || !agentSteps.contents) {
    return null;
  }

  // กรองเฉพาะ tool_use steps
  const toolSteps = agentSteps.contents.filter(
    (content) => content.type === "tool_use"
  );

  // ถ้าไม่มี tool usage ไม่แสดงอะไร
  if (toolSteps.length === 0) {
    return null;
  }

  const formatDuration = (duration) => {
    if (!duration) return "";
    return `${duration}ms`;
  };

  const formatToolInput = (toolInput) => {
    if (!toolInput) return "ไม่มีข้อมูล input";

    try {
      // สำหรับ object หรือ array ขนาดเล็ก แสดงในบรรทัดเดียว
      if (typeof toolInput === "object") {
        const singleLine = JSON.stringify(toolInput);
        if (singleLine.length <= 60) {
          return singleLine;
        }
      }

      // สำหรับ object/array ที่ซับซ้อน ใช้ proper JSON formatting
      return JSON.stringify(toolInput, null, 2);
    } catch {
      return String(toolInput);
    }
  };

  const formatToolOutput = (output) => {
    if (!output) return "ไม่มีข้อมูล output";

    const formatJSON = (data) => {
      try {
        // สำหรับ object หรือ array ขนาดเล็ก แสดงในบรรทัดเดียว
        if (typeof data === "object") {
          const singleLine = JSON.stringify(data);
          if (singleLine.length <= 60) {
            return singleLine;
          }
        }

        // สำหรับข้อมูลที่ซับซ้อน ใช้ proper JSON formatting
        return JSON.stringify(data, null, 2);
      } catch {
        return String(data);
      }
    };

    try {
      // ถ้า output เป็น array ของ objects
      if (Array.isArray(output)) {
        const firstItem = output[0];
        if (firstItem && firstItem.text) {
          // ลองแปลง JSON ใน text
          try {
            const parsed = JSON.parse(firstItem.text);
            return formatJSON(parsed);
          } catch {
            // ถ้าไม่ใช่ JSON ให้แสดง text ธรรมดา
            return firstItem.text;
          }
        }
        // ถ้าเป็น array ปกติ
        return formatJSON(output);
      }

      // ถ้า output เป็น string ลองแปลง JSON
      if (typeof output === "string") {
        try {
          const parsed = JSON.parse(output);
          return formatJSON(parsed);
        } catch {
          // ถ้าไม่ใช่ JSON string ให้แสดงตามปกติ
          return output;
        }
      }

      // สำหรับ object หรือ type อื่นๆ
      return formatJSON(output);
    } catch {
      return String(output);
    }
  };

  return (
    <div
      className={`mb-3 rounded-lg border transition-colors duration-300 ${
        isDarkMode
          ? "bg-gray-800/50 border-gray-600"
          : "bg-blue-50/50 border-blue-200"
      }`}
    >
      {/* Header - คลิกได้เพื่อ expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-4 py-3 flex items-center justify-between text-left rounded-t-lg transition-colors duration-300 hover:bg-opacity-80 ${
          isDarkMode ? "hover:bg-gray-700/50" : "hover:bg-blue-100/50"
        }`}
      >
        <div className="flex items-center space-x-2">
          <Hammer
            className={`w-4 h-4 ${
              isDarkMode ? "text-blue-400" : "text-blue-600"
            }`}
          />
          <span
            className={`font-medium text-sm ${
              isDarkMode ? "text-gray-200" : "text-gray-800"
            }`}
          >
            เครื่องมือที่ใช้งาน ({toolSteps.length} รายการ)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`text-xs ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            คลิกเพื่อดูรายละเอียด
          </span>
          {isExpanded ? (
            <ChevronUp
              className={`w-4 h-4 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            />
          ) : (
            <ChevronDown
              className={`w-4 h-4 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            />
          )}
        </div>
      </button>

      {/* Collapsed View - แสดงรายการ tool แบบย่อ */}
      {!isExpanded && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-2">
            {toolSteps.map((step, index) => (
              <span
                key={index}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors duration-300 ${
                  isDarkMode
                    ? "bg-blue-900/30 text-blue-300 border border-blue-800/50"
                    : "bg-blue-100 text-blue-700 border border-blue-300"
                }`}
              >
                {step.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expanded View - แสดงรายละเอียดของแต่ละ tool */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-600">
          {toolSteps.map((step, index) => (
            <div
              key={index}
              className={`p-4 ${
                index < toolSteps.length - 1
                  ? "border-b border-gray-200 dark:border-gray-600"
                  : ""
              }`}
            >
              {/* Tool Header */}
              <div className="flex items-center space-x-2 mb-3">
                <Hammer
                  className={`w-4 h-4 ${
                    isDarkMode ? "text-blue-400" : "text-blue-600"
                  }`}
                />
                <span
                  className={`font-medium text-sm ${
                    isDarkMode ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  {step.header?.title || step.name}
                </span>
                {step.duration && (
                  <div className="flex items-center space-x-1">
                    <Clock
                      className={`w-3 h-3 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    />
                    <span
                      className={`text-xs ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {formatDuration(step.duration)}
                    </span>
                  </div>
                )}
              </div>

              {/* Tool Input */}
              <div className="mb-3">
                <h4
                  className={`text-xs font-semibold mb-1 ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Input:
                </h4>
                <div
                  className={`text-xs p-2 rounded border font-mono max-w-full ${
                    isDarkMode
                      ? "bg-gray-900/50 text-gray-300 border-gray-600"
                      : "bg-gray-50 text-gray-700 border-gray-300"
                  }`}
                  style={{
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    maxWidth: "100%",
                    overflow: "hidden",
                  }}
                >
                  {formatToolInput(step.tool_input)}
                </div>
              </div>

              {/* Tool Output */}
              <div>
                <h4
                  className={`text-xs font-semibold mb-1 ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Output:
                </h4>
                <div
                  className={`text-xs p-2 rounded border font-mono max-w-full ${
                    isDarkMode
                      ? "bg-gray-900/50 text-gray-300 border-gray-600"
                      : "bg-gray-50 text-gray-700 border-gray-300"
                  }`}
                  style={{
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    maxWidth: "100%",
                    overflow: "hidden",
                  }}
                >
                  {formatToolOutput(step.output)}
                </div>
              </div>

              {/* Error Display (ถ้ามี) */}
              {step.error && (
                <div className="mt-3">
                  <h4 className="text-xs font-semibold mb-1 text-red-600 dark:text-red-400">
                    Error:
                  </h4>
                  <div
                    className="text-xs p-2 rounded border font-mono bg-red-50 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/50"
                    style={{
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      maxWidth: "100%",
                      overflow: "hidden",
                    }}
                  >
                    {JSON.stringify(step.error, null, 2)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ToolUsageDisplay;
