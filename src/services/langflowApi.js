class LangflowAPI {
  constructor() {
    this.settings = this.loadSettings();
  }

  loadSettings() {
    const defaults = {
      langflowUrl: "https://langflow.sd.com",
      apiKey: "sk-7XY-g3pi0HJbxPRCh5DKkTSoDpUFyxkI7n0k7SEskK8",
      flowId: "c964a914-6d34-43e3-9321-48b6eda64a30",
      speechToTextUrl: "",
      aiName: "AMR Assistant",
    };
    const saved = localStorage.getItem("lanxin-amr-settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // รวมกับค่าเริ่มต้นเพื่อเติมค่าที่ขาด เช่น aiName
        return { ...defaults, ...parsed };
      } catch (_) {
        return defaults;
      }
    }
    // ค่าเริ่มต้น
    return defaults;
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * ส่งข้อความแบบสตรีมและเรียก onChunk ทุกครั้งที่ได้รับ token/ข้อความย่อย
   * หากปลายทางไม่รองรับสตรีม จะ fallback เป็นการเรียกแบบปกติแล้วส่งทั้งก้อนผ่าน onChunk ครั้งเดียว
   * @param {string} message
   * @param {string|null} chatId
   * @param {(chunk: string) => void} onChunk
   * @returns {Promise<{ text: string, content_blocks: any, raw_data: any }|{ text: string }|string>}
   */
  async sendMessageStream(message, chatId = null, onChunk = () => {}) {
    const { langflowUrl, apiKey, flowId } = this.settings;
    if (!langflowUrl || !flowId) {
      throw new Error("กรุณากำหนดค่า Langflow ในหน้าตั้งค่าก่อน");
    }

    // พยายามร้องขอแบบสตรีม (รองรับทั้งรูปแบบทั่วไปและ SSE)
    const url = `${langflowUrl}/api/v1/run/${flowId}?stream=true`;

    const payload = {
      input_value: message,
      output_type: "chat",
      input_type: "chat",
      tweaks: {},
      // เผื่อบางปลายทางต้องการ flag นี้ใน body ด้วย
      stream: true,
    };

    if (chatId) {
      payload.session_id = chatId;
    }

    const headers = {
      "Content-Type": "application/json",
      Accept: "text/event-stream, application/json;q=0.9, */*;q=0.8",
    };
    if (apiKey) {
      headers["x-api-key"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    try {
      const controller = new AbortController();
      let receivedFirstChunk = false;
      const onChunkWrapped = (chunk) => {
        if (!receivedFirstChunk && chunk) {
          receivedFirstChunk = true;
          clearTimeout(firstChunkTimeout);
        }
        // กันกรณีปลายทางส่ง HTML มาแทนสตรีม (เช่น หน้า error ของ proxy/server)
        const isHtmlLike = (txt) => {
          if (typeof txt !== "string") return false;
          const t = txt.trim().toLowerCase();
          return (
            t.includes("<!doctype html") ||
            t.includes("<html") ||
            t.includes("<head") ||
            t.includes("<body") ||
            t.endsWith("</html>")
          );
        };
        if (typeof chunk === "string" && isHtmlLike(chunk)) {
          throw new Error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        }
        if (chunk && typeof chunk === "object" && typeof chunk.text === "string" && isHtmlLike(chunk.text)) {
          throw new Error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        }
        onChunk(chunk);
      };

      // หาก 20 วินาทีแรกยังไม่เห็นข้อมูลสตรีม ให้ยกเลิกแล้ว fallback
      const firstChunkTimeout = setTimeout(() => {
        if (!receivedFirstChunk) {
          try {
            controller.abort();
          } catch (_) {}
        }
      }, 20000);

      console.debug("[sendMessageStream] POST", url, { payload });
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        mode: "cors",
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        const friendly = (errorText && (/(<!doctype html|<html|<body)/i).test(errorText))
          ? "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้"
          : errorText;
        console.error("Langflow API Stream Error:", response.status, friendly);
        throw new Error(`API Error (${response.status}): ${friendly}`);
      }

      const contentType = (response.headers.get("Content-Type") || "").toLowerCase();
      console.debug("[sendMessageStream] Content-Type:", contentType);

      // หากได้ HTML กลับมาให้แจ้ง error ที่อ่านง่ายทันที
      if (contentType.includes("text/html")) {
        const text = await response.text();
        console.error("Unexpected HTML response for stream:", text?.slice(0, 200));
        throw new Error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
      }

      // ถ้าเป็น SSE
      if (contentType.includes("text/event-stream")) {
        console.debug("[sendMessageStream] Using SSE reader");
        await this.readSSEStream(response, onChunkWrapped);
        // ปลายทางแบบ SSE มักไม่ส่ง JSON สุดท้าย จึงไม่มีโครงสร้าง content_blocks
        return { text: "", content_blocks: null, raw_data: null, is_stream_end: true };
      }

      // ถ้ามี body ให้พยายามอ่านแบบ NDJSON/ข้อความต่อเนื่องเสมอ
      if (response.body) {
        console.debug("[sendMessageStream] Using NDJSON/text reader (generic)");
        await this.readNDJSONStream(response, onChunkWrapped);
        return { text: "", content_blocks: null, raw_data: null, is_stream_end: true };
      }

      // กรณีสุดท้าย: ไม่มี body stream ให้ fallback เป็น JSON ทีเดียว
      console.debug("[sendMessageStream] No body stream; JSON fallback");
      const data = await response.json();
      const parsed = this.parseResponse(data);
      if (parsed && parsed.text) {
        onChunkWrapped(parsed.text);
      }
      return parsed;
    } catch (error) {
      // หากโหมดสตรีมมีปัญหา ให้ fallback เป็นการเรียกแบบปกติ
      console.warn("Falling back to non-streaming request due to:", error);
      const final = await this.sendMessage(message, chatId);
      const finalText = typeof final === "string" ? final : final?.text || "";
      if (finalText) onChunk(finalText);
      return final;
    }
  }

  // อ่าน SSE ด้วย fetch + ReadableStream
  async readSSEStream(response, onChunk) {
    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let reachedDone = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // แยก event ตามบรรทัดว่างสองบรรทัด รองรับทั้ง \n และ \r\n
      const events = buffer.split(/\r?\n\r?\n/);
      // เก็บเศษท้ายไว้
      buffer = events.pop() || "";

      for (const evt of events) {
        // รองรับหลายบรรทัด data:
        const dataLines = evt
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim());

        // ถ้าไม่มีบรรทัดขึ้นต้นด้วย data: ให้ลองใช้เนื้อหา event ทั้งหมดเป็น payload (บางเซิร์ฟเวอร์ส่ง NDJSON แต่ตั้ง header เป็น text/event-stream)
        const dataPayload =
          dataLines.length > 0 ? dataLines.join("\n") : evt.trim();
        if (!dataPayload) continue;
        if (dataPayload === "[DONE]") {
          reachedDone = true;
          continue;
        }

        // พยายาม parse JSON ก่อน ถ้าไม่ได้ให้ส่งเป็นข้อความดิบ
        try {
          const json = JSON.parse(dataPayload);
          // ตรวจจับ event แบบ Langflow Space
          const eventType = json?.event;
          if (eventType === "end") {
            reachedDone = true;
            continue;
          }

          const token = this.extractTokenFromJson(json);
          const tools = this.extractToolsFromEventJson(json);
          const contentBlocks = this.extractContentBlocksFromEventJson(json);
          const hasText = typeof token === "string" && token.length > 0;
          const hasTools = Array.isArray(tools) && tools.length > 0;
          const hasBlocks = Array.isArray(contentBlocks) && contentBlocks.length > 0;
          if (hasText || hasTools || hasBlocks) {
            if (eventType === "add_message" || eventType === "update_message") {
              if (hasText) {
                onChunk({ text: token, replace: true, tools, contentBlocks });
              } else {
                onChunk({ tools, contentBlocks });
              }
            } else if (hasText) {
              onChunk({ text: token, tools, contentBlocks });
            } else {
              onChunk({ tools, contentBlocks });
            }
          }
        } catch (_) {
          onChunk(dataPayload);
        }
      }

      if (reachedDone) break;
    }
  }

  // อ่านสตรีมแบบข้อความล้วน (ไม่ใช่ JSON)
  async readTextStream(response, onChunk) {
    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder("utf-8");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) {
        // ตัด CRLF ที่ต้น/ท้าย เพื่อให้ต่อเนื่องสวยงามขึ้นใน UI
        onChunk(chunk.replace(/^\r?\n+|\r?\n+$/g, ""));
      }
    }
  }

  /**
   * อ่านสตรีมที่อาจเป็น NDJSON หรือข้อความปน JSON (รองรับ data: ... แบบ SSE ด้วย)
   */
  async readNDJSONStream(response, onChunk) {
    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let reachedDone = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // แยกเป็นบรรทัด ๆ รองรับ CRLF
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || ""; // เหลือบรรทัดสุดท้ายไว้ใน buffer ถ้ายังไม่จบ

      for (const lineRaw of lines) {
        const line = lineRaw.trim();
        if (!line) continue;

        if (line === "[DONE]") {
          reachedDone = true;
          break;
        }

        // รองรับรูปแบบ data: <json หรือ text>
        const dataPrefix = "data:";
        const payload = line.startsWith(dataPrefix)
          ? line.slice(dataPrefix.length).trim()
          : line;

        // พยายาม parse JSON
        let emitted = false;
        if (payload.startsWith("{") || payload.startsWith("[")) {
          try {
            const json = JSON.parse(payload);
            // ตรวจจับ event วิธี Langflow Space
            const eventType = json?.event;
            if (eventType === "end") {
              reachedDone = true;
              break;
            }

            const token = this.extractTokenFromJson(json);
            const tools = this.extractToolsFromEventJson(json);
            const contentBlocks = this.extractContentBlocksFromEventJson(json);
            const hasText = typeof token === "string" && token.length > 0;
            const hasTools = Array.isArray(tools) && tools.length > 0;
            const hasBlocks = Array.isArray(contentBlocks) && contentBlocks.length > 0;
            if (hasText || hasTools || hasBlocks) {
              if (eventType === "add_message" || eventType === "update_message") {
                if (hasText) {
                  onChunk({ text: token, replace: true, tools, contentBlocks });
                } else {
                  onChunk({ tools, contentBlocks });
                }
              } else if (hasText) {
                onChunk({ text: token, tools, contentBlocks });
              } else {
                onChunk({ tools, contentBlocks });
              }
              emitted = true;
            }
          } catch (_) {
            // ไม่ใช่ JSON สมบูรณ์ ปล่อยไปให้สะสมใน buffer รอบถัดไป
          }
        }

        if (!emitted && payload) {
          // กันกรณีปลายทางส่ง HTML มา
          const t = payload.trim().toLowerCase();
          if (/(<!doctype html|<html|<head|<body|<title)/i.test(t) || t.endsWith("</html>")) {
            throw new Error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
          }
          onChunk(payload);
        }
      }

      if (reachedDone) break;
    }

    // หากจบรอบแล้ว เหลือ buffer ที่ยังไม่ emit ลอง parse/emit ครั้งสุดท้าย
    const last = buffer.trim();
    if (last) {
      try {
        const json = JSON.parse(last);
        const token = this.extractTokenFromJson(json);
        if (token) onChunk(token);
        else onChunk(last);
      } catch (_) {
        onChunk(last);
      }
    }
  }

  /**
   * ดึง token/ข้อความจาก JSON รูปแบบที่พบบ่อย
   */
  extractTokenFromJson(json) {
    if (!json || typeof json !== "object") return "";

    // รองรับรูปแบบ event-stream แบบ Langflow Space (NDJSON)
    if (typeof json.event === "string" && json.data && typeof json.data === "object") {
      const sender = json.data.sender;
      const isAssistant = sender === "AI" || sender === "Machine";
      if (json.event === "add_message" && isAssistant) {
        if (typeof json.data.text === "string") return json.data.text;
      }
      // บางระบบใช้ update_message ระหว่างพิมพ์
      if (json.event === "update_message" && isAssistant) {
        if (typeof json.data.text === "string") return json.data.text;
      }
      // event อื่น ๆ ที่อาจส่งข้อความมา
      if (typeof json.data.text === "string" && json.data.text) {
        return json.data.text;
      }
    }
    // รูปแบบมาตรฐานทั่วไป
    if (typeof json.token === "string") return json.token;
    if (typeof json.delta === "string") return json.delta;
    if (typeof json.text === "string") return json.text;
    if (typeof json.content === "string") return json.content;

    // รูปแบบคล้าย OpenAI
    const openAiDelta = json?.choices?.[0]?.delta?.content;
    if (typeof openAiDelta === "string") return openAiDelta;
    const openAiText = json?.choices?.[0]?.text;
    if (typeof openAiText === "string") return openAiText;

    // รูปแบบอื่นๆ ที่อาจเป็นข้อความ
    if (json?.message && typeof json.message === "string") return json.message;
    if (json?.data && typeof json.data === "string") return json.data;
    if (json?.output && typeof json.output === "string") return json.output;

    // โครงสร้างแบบ Langflow (คล้าย parseResponse())
    try {
      if (Array.isArray(json.outputs) && json.outputs.length > 0) {
        const output = json.outputs[0];
        if (Array.isArray(output.outputs) && output.outputs.length > 0) {
          const firstOutput = output.outputs[0];
          const messageData = firstOutput?.results?.message;
          if (messageData) {
            const textCandidate =
              messageData.text ||
              messageData.data?.text ||
              messageData.data?.content ||
              messageData.content ||
              (typeof messageData === "string" ? messageData : "");
            if (typeof textCandidate === "string" && textCandidate) {
              return textCandidate;
            }
          }
          if (firstOutput?.artifacts?.message) return firstOutput.artifacts.message;
          if (typeof firstOutput?.text === "string") return firstOutput.text;
        }
        if (typeof output?.text === "string") return output.text;
        if (typeof output?.message === "string") return output.message;
      }
    } catch (_) {}

    return "";
  }

  /**
   * ดึงรายการเครื่องมือที่ถูกเรียกใช้ออกจาก event JSON ของ Langflow Space
   * คืนค่าเป็น array ของ { name, input, output }
   */
  extractToolsFromEventJson(json) {
    try {
      const data = json?.data;
      const blocks = Array.isArray(data?.content_blocks) ? data.content_blocks : [];
      const contents = blocks.flatMap((b) => (Array.isArray(b?.contents) ? b.contents : []));
      const tools = contents
        .filter((c) => c && c.type === "tool_use")
        .map((c) => ({ name: c.name, input: c.tool_input, output: c.output }));
      return tools;
    } catch (_) {
      return [];
    }
  }

  /**
   * ดึง content_blocks แบบดิบเผื่อไปแสดงใน UI (ToolUsageDisplay)
   */
  extractContentBlocksFromEventJson(json) {
    try {
      const data = json?.data;
      return Array.isArray(data?.content_blocks) ? data.content_blocks : [];
    } catch (_) {
      return [];
    }
  }

  async sendMessage(message, chatId = null) {
    try {
      const { langflowUrl, apiKey, flowId } = this.settings;

      if (!langflowUrl || !flowId) {
        throw new Error("กรุณากำหนดค่า Langflow ในหน้าตั้งค่าก่อน");
      }

      // สร้าง URL สำหรับ Langflow API
      const url = `${langflowUrl}/api/v1/run/${flowId}`;

      const payload = {
        input_value: message,
        output_type: "chat",
        input_type: "chat",
        tweaks: {},
      };

      if (chatId) {
        payload.session_id = chatId;
      }

      console.log("Sending request to Langflow:", { url, payload });

      const baseHeaders = {
        "Content-Type": "application/json",
      };
      if (apiKey) {
        baseHeaders["Authorization"] = `Bearer ${apiKey}`;
        baseHeaders["x-api-key"] = apiKey;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: baseHeaders,
        body: JSON.stringify(payload),
        mode: "cors",
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text();
        const friendly = (errorText && (/(<!doctype html|<html|<body)/i).test(errorText))
          ? "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้"
          : errorText;
        console.error("Langflow API Error:", response.status, friendly);
        throw new Error(`API Error (${response.status}): ${friendly}`);
      }

      const respType = (response.headers.get("Content-Type") || "").toLowerCase();
      if (!respType.includes("application/json")) {
        const text = await response.text();
        const friendly = (text && (/(<!doctype html|<html|<body)/i).test(text))
          ? "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้"
          : (text || "Unexpected response from server");
        throw new Error(friendly);
      }
      const data = await response.json();
      console.log("Langflow API Response:", data);

      // แปลง response ให้เป็นรูปแบบที่ใช้งานได้
      return this.parseResponse(data);
    } catch (error) {
      console.error("Error calling Langflow API:", error);
      throw error;
    }
  }

  parseResponse(data) {
    try {
      // ลองหาข้อความตอบกลับจาก response structure ของ Langflow
      if (data.outputs && data.outputs.length > 0) {
        const output = data.outputs[0];

        // ลองหาในหลายๆ path ที่เป็นไปได้
        if (output.outputs && output.outputs.length > 0) {
          const firstOutput = output.outputs[0];
          if (firstOutput.results && firstOutput.results.message) {
            const messageData = firstOutput.results.message;
            // ส่งกลับทั้ง text และ content_blocks
            return {
              text: messageData.text || messageData.data?.text || messageData,
              content_blocks:
                messageData.data?.content_blocks ||
                messageData.content_blocks ||
                null,
              raw_data: messageData,
            };
          }
          if (firstOutput.artifacts && firstOutput.artifacts.message) {
            return {
              text: firstOutput.artifacts.message,
              content_blocks: null,
              raw_data: firstOutput.artifacts,
            };
          }
          if (firstOutput.text) {
            return {
              text: firstOutput.text,
              content_blocks: null,
              raw_data: firstOutput,
            };
          }
        }

        if (output.text) {
          return {
            text: output.text,
            content_blocks: null,
            raw_data: output,
          };
        }
        if (output.message) {
          return {
            text: output.message,
            content_blocks: null,
            raw_data: output,
          };
        }
      }

      // ถ้าไม่เจอ ลองใช้ข้อมูลดิบ
      if (data.result) {
        return {
          text: data.result,
          content_blocks: null,
          raw_data: data,
        };
      }
      if (data.message) {
        return {
          text: data.message,
          content_blocks: null,
          raw_data: data,
        };
      }
      if (data.text) {
        return {
          text: data.text,
          content_blocks: null,
          raw_data: data,
        };
      }

      // ถ้ายังไม่เจอ ให้แสดง JSON เป็นโค้ดบล็อก Markdown
      return {
        text: "```json\n" + JSON.stringify(data, null, 2) + "\n```",
        content_blocks: null,
        raw_data: data,
      };
    } catch (error) {
      console.error("Error parsing response:", error);
      return {
        text: "**เกิดข้อผิดพลาดในการแปลงผลลัพธ์**\n\n```text\n" + String(error && error.message ? error.message : error) + "\n```",
        content_blocks: null,
        raw_data: null,
      };
    }
  }

  async testConnection() {
    try {
      const { langflowUrl } = this.settings;

      if (!langflowUrl) {
        throw new Error("กรุณากรอก URL");
      }

      // ทดสอบการเชื่อมต่อด้วยการส่งข้อความทดสอบ
      const testMessage = "ping";
      await this.sendMessage(testMessage);

      return { success: true, message: "เชื่อมต่อสำเร็จ" };
    } catch (error) {
      return {
        success: false,
        message: `เชื่อมต่อไม่สำเร็จ: ${error.message}`,
      };
    }
  }

  /**
   * ดึงประวัติข้อความจาก Langflow Monitor API ให้ได้โครงสร้างเหมือนตัวอย่าง Python
   * @param {{ sessionId?: string|null, all?: boolean }} params
   * @returns {Promise<Array<{ input: string, output: string, tool?: Array<{name: string, input: any, output: any}>, session_id?: string, timestamp?: string|number }>>}
   */
  async getMessages(params = {}) {
    const { sessionId = null, all = false } = params;
    const { langflowUrl, apiKey } = this.settings;

    if (!langflowUrl) {
      throw new Error("กรุณากำหนดค่า Langflow URL ในหน้าตั้งค่าก่อน");
    }

    const base = `${langflowUrl.replace(/\/$/, "")}/api/v1/monitor/messages`;
    const url = all
      ? base
      : `${base}?session_id=${encodeURIComponent(sessionId || "")}`;

    const headers = {
      Accept: "application/json",
    };
    if (apiKey) {
      headers["x-api-key"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, { method: "GET", headers, mode: "cors", cache: "no-store" });
    if (!response.ok) {
      const errorText = await response.text();
      const friendly = (errorText && (/(<!doctype html|<html|<body)/i).test(errorText))
        ? "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้"
        : errorText;
      throw new Error(`API Error (${response.status}): ${friendly}`);
    }

    const ct = (response.headers.get("Content-Type") || "").toLowerCase();
    if (!ct.includes("application/json")) {
      const txt = await response.text();
      const friendly = (txt && (/(<!doctype html|<html|<body)/i).test(txt))
        ? "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้"
        : (txt || "Unexpected response from server");
      throw new Error(friendly);
    }

    const data = await response.json();
    return this.parseMonitorMessages(data);
  }

  /**
   * แปลงข้อมูล monitor/messages ให้เป็น array ของคู่ {input, output, tool?, session_id}
   * จับคู่แบบ (User, Machine) ตามลำดับในลิสต์
   * @param {any} data
   */
  parseMonitorMessages(data) {
    if (!Array.isArray(data)) return [];

    const output = [];
    for (let i = 0; i < data.length - 1; i += 2) {
      const user = data[i];
      const ai = data[i + 1];
      const isUser = user && user.sender === "User";
      const isAI = ai && (ai.sender === "Machine" || ai.sender === "AI");
      if (!isUser || !isAI) continue;

      // ดึง tool_use ภายใน content_blocks ของข้อความฝั่ง AI
      const toolInfo = [];
      try {
        const blocks = Array.isArray(ai.content_blocks) ? ai.content_blocks : [];
        for (const b of blocks) {
          const contents = Array.isArray(b?.contents) ? b.contents : [];
          for (const c of contents) {
            if (c && c.type === "tool_use") {
              toolInfo.push({ name: c.name, input: c.tool_input, output: c.output });
            }
          }
        }
      } catch (_) {}

      const item = {
        input: typeof user?.text === "string" ? user.text : "",
        output: typeof ai?.text === "string" ? ai.text : "",
        session_id: user?.session_id || ai?.session_id,
      };

      // แนบ timestamp จากฟิลด์ที่มีจริงในตัวอย่าง (timestamp) และ fallback เป็น created_at หากมี
      const ts = ai?.timestamp || user?.timestamp || ai?.created_at || user?.created_at;
      if (ts) {
        item.timestamp = ts;
      }

      if (toolInfo.length > 0) {
        item.tool = toolInfo;
      }

      // แนบ content_blocks ของฝั่ง AI ไว้สำหรับ UI ถ้าปลายทางส่งมา
      if (Array.isArray(ai?.content_blocks) && ai.content_blocks.length > 0) {
        item.content_blocks = ai.content_blocks;
      }

      output.push(item);
    }

    return output;
  }

  /**
   * ลบประวัติทั้งหมดของ session ที่ระบุ
   * @param {string} sessionId
   * @returns {Promise<{ success: boolean, status: number, message?: string }>} 
   */
  async deleteSession(sessionId) {
    const { langflowUrl, apiKey } = this.settings;
    if (!langflowUrl) {
      throw new Error("กรุณากำหนดค่า Langflow URL ในหน้าตั้งค่าก่อน");
    }
    if (!sessionId) {
      throw new Error("กรุณาระบุ sessionId ที่ต้องการลบ");
    }

    const url = `${langflowUrl.replace(/\/$/, "")}/api/v1/monitor/messages/session/${encodeURIComponent(
      sessionId
    )}`;

    const headers = {};
    if (apiKey) {
      headers["x-api-key"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, { method: "DELETE", headers, mode: "cors", cache: "no-store" });
    if (!response.ok) {
      const text = await response.text();
      const friendly = (text && (/(<!doctype html|<html|<body)/i).test(text))
        ? "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้"
        : text;
      return { success: false, status: response.status, message: friendly };
    }
    return { success: true, status: response.status };
  }

  /**
   * สรุปรายการเซสชันสำหรับแสดงใน Sidebar (คล้าย ChatGPT)
   * จะ group จากผล getMessages(all=true) ด้วย session_id และเลือกข้อความล่าสุดเป็น preview/title
   * @param {number} limit จำนวนสูงสุดของเซสชันที่จะคืนค่า (ค่าเริ่มต้น 50)
   * @returns {Promise<Array<{ session_id: string, title: string, preview: string, timestamp: number }>>}
   */
  async listSessions(limit = 50) {
    const allPairs = await this.getMessages({ all: true });
    const bySession = new Map();

    for (const pair of allPairs) {
      const sessionId = pair.session_id || "";
      if (!sessionId) continue;
      const ts = pair.timestamp ? Date.parse(pair.timestamp) || Date.now() : Date.now();
      const previewText = pair.input || pair.output || "";
      const rec = bySession.get(sessionId);
      if (!rec || ts >= rec.timestamp) {
        bySession.set(sessionId, {
          session_id: sessionId,
          title: previewText.slice(0, 24) || "แชต",
          preview: previewText.slice(0, 80),
          timestamp: ts,
        });
      }
    }

    const sessions = Array.from(bySession.values()).sort((a, b) => b.timestamp - a.timestamp);
    return sessions.slice(0, limit);
  }

  /**
   * ดึงข้อความเต็มของเซสชันและแปลงเป็นโครงสร้างที่หน้าแชตใช้
   * @param {string} sessionId
   * @returns {Promise<Array<{ id: number, type: 'user'|'assistant', content: string, timestamp: Date, contentBlocks?: any }>>}
   */
  async getSessionMessages(sessionId) {
    const pairs = await this.getMessages({ sessionId, all: false });
    const messages = [];
    for (const pair of pairs) {
      if (pair.input) {
        messages.push({
          id: Date.now() + messages.length * 2 + 1,
          type: "user",
          content: pair.input,
          timestamp: new Date(pair.timestamp || Date.now()),
        });
      }
      if (pair.output) {
        const blocks = Array.isArray(pair.content_blocks) && pair.content_blocks.length > 0
          ? pair.content_blocks
          : this.buildContentBlocksFromTools(pair.tool || []);
        messages.push({
          id: Date.now() + messages.length * 2 + 2,
          type: "assistant",
          content: pair.output,
          timestamp: new Date(pair.timestamp || Date.now()),
          contentBlocks: blocks,
        });
      }
    }
    return messages;
  }

  /**
   * แปลง tool array ให้เป็น content_blocks แบบที่ UI ใช้แสดง
   * @param {Array<{name: string, input: any, output: any}>} tools
   */
  buildContentBlocksFromTools(tools) {
    if (!Array.isArray(tools) || tools.length === 0) return null;
    return [
      {
        title: "Agent Steps",
        contents: tools.map((t) => ({
          type: "tool_use",
          name: t.name,
          tool_input: t.input,
          output: t.output,
        })),
      },
    ];
  }
}

// สร้าง instance เดียวสำหรับใช้ทั้งแอป
export const langflowAPI = new LangflowAPI();

export default langflowAPI;
