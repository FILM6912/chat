// Helper functions สำหรับการจัดการ API responses

export const formatApiError = (error) => {
  if (error.name === "TypeError" && error.message.includes("fetch")) {
    return "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต";
  }

  if (error.message.includes("CORS")) {
    return "เกิดปัญหาการเชื่อมต่อ (CORS Error) กรุณาตรวจสอบการตั้งค่าเซิร์ฟเวอร์";
  }

  if (error.message.includes("401")) {
    return "API Key ไม่ถูกต้อง กรุณาตรวจสอบใหม่ในหน้าตั้งค่า";
  }

  if (error.message.includes("404")) {
    return "ไม่พบ Flow ที่ระบุ กรุณาตรวจสอบ Flow ID ในหน้าตั้งค่า";
  }

  if (error.message.includes("500")) {
    return "เกิดข้อผิดพลาดในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้งภายหลัง";
  }

  return error.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
};

export const retryFetch = async (fetchFn, maxRetries = 3, delay = 1000) => {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error;

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError;
};

export default {
  formatApiError,
  retryFetch,
};
