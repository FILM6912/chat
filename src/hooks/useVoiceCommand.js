import { useState, useEffect, useCallback } from "react";
import { speechToTextService } from "../services/speechToText";

const useVoiceCommand = (enabled = true) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState(null);
  const [voiceResult, setVoiceResult] = useState(null);

  // Hotkey handlers
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event) => {
      // Space key for quick voice command
      if (event.code === "Space" && !event.target.matches("input, textarea")) {
        event.preventDefault();
        if (!isModalOpen) {
          openVoiceModal();
        } else if (!isRecording) {
          startRecording();
        } else {
          stopRecording();
        }
      }

      // Ctrl+Shift+V for voice command
      if (event.ctrlKey && event.shiftKey && event.key === "V") {
        event.preventDefault();
        if (!isModalOpen) {
          openVoiceModal();
        } else {
          closeVoiceModal();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, isRecording, enabled]);

  const openVoiceModal = useCallback(() => {
    setIsModalOpen(true);
    setError(null);
    setInterimText("");
    setFinalText("");
    setVoiceResult(null);
  }, []);

  const closeVoiceModal = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    setIsModalOpen(false);
    setInterimText("");
    setFinalText("");
    setError(null);
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    if (!enabled) return;
    try {
      setIsRecording(true);
      setError(null);
      setInterimText("");
      setFinalText("");

      const result = await speechToTextService.startRecording(
        // onInterimResult callback
        (data) => {
          setInterimText(data.interim);
          if (data.final) {
            setFinalText(data.final);
          }
        },
        // onStart callback
        () => {
          console.log("Voice recording started");
        }
      );

      // When recording is complete
      setFinalText(result);
      setVoiceResult(result);
      setIsRecording(false);

      // Auto-close modal after a short delay
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1500);
    } catch (error) {
      console.error("Voice recording error:", error);
      setError(error.message);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!enabled) return;
    try {
      await speechToTextService.stopRecording();
      setIsRecording(false);
    } catch (error) {
      console.error("Stop recording error:", error);
      setError(error.message);
      setIsRecording(false);
    }
  }, [enabled]);

  // Clear voice result after it's been consumed
  const consumeVoiceResult = useCallback(() => {
    const result = voiceResult;
    setVoiceResult(null);
    return result;
  }, [voiceResult]);

  return {
    // State
    isModalOpen,
    isRecording,
    interimText,
    finalText,
    error,
    voiceResult,

    // Actions
    openVoiceModal,
    closeVoiceModal,
    startRecording,
    stopRecording,
    consumeVoiceResult,
  };
};

export default useVoiceCommand;
