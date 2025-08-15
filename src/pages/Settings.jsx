import { useState, useEffect } from "react";
import {
  Save,
  TestTube,
  Globe,
  Key,
  Workflow,
  Mic,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { langflowAPI } from "../services/langflowApi";
import { speechToTextService } from "../services/speechToText";
import { useTheme } from "../contexts/ThemeContext";

const Settings = () => {
  const [settings, setSettings] = useState({
    langflowUrl: "http://192.168.195.200",
    apiKey: "sk-7XY-g3pi0HJbxPRCh5DKkTSoDpUFyxkI7n0k7SEskK8",
    flowId: "c964a914-6d34-43e3-9321-48b6eda64a30",
    speechToTextUrl: "",
    aiName: "AMR Assistant",
    silenceSeconds: 1.5,
    voiceActivationMode: "wake_word",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [testResults, setTestResults] = useState({});
  const [isTestingConnection, setIsTestingConnection] = useState({});

  // Theme hook
  const { isDarkMode } = useTheme();

  // โหลดการตั้งค่าจาก localStorage เมื่อ component mount
  useEffect(() => {
    const loadSettings = () => {
      const saved = localStorage.getItem("lanxin-amr-settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
        langflowAPI.updateSettings(parsed);
        speechToTextService.updateSettings(parsed);
      } else {
        // บันทึกค่าเริ่มต้น
        const defaultSettings = {
          langflowUrl: "http://192.168.195.200",
          apiKey: "sk-7XY-g3pi0HJbxPRCh5DKkTSoDpUFyxkI7n0k7SEskK8",
          flowId: "c964a914-6d34-43e3-9321-48b6eda64a30",
          speechToTextUrl: "",
          aiName: "AMR Assistant",
          silenceSeconds: 1.5,
          voiceActivationMode: "wake_word",
        };
        localStorage.setItem(
          "lanxin-amr-settings",
          JSON.stringify(defaultSettings)
        );
        setSettings(defaultSettings);
        langflowAPI.updateSettings(defaultSettings);
        speechToTextService.updateSettings(defaultSettings);
      }
    };
    loadSettings();
  }, []); // empty dependency array เพื่อไม่ให้เกิด infinite loop

  const handleInputChange = (field, value) => {
    let nextValue = value;
    if (field === "silenceSeconds") {
      const num = parseFloat(value);
      nextValue = Number.isFinite(num) ? num : settings.silenceSeconds || 1.5;
    }
    const newSettings = { ...settings, [field]: nextValue };
    setSettings(newSettings);
    // อัปเดต services ทันที
    langflowAPI.updateSettings(newSettings);
    speechToTextService.updateSettings(newSettings);
    try {
      window.dispatchEvent(
        new CustomEvent("lanxin:settings-updated", { detail: newSettings })
      );
    } catch {}
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus("");

    try {
      // Simulate API call to save settings
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Save to localStorage and update services
      localStorage.setItem("lanxin-amr-settings", JSON.stringify(settings));
      langflowAPI.updateSettings(settings);
      speechToTextService.updateSettings(settings);

      setSaveStatus("success");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async (type) => {
    setIsTestingConnection((prev) => ({ ...prev, [type]: true }));
    setTestResults((prev) => ({ ...prev, [type]: null }));

    try {
      let result;

      switch (type) {
        case "langflowUrl":
        case "flowId":
          result = await langflowAPI.testConnection();
          break;
        case "speechToTextUrl":
          result = await speechToTextService.testConnection();
          break;
        default:
          result = { success: false, message: "ไม่รองรับการทดสอบ" };
      }

      setTestResults((prev) => ({ ...prev, [type]: result }));
      setTimeout(() => {
        setTestResults((prev) => ({ ...prev, [type]: null }));
      }, 5000);
    } catch (error) {
      console.error(`Test ${type} error:`, error);
      setTestResults((prev) => ({
        ...prev,
        [type]: { success: false, message: error.message },
      }));
      setTimeout(() => {
        setTestResults((prev) => ({ ...prev, [type]: null }));
      }, 5000);
    } finally {
      setIsTestingConnection((prev) => ({ ...prev, [type]: false }));
    }
  };

  const settingsConfig = [
    {
      id: "langflowUrl",
      label: "Langflow URL",
      placeholder: "https://your-langflow-instance.com",
      icon: Globe,
      description: "URL ของ Langflow instance ที่จะใช้งาน",
      testable: true,
    },
    {
      id: "apiKey",
      label: "API Key",
      placeholder: "your-api-key-here",
      icon: Key,
      description: "API Key สำหรับการเข้าถึง Langflow",
      type: "password",
      testable: false,
    },
    {
      id: "flowId",
      label: "Flow ID",
      placeholder: "your-flow-id",
      icon: Workflow,
      description: "ID ของ Flow ที่จะใช้ในการประมวลผล",
      testable: true,
    },
    // ลบการตั้งค่า URL Speech to Text ตามคำขอ (ใช้ Web Speech API เป็นค่าเริ่มต้น)
    {
      id: "aiName",
      label: "AI Name",
      placeholder: "ใส่ชื่อ AI ที่ต้องการให้แสดง",
      icon: Workflow,
      description: "ตั้งชื่อผู้ช่วย AI ที่จะแสดงในแชต",
      testable: false,
    },
    {
      id: "voiceActivationMode",
      label: "โหมดเปิดไมค์",
      placeholder: "",
      icon: Mic,
      description: "เลือกว่าจะสั่งงานด้วยเสียงแบบตรวจชื่อ AI หรือกด Spacebar",
      testable: false,
      special: "voice-activation-mode",
    },
    {
      id: "silenceSeconds",
      label: "เวลาความเงียบ (วินาที)",
      placeholder: "เช่น 1.5",
      icon: Mic,
      description:
        "ไม่มีการพูดกี่วินาทีให้ถือว่าจบประโยคและส่งข้อความอัตโนมัติ",
      type: "number",
      step: 0.1,
      min: 0.3,
      testable: false,
    },
  ];

  return (
    <div className="h-screen flex flex-col p-6">
      <div
        className={`h-full rounded-2xl shadow-xl border overflow-y-auto transition-colors duration-300 ${
          isDarkMode
            ? "bg-gray-800 border-gray-700/50"
            : "bg-white border-gray-200/50"
        }`}
      >
        {/* Header */}
        <div
          className={`px-8 py-6 border-b transition-colors duration-300 ${
            isDarkMode
              ? "bg-gradient-to-r from-gray-800 to-gray-700 border-gray-700"
              : "bg-gradient-to-r from-blue-50 to-purple-50 border-gray-200"
          }`}
        >
          <h1
            className={`text-2xl font-bold mb-2 transition-colors duration-300 ${
              isDarkMode ? "text-gray-100" : "text-gray-900"
            }`}
          >
            การตั้งค่า
          </h1>
          <p
            className={`transition-colors duration-300 ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            กำหนดค่าการเชื่อมต่อและบริการต่างๆ ของ AMR Assistant
          </p>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSave} className="p-8">
          <div className="space-y-8">
            {settingsConfig.map((config) => {
              const IconComponent = config.icon;
              return (
                <div key={config.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                          isDarkMode ? "bg-[#1677FF]/20" : "bg-[#1677FF]/10"
                        }`}
                      >
                        <IconComponent className="w-5 h-5 text-[#1677FF]" />
                      </div>
                      <div>
                        <label
                          className={`block text-sm font-semibold transition-colors duration-300 ${
                            isDarkMode ? "text-gray-100" : "text-gray-900"
                          }`}
                        >
                          {config.label}
                        </label>
                        <p
                          className={`text-xs mt-1 transition-colors duration-300 ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {config.description}
                        </p>
                      </div>
                    </div>
                    {config.testable && (
                      <div className="flex items-center space-x-2">
                        {testResults[config.id] && (
                          <div
                            className={`flex items-center space-x-1 text-xs ${
                              testResults[config.id].success
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {testResults[config.id].success ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            <span>{testResults[config.id].message}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleTest(config.id)}
                          disabled={isTestingConnection[config.id]}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors duration-200 flex items-center space-x-1"
                        >
                          {isTestingConnection[config.id] ? (
                            <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <TestTube className="w-3 h-3" />
                          )}
                          <span>
                            {isTestingConnection[config.id]
                              ? "กำลังทดสอบ..."
                              : "ทดสอบ"}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    {config.special === "voice-activation-mode" ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleInputChange("voiceActivationMode", "wake_word")}
                          className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                            settings.voiceActivationMode === "wake_word"
                              ? "bg-[#1677FF] text-white border-[#1677FF]"
                              : isDarkMode
                              ? "bg-gray-700 text-gray-200 border-gray-600"
                              : "bg-gray-100 text-gray-800 border-gray-300"
                          }`}
                        >
                          ตรวจชื่อ AI
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange("voiceActivationMode", "spacebar")}
                          className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                            settings.voiceActivationMode === "spacebar"
                              ? "bg-[#1677FF] text-white border-[#1677FF]"
                              : isDarkMode
                              ? "bg-gray-700 text-gray-200 border-gray-600"
                              : "bg-gray-100 text-gray-800 border-gray-300"
                          }`}
                        >
                          กด Spacebar
                        </button>
                      </div>
                    ) : (
                      <input
                        type={config.type || "text"}
                        value={settings[config.id]}
                        onChange={(e) =>
                          handleInputChange(config.id, e.target.value)
                        }
                        placeholder={config.placeholder}
                        step={config.step}
                        min={config.min}
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1677FF] focus:border-transparent transition-colors duration-300 ${
                          isDarkMode
                            ? "border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400"
                            : "border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400"
                        }`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save Section */}
          <div
            className={`mt-12 pt-8 border-t transition-colors duration-300 ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {saveStatus === "success" && (
                  <div
                    className={`flex items-center space-x-2 transition-colors duration-300 ${
                      isDarkMode ? "text-green-400" : "text-green-600"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isDarkMode ? "bg-green-400" : "bg-green-500"
                      }`}
                    ></div>
                    <span className="text-sm font-medium">บันทึกสำเร็จ</span>
                  </div>
                )}
                {saveStatus === "error" && (
                  <div
                    className={`flex items-center space-x-2 transition-colors duration-300 ${
                      isDarkMode ? "text-red-400" : "text-red-600"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isDarkMode ? "bg-red-400" : "bg-red-500"
                      }`}
                    ></div>
                    <span className="text-sm font-medium">เกิดข้อผิดพลาด</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 bg-[#1677FF] text-white rounded-xl font-medium hover:bg-[#0f5fd4] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>บันทึกการตั้งค่า</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Additional Info Card */}
      {/* <div
        className={`mt-8 rounded-2xl p-6 border transition-colors duration-300 ${
          isDarkMode
            ? "bg-gray-800 border-gray-700/50"
            : "bg-[#1677FF]/5 border-[#1677FF]/20"
        }`}
      >
        <h3
          className={`font-semibold mb-3 transition-colors duration-300 ${
            isDarkMode ? "text-gray-100" : "text-gray-900"
          }`}
        >
          ข้อมูลเพิ่มเติม
        </h3>
        <div
          className={`space-y-2 text-sm transition-colors duration-300 ${
            isDarkMode ? "text-gray-300" : "text-gray-600"
          }`}
        >
          <p>• การตั้งค่าจะถูกบันทึกใน Local Storage ของเบราว์เซอร์</p>
          <p>• กรุณาตรวจสอบความถูกต้องของ URL และ API Key ก่อนบันทึก</p>
          <p>• สามารถใช้ปุ่ม "ทดสอบ" เพื่อตรวจสอบการเชื่อมต่อ</p>
        </div>
      </div> */}
    </div>
  );
};

export default Settings;
