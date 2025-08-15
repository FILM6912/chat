# Lanxin AMR Assistant - คู่มือการใช้งาน

## ภาพรวม

Lanxin AMR Assistant เป็นเว็บแอปพลิเคชันสำหรับแชทกับ AI ที่เชื่อมต่อกับ Langflow และรองรับการแปลงเสียงเป็นข้อความ

## การใช้งาน

### การตั้งค่าครั้งแรก

1. เปิดเว็บแอป
2. ไปที่หน้า **Settings** ในแถบเมนูบนสุด
3. กรอกข้อมูลต่อไปนี้:

   - **Langflow URL**: `http://192.168.195.200`
   - **API Key**: `c964a914-6d34-43e3-9321-48b6eda64a30`
   - **Flow ID**: `sk-7XY-g3pi0HJbxPRCh5DKkTSoDpUFyxkI7n0k7SEskK8`
   - **Speech to Text URL**: (ไม่บังคับ - จะใช้ Web Speech API ของเบราว์เซอร์)

4. คลิกปุ่ม **ทดสอบ** เพื่อตรวจสอบการเชื่อมต่อ
5. คลิก **บันทึกการตั้งค่า**

### การใช้งานหน้าแชท

#### การส่งข้อความ

1. ไปที่หน้า **Chat**
2. พิมพ์ข้อความในช่องข้อความด้านล่าง
3. กด **Enter** หรือคลิกปุ่ม **ส่ง**

**หมายเหตุ**: AI จะตอบกลับในรูปแบบ Markdown ซึ่งจะแสดงผลสวยงามโดยอัตโนมัติ (รองรับ Dark Mode)

#### การใช้งานเสียง (Speech-to-Text)

**วิธีที่ 1: ปุ่มไมโครโฟนในช่องข้อความ**

1. คลิกปุ่มไมโครโฟน (🎤) ในช่องข้อความ
2. พูดข้อความที่ต้องการ
3. ระบบจะแปลงเสียงเป็นข้อความโดยอัตโนมัติ
4. ตรวจสอบข้อความแล้วกดส่ง

**วิธีที่ 2: Voice Command (แนะนำ) ⚡**

1. กด **Space** หรือ **Ctrl+Shift+V**
2. หน้าต่างลอย Voice Command จะเปิดขึ้น
3. กด "เริ่มพูด" หรือกด Space อีกครั้ง
4. พูดข้อความพร้อมดู Real-time transcription
5. ระบบจะส่งข้อความไปยัง AI โดยอัตโนมัติ

**วิธีที่ 3: Floating Voice Button**

- คลิกปุ่มลอยสีม่วง-ชมพูมุมล่างขวา
- ใช้งานเหมือนวิธีที่ 2

#### การเปลี่ยน Dark Mode / Light Mode

- คลิกปุ่ม **🌙** (Dark Mode) หรือ **☀️** (Light Mode) ที่ Header
- ระบบจะจดจำการตั้งค่าใน localStorage
- รองรับ System preference detection
- All components เปลี่ยนสีแบบ smooth transition

## ฟีเจอร์หลัก

### 🎨 UI/UX สวยงาม

- ดีไซน์ทันสมัยด้วย Tailwind CSS
- **🌙 Dark Mode / Light Mode** - สลับธีมได้
- Gradient และ Glass morphism effects
- Responsive design รองรับทุกขนาดหน้าจอ
- แชทบับเบิ้ลที่สวยงาม
- แสดงเวลาในข้อความ
- Smooth transitions ทุก UI components

### 💬 ระบบแชท

- เชื่อมต่อกับ Langflow API จริง
- รองรับ session management
- แสดงสถานะ "กำลังพิมพ์..."
- Error handling ที่ครบถ้วน
- **รองรับ Markdown แบบเต็มรูปแบบ** ✨

#### Markdown Features:

- **Headers** (H1-H4)
- **Lists** (ordered/unordered)
- **Code blocks** และ inline code
- **Bold**, _italic_, ~~strikethrough~~
- [Links](https://example.com)
- Tables
- > Blockquotes
- Images
- Horizontal rules

### 🎤 Speech-to-Text & Voice Command

- รองรับการแปลงเสียงเป็นข้อความ
- ใช้ Web Speech API ของเบราว์เซอร์
- รองรับภาษาไทย
- สามารถกำหนด Custom Speech API ได้
- **🎵 Voice Command ทันที** - กด Space หรือ Ctrl+Shift+V
- **📱 Floating Voice Button** - ปุ่มลอยมุมล่างขวา
- **⚡ Real-time Transcription** - ดูข้อความขณะพูด
- **🔊 Audio Visualizer** - แสดงระดับเสียงแบบ real-time

### ⚙️ ระบบตั้งค่า

- บันทึกการตั้งค่าใน Local Storage
- ทดสอบการเชื่อมต่อแต่ละบริการ
- อัปเดตการตั้งค่าแบบ real-time

## การแก้ไขปัญหา

### ไม่สามารถเชื่อมต่อกับ Langflow ได้

1. ตรวจสอบ URL ให้ถูกต้อง
2. ตรวจสอบ API Key และ Flow ID
3. ตรวจสอบการเชื่อมต่อเครือข่าย
4. ลองใช้ปุ่ม "ทดสอบ" ในหน้าตั้งค่า

### Speech-to-Text ใช้งานไม่ได้

1. ตรวจสอบว่าเบราว์เซอร์รองรับ Web Speech API
2. อนุญาตให้เว็บไซต์เข้าถึงไมโครโฟน
3. ตรวจสอบการเชื่อมต่อไมโครโฟน

### ข้อความตอบกลับแปลกๆ

1. ตรวจสอบการตั้งค่า Flow ใน Langflow
2. ตรวจสอบ Flow ID ให้ถูกต้อง
3. ลองทดสอบ Flow ใน Langflow โดยตรง

## ข้อมูลเทคนิค

### เทคโนโลยีที่ใช้

- **Frontend**: React 19, Vite 7
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **API**: Fetch API
- **Speech**: Web Speech API

### การจัดเก็บข้อมูล

- การตั้งค่าถูกบันทึกใน `localStorage`
- ประวัติแชทจะหายไปเมื่อรีเฟรชหน้า (session-based)

### Browser Support

- Chrome (แนะนำ)
- Firefox
- Safari
- Edge

\*สำหรับ Speech-to-Text แนะนำให้ใช้ Chrome เพื่อประสิทธิภาพที่ดีที่สุด

## การพัฒนาต่อ

หากต้องการเพิ่มฟีเจอร์:

1. ดู source code ใน `src/` directory
2. Services อยู่ใน `src/services/`
3. Components อยู่ใน `src/components/`
4. Pages อยู่ใน `src/pages/`
