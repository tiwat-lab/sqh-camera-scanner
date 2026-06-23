# SQH Camera Scanner

Standalone Camera Scanner สำหรับทดสอบการเปิดกล้องและอ่าน QR บัตรนักเรียนบนมือถือของโปรเจกต์ SQH Camera Scanner

ขั้นตอนนี้ยังไม่เชื่อมต่อกับ Student Quest Hub, ไม่ส่งภาพหรือข้อมูลไป server และไม่เก็บข้อมูลใน browser storage

## ไฟล์ในโปรเจกต์

- `index.html` หน้าเว็บทดสอบกล้อง
- `styles.css` รูปแบบหน้าเว็บแบบ mobile-first และ responsive
- `scanner.js` JavaScript สำหรับเปิดและปิด MediaStream ของกล้อง และอ่าน QR ใน browser
- `vendor/jsQR.min.js` fallback QR decoder สำหรับ browser ที่ไม่มี BarcodeDetector
- `vendor/jsQR.LICENSE.txt` license ของ jsQR
- `.nojekyll` ใช้สำหรับ GitHub Pages ให้เสิร์ฟไฟล์ static โดยตรง

## วิธีใช้งาน

1. เปิดหน้า `index.html` ผ่าน HTTPS หรือ `localhost`
2. กดปุ่ม `เปิดกล้อง`
3. อนุญาตสิทธิ์กล้องเมื่อ browser ถาม
4. นำ QR ที่รองรับเข้าในกรอบสแกน
5. ตรวจสอบสถานะ, payload และ StudentId ที่แสดงบนหน้าเว็บ
6. กด `สแกนใหม่` เมื่อต้องการเคลียร์ผลลัพธ์ล่าสุดและอ่าน QR ใบเดิมซ้ำ
7. กดปุ่ม `ปิดกล้อง`
8. ตรวจสอบว่าไฟหรือสัญลักษณ์การใช้งานกล้องบนอุปกรณ์ดับ

> หมายเหตุ: Browser ส่วนใหญ่ไม่อนุญาตให้ใช้กล้องเมื่อเปิดไฟล์ด้วย `file://` โดยตรง ให้ใช้ HTTPS หรือ localhost สำหรับการทดสอบจริงบนมือถือ

## สิทธิ์ที่ขอ

โปรเจกต์นี้ขอเฉพาะสิทธิ์ `video` ผ่าน `navigator.mediaDevices.getUserMedia()` และไม่ขอ microphone หรือ audio

## การเลือกกล้อง

ระบบจะพยายามเปิดกล้องหลังเป็นหลักด้วย:

```js
facingMode: { ideal: "environment" }
```

ถ้า browser แจ้งว่าเงื่อนไขกล้องหลังใช้ไม่ได้ ระบบจะ fallback ไปที่ `{ audio: false, video: true }` เพื่อให้ browser เลือกกล้องที่ใช้งานได้แทน โดยไม่ทำให้หน้าเว็บล้มเหลว

ระบบจะไม่ fallback เมื่อผู้ใช้ปฏิเสธสิทธิ์กล้อง, หน้าเว็บไม่ใช่ secure context, browser ไม่รองรับกล้อง, ไม่พบกล้อง หรือกล้องถูกใช้งานอยู่ เพื่อหลีกเลี่ยงการขอสิทธิ์ซ้ำโดยไม่จำเป็น

## การหยุดกล้อง

เมื่อกด `ปิดกล้อง`, ปิดหน้าเว็บ หรือออกจากหน้า ระบบจะพยายามหยุดกล้องโดย:

- เรียก `stop()` กับ `MediaStreamTrack` ทุกตัว
- ล้าง `video.srcObject`
- เปลี่ยนสถานะเป็น `ปิดกล้องแล้ว`

ก่อนเปิดกล้องใหม่ ระบบจะหยุด MediaStream เดิมก่อนเสมอ เพื่อป้องกัน stream ซ้ำ

## รูปแบบ QR ที่รองรับ

รองรับเฉพาะ payload รูปแบบนี้:

```text
SQH1|STUDENT|<StudentId>
```

เงื่อนไขของ `StudentId`:

- ใช้ตัวอักษรภาษาอังกฤษ ตัวเลข `_` หรือ `-` เท่านั้น
- ความยาว 1-64 ตัวอักษร
- ระบบจะ trim ช่องว่างส่วนเกินก่อนตรวจรูปแบบ

ตัวอย่างสำหรับทดสอบ:

```text
SQH1|STUDENT|TEST_STUDENT-001
```

หาก QR ไม่ขึ้นต้นด้วย `SQH1|STUDENT|` ระบบจะแสดงว่า `ไม่ใช่บัตร Student Quest Hub` หากขึ้นต้นถูกแต่ `StudentId` ไม่ตรงเงื่อนไข ระบบจะแสดงว่า `ข้อมูลบัตรนักเรียนไม่ถูกต้อง`

## QR decoder

ระบบเลือก decoder ตามความสามารถของ browser:

1. ใช้ `BarcodeDetector` API ก่อน หาก browser รองรับ `qr_code`
2. fallback เป็น `jsQR` v1.4.0 หาก browser ไม่รองรับ BarcodeDetector หรือไม่รองรับ QR code

`jsQR` เป็น client-side QR decoder ที่ไม่มี tracking หรือ analytics ใช้ภายใต้ license `Apache-2.0` และถูกเก็บไว้ใน repository ที่ `vendor/jsQR.min.js` เพื่อให้หน้า scanner ทำงานได้โดยไม่ต้องโหลด CDN ระหว่างใช้งาน

## ความเป็นส่วนตัว

การประมวลผลทั้งหมดเกิดใน browser:

- ไม่อัปโหลดภาพกล้อง
- ไม่ส่ง payload ไป server
- ไม่เรียก Google Apps Script
- ไม่ใช้ `postMessage`
- ไม่ใช้ `localStorage` หรือ `sessionStorage`
- ไม่บันทึก payload หลังปิดหรือรีเฟรชหน้าเว็บ

## การป้องกันผลซ้ำ

ระบบจำ payload ล่าสุดและมี cooldown 1,500 มิลลิวินาที เพื่อไม่ให้ QR ใบเดิมสร้างผลลัพธ์ซ้ำทุก frame หากต้องการอ่านใบเดิมทันที ให้กด `สแกนใหม่`

## ข้อความผิดพลาดที่รองรับ

- Browser ไม่รองรับกล้อง
- ผู้ใช้ไม่อนุญาตให้ใช้กล้อง
- ไม่พบกล้อง
- กล้องถูกใช้งานอยู่
- หน้าเว็บไม่ได้ทำงานใน secure context
- ข้อผิดพลาดอื่นระหว่างเปิดกล้อง
