"use strict";

const openScannerButton = document.getElementById("openScannerButton");
const testStatus = document.getElementById("testStatus");
const testError = document.getElementById("testError");
const messageSource = document.getElementById("messageSource");
const messageVersion = document.getElementById("messageVersion");
const messageType = document.getElementById("messageType");
const messageStudentId = document.getElementById("messageStudentId");
const messagePayload = document.getElementById("messagePayload");
const messageScannedAt = document.getElementById("messageScannedAt");

const studentIdPattern = /^[A-Za-z0-9_-]{1,64}$/;
let scannerWindow = null;

function setTestError(message) {
  testError.textContent = message;
}

function clearTestError() {
  setTestError("ยังไม่มีข้อผิดพลาด");
}

function setMessageResult(data) {
  messageSource.textContent = data.source;
  messageVersion.textContent = String(data.version);
  messageType.textContent = data.type;
  messageStudentId.textContent = data.studentId;
  messagePayload.textContent = data.payload;
  messageScannedAt.textContent = data.scannedAt;
}

function createScannerUrl() {
  const scannerUrl = new URL("./", window.location.href);
  scannerUrl.searchParams.set("mode", "sqh");
  scannerUrl.searchParams.set("origin", window.location.origin);
  return scannerUrl.href;
}

function isValidScannerMessage(data) {
  return Boolean(
    data &&
      data.source === "SQH_CAMERA_SCANNER" &&
      data.version === 1 &&
      data.type === "SQH_STUDENT_SCANNED" &&
      studentIdPattern.test(data.studentId) &&
      data.payload === `SQH1|STUDENT|${data.studentId}` &&
      typeof data.scannedAt === "string" &&
      !Number.isNaN(Date.parse(data.scannedAt))
  );
}

openScannerButton.addEventListener("click", () => {
  clearTestError();

  if (scannerWindow && scannerWindow.closed !== true) {
    scannerWindow.focus();
    testStatus.textContent = "Scanner เปิดอยู่แล้ว";
    return;
  }

  const scannerUrl = createScannerUrl();
  scannerWindow = window.open(scannerUrl, "sqhCameraScannerTest");

  if (!scannerWindow) {
    setTestError("Popup ถูกบล็อก กรุณาอนุญาตให้เปิดหน้าต่างใหม่");
    testStatus.textContent = "เปิด Scanner ไม่สำเร็จ";
    return;
  }

  testStatus.textContent = "เปิด Scanner แล้ว กำลังรอผลการสแกน";
});

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) {
    return;
  }

  if (event.source !== scannerWindow) {
    return;
  }

  if (!isValidScannerMessage(event.data)) {
    setTestError("ได้รับ message แต่รูปแบบไม่ตรง contract");
    return;
  }

  clearTestError();
  setMessageResult(event.data);
  testStatus.textContent = "ได้รับผลจาก Scanner แล้ว";
});
