# SQH Camera Scanner

Standalone Camera Scanner สำหรับทดสอบการเปิดกล้องและอ่าน QR บัตรนักเรียนบนมือถือของโปรเจกต์ SQH Camera Scanner

ขั้นตอนนี้ยังไม่เชื่อมต่อกับ Student Quest Hub, ไม่ส่งภาพหรือข้อมูลไป server และไม่เก็บข้อมูลใน browser storage

## ไฟล์ในโปรเจกต์

- `index.html` หน้าเว็บทดสอบกล้อง
- `styles.css` รูปแบบหน้าเว็บแบบ mobile-first และ responsive
- `scanner.js` JavaScript สำหรับเปิดและปิด MediaStream ของกล้อง, อ่าน QR ใน browser และส่งผลกลับ opener เฉพาะ integration mode
- `opener-test.html` หน้าทดสอบ message contract แบบ static โดยไม่ต้องใช้ SQH จริง
- `opener-test.js` JavaScript สำหรับหน้า `opener-test.html`
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
- ไม่ใช้ `postMessage` ใน standalone mode และใช้เฉพาะส่งผลที่ผ่าน validation กลับ `window.opener` ใน integration mode
- ไม่ใช้ `localStorage` หรือ `sessionStorage`
- ไม่บันทึก payload หลังปิดหรือรีเฟรชหน้าเว็บ

## การป้องกันผลซ้ำ

ระบบจำ payload ล่าสุดและมี cooldown 1,500 มิลลิวินาที เพื่อไม่ให้ QR ใบเดิมสร้างผลลัพธ์ซ้ำทุก frame หากต้องการอ่านใบเดิมทันที ให้กด `สแกนใหม่`

## Standalone mode

เมื่อเปิด `index.html` โดยไม่มี query parameter `mode=sqh` ระบบจะทำงานเป็นโหมดทดสอบอิสระ:

- เปิดกล้องและอ่าน QR ได้เหมือนเดิม
- แสดง payload และ StudentId บนหน้าเว็บ
- ไม่เรียก `postMessage`
- ไม่แจ้ง error เรื่องไม่มี opener

## Integration mode

เปิด Scanner ด้วย query parameter:

```text
?mode=sqh&origin=<encoded-origin>
```

ตัวอย่างรูปแบบ URL สำหรับอธิบาย:

```text
https://tiwat-lab.github.io/sqh-camera-scanner/?mode=sqh&origin=https%3A%2F%2Fexample.com
```

ในโหมดนี้ Scanner จะส่งผลกลับไปยังหน้าต่างที่เปิด Scanner ผ่าน `window.opener.postMessage()` เฉพาะเมื่อ QR ผ่าน validation แล้วเท่านั้น และจะไม่ปิดหน้าต่าง Scanner อัตโนมัติ ข้อความสถานะว่า `ส่งข้อความรหัสนักเรียนออกไปยัง Student Quest Hub แล้ว` หมายถึงเรียก `postMessage()` สำเร็จโดยไม่เกิด exception ไม่ได้ยืนยันว่าฝั่งรับประมวลผลสำเร็จ

### การตรวจ target origin

ค่า `origin` จะถูกตรวจด้วย `new URL()` แล้วใช้เฉพาะ `.origin`:

- ยอมรับเฉพาะ `https:`
- ยอมรับ `http:` เฉพาะ `localhost` หรือ `127.0.0.1` สำหรับทดสอบในเครื่อง
- หากค่าไม่ถูกต้อง ระบบจะปิด integration mode และแสดงข้อความผิดพลาด
- ไม่ยอมรับ username หรือ password ใน URL
- ไม่ใช้ target origin เป็น `"*"`
- ยังไม่ใส่ allowlist โดเมนจริงของ SQH ในขั้นนี้

### Message contract

เมื่ออ่าน QR นักเรียนสำเร็จใน integration mode ระบบจะส่ง object นี้:

```js
{
  source: "SQH_CAMERA_SCANNER",
  version: 1,
  type: "SQH_STUDENT_SCANNED",
  studentId: "<validated StudentId>",
  payload: "SQH1|STUDENT|<StudentId>",
  scannedAt: "<ISO 8601 timestamp>"
}
```

Scanner ส่งเฉพาะ `StudentId` ที่ผ่าน regex `^[A-Za-z0-9_-]{1,64}$` แล้วเท่านั้น และสร้าง `payload` สำหรับ message ใหม่จาก `StudentId` ที่ผ่าน validation แล้ว

## ทดสอบ message contract โดยไม่ใช้ SQH จริง

ใช้ `opener-test.html` เพื่อเปิด Scanner ด้วย `window.open()` และรับ message กลับ:

1. เปิด `opener-test.html` ผ่าน HTTPS หรือ localhost
2. กด `เปิด Scanner`
3. อนุญาต popup หาก browser ถาม
4. ในหน้าต่าง Scanner ให้เปิดกล้องและสแกน QR รูปแบบ `SQH1|STUDENT|TEST_STUDENT-001`
5. กลับมาดูผล message ใน `opener-test.html`

หน้า `opener-test.html` เปิด Scanner ด้วย URL path เดียวกับ GitHub Pages ของโปรเจกต์ เช่น `/sqh-camera-scanner/` เมื่อเรียกจาก `/sqh-camera-scanner/opener-test.html`

หน้า `opener-test.html` ตรวจ `event.origin`, ตรวจ `event.source` ว่าตรงกับหน้าต่าง Scanner ที่เปิดไว้ และตรวจ `source`, `version`, `type`, `StudentId`, `payload`, `scannedAt` ก่อนแสดงผลด้วย `textContent`

`event.origin` ที่ฝั่งผู้รับเห็นคือ origin ของ Scanner ซึ่งเป็นผู้ส่ง ไม่ใช่ค่า `targetOrigin` ที่ Scanner ใช้ส่ง message ใน `opener-test.html` ทั้งสองหน้าอยู่ origin เดียวกัน จึงตรวจด้วย `window.location.origin` เมื่อเชื่อมกับ SQH จริง ฝั่ง SQH ต้องตรวจ origin ของ GitHub Pages Scanner ส่วนค่า `origin` ที่ส่งเข้า Scanner มีไว้กำหนด `targetOrigin` ของหน้าต่าง SQH

Step นี้ยังไม่มี acknowledgement หรือ handshake ระหว่าง Scanner กับ SQH

## ขอบเขตที่ยังไม่ทำ

- ยังไม่มีการค้นหานักเรียน
- ยังไม่มีการบันทึก Submission
- ยังไม่มี Offline QR submission
- ยังไม่เชื่อม Google Apps Script
- ห้ามใช้ข้อมูลนักเรียนจริงในการทดสอบ

## ข้อความผิดพลาดที่รองรับ

- Browser ไม่รองรับกล้อง
- ผู้ใช้ไม่อนุญาตให้ใช้กล้อง
- ไม่พบกล้อง
- กล้องถูกใช้งานอยู่
- หน้าเว็บไม่ได้ทำงานใน secure context
- ข้อผิดพลาดอื่นระหว่างเปิดกล้อง
