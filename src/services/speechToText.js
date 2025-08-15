class SpeechToTextService {
  constructor() {
    this.recognition = null;
    this.isSupported = this.checkSupport();
    this.settings = this.loadSettings();
    this.currentRecognition = null;
    this._continuousMode = false;
    this._manualStop = false;
    this._preventStop = false;
  }

  loadSettings() {
    // ยกเลิกการใช้ URL ภายนอก ใช้ Web Speech API เป็นค่า default เสมอ
    return { speechToTextUrl: "" };
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  checkSupport() {
    return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
  }

  initializeWebSpeechAPI() {
    if (!this.isSupported) {
      throw new Error("เบราว์เซอร์ไม่รองรับ Speech Recognition");
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = "th-TH"; // ตั้งให้รองรับภาษาไทย

    return this.recognition;
  }

  async startRecording(onInterimResult = null, onStart = null) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.isSupported) {
          reject(new Error("เบราว์เซอร์ไม่รองรับ Speech Recognition"));
          return;
        }

        const recognition = this.initializeWebSpeechAPI();

        // เปิด interim results สำหรับ real-time
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onstart = () => {
          console.log("Speech recognition started");
          if (onStart) onStart();
        };

        recognition.onresult = (event) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          // ส่ง real-time results
          if (onInterimResult) {
            onInterimResult({
              interim: interimTranscript,
              final: finalTranscript,
              isComplete: finalTranscript.length > 0,
            });
          }

          // ถ้ามี final result แล้ว resolve
          if (finalTranscript) {
            console.log("Speech recognition final result:", finalTranscript);
            resolve(finalTranscript);
          }
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          reject(new Error(`Speech recognition error: ${event.error}`));
        };

        recognition.onend = () => {
          console.log("Speech recognition ended");
        };

        recognition.start();

        // Store recognition instance for stopping
        this.currentRecognition = recognition;
      } catch (error) {
        reject(error);
      }
    });
  }

  async stopRecording() {
    if (this._preventStop) return; // ล็อกไม่ให้หยุด
    if (this.currentRecognition) {
      this.currentRecognition.stop();
      this.currentRecognition = null;
    }
  }

  isCurrentlyRecording() {
    return this.currentRecognition !== null;
  }

  async convertSpeechToText(audioBlob) {
    try {
      // ใช้ Web Speech API เท่านั้นตามคำขอ
      return await this.startRecording();
    } catch (error) {
      console.error("Speech to text error:", error);
      throw error;
    }
  }

  async testConnection() {
    try {
      // ทดสอบเฉพาะ Web Speech API
      if (this.isSupported) {
        return { success: true, message: "Web Speech API พร้อมใช้งาน" };
      }
      return { success: false, message: "เบราว์เซอร์ไม่รองรับ Speech Recognition" };
    } catch (error) {
      return {
        success: false,
        message: `เชื่อมต่อไม่สำเร็จ: ${error.message}`,
      };
    }
  }

  // โหมดฟังต่อเนื่องแบบรีสตาร์ทอัตโนมัติและไม่ resolve promise
  startContinuousListening(onInterim = null, onFinal = null, onStart = null) {
    if (!this.isSupported) {
      throw new Error("เบราว์เซอร์ไม่รองรับ Speech Recognition");
    }

    // ถ้ากำลังฟังอยู่แล้ว ให้ข้าม
    if (this._continuousMode && this.currentRecognition) {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = "th-TH";
    recognition.interimResults = true;
    recognition.continuous = true;

    this._continuousMode = true;
    this._manualStop = false;
    this.currentRecognition = recognition;

    recognition.onstart = () => {
      console.log("Continuous speech recognition started");
      if (onStart) onStart();
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (onInterim) {
        onInterim({ interim: interimTranscript, final: finalTranscript });
      }
      if (finalTranscript && onFinal) {
        onFinal(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error (continuous):", event.error);
    };

    recognition.onend = () => {
      console.log("Continuous speech recognition ended");
      if (this._continuousMode && !this._manualStop) {
        // รีสตาร์ทอัตโนมัติเล็กน้อยเพื่อความเสถียร
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.warn("Restart recognition failed, recreating instance", e);
            // สร้างใหม่หากจำเป็น
            this._continuousMode = false;
            this.currentRecognition = null;
            // เริ่มใหม่โดยใช้อินสแตนซ์ใหม่
            try {
              this.startContinuousListening(onInterim, onFinal, onStart);
            } catch {}
          }
        }, 150);
      }
    };

    recognition.start();
  }

  stopContinuousListening() {
    if (this._preventStop) return; // ล็อกไม่ให้หยุด
    this._manualStop = true;
    this._continuousMode = false;
    if (this.currentRecognition) {
      try {
        this.currentRecognition.stop();
      } catch {}
      this.currentRecognition = null;
    }
  }

  lockStop(lock = true) {
    this._preventStop = !!lock;
  }
}

// สร้าง instance เดียวสำหรับใช้ทั้งแอป
export const speechToTextService = new SpeechToTextService();

export default speechToTextService;
