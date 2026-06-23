"use strict";

const cameraPreview = document.getElementById("cameraPreview");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const startCameraButton = document.getElementById("startCameraButton");
const stopCameraButton = document.getElementById("stopCameraButton");
const resetScanButton = document.getElementById("resetScanButton");
const cameraStatus = document.getElementById("cameraStatus");
const cameraError = document.getElementById("cameraError");
const qrPayload = document.getElementById("qrPayload");
const studentId = document.getElementById("studentId");

let currentStream = null;
let isRequestingCamera = false;
let shouldKeepCameraActive = false;
let cameraRequestId = 0;
let scanFrameId = 0;
let scanCanvas = null;
let scanCanvasContext = null;
let barcodeDetector = null;
let canUseBarcodeDetector = false;
let isScanLoopActive = false;
let isDecodeInProgress = false;
let lastDecodeAt = 0;
let lastPayload = "";
let lastPayloadAt = 0;
let hasScanSuccess = false;
let hasShownDecoderError = false;

const scanIntervalMs = 160;
const duplicateCooldownMs = 1500;
const validPayloadPrefix = "SQH1|STUDENT|";
const studentIdPattern = /^[A-Za-z0-9_-]{1,64}$/;

function setStatus(message) {
  cameraStatus.textContent = message;
}

function setError(message) {
  cameraError.textContent = message;
}

function clearError() {
  setError("ยังไม่มีข้อผิดพลาด");
}

function setScanResult(payload, parsedStudentId) {
  qrPayload.textContent = payload || "ยังไม่มีข้อมูล";
  studentId.textContent = parsedStudentId || "ยังไม่มีข้อมูล";
}

function resetScanResult() {
  lastPayload = "";
  lastPayloadAt = 0;
  hasScanSuccess = false;
  hasShownDecoderError = false;
  setScanResult("", "");

  if (currentStream) {
    setStatus("กำลังค้นหา QR");
  }
}

function setControlsForCamera(isActive) {
  startCameraButton.disabled = isActive || isRequestingCamera;
  stopCameraButton.disabled = !isActive && !isRequestingCamera;
  resetScanButton.disabled = !isActive;
  previewPlaceholder.classList.toggle("is-hidden", isActive);
}

function stopScanLoop() {
  isScanLoopActive = false;
  isDecodeInProgress = false;
  lastDecodeAt = 0;
  hasShownDecoderError = false;

  if (scanFrameId) {
    window.cancelAnimationFrame(scanFrameId);
    scanFrameId = 0;
  }
}

function stopCamera() {
  shouldKeepCameraActive = false;
  cameraRequestId += 1;
  stopScanLoop();

  if (currentStream) {
    currentStream.getTracks().forEach((track) => {
      track.stop();
    });
  }

  currentStream = null;
  cameraPreview.srcObject = null;
  resetScanResult();
  setStatus("ปิดกล้องแล้ว");
  setControlsForCamera(false);
}

function isCameraSupported() {
  return Boolean(
    navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

async function setupBarcodeDetector() {
  canUseBarcodeDetector = false;

  if (!("BarcodeDetector" in window)) {
    return;
  }

  try {
    const supportedFormats = await window.BarcodeDetector.getSupportedFormats();

    if (supportedFormats.includes("qr_code")) {
      barcodeDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
      canUseBarcodeDetector = true;
    }
  } catch (error) {
    barcodeDetector = null;
    canUseBarcodeDetector = false;
  }
}

function getReadableCameraError(error) {
  if (!window.isSecureContext) {
    return "หน้าเว็บไม่ได้ทำงานใน secure context กรุณาเปิดผ่าน HTTPS หรือ localhost";
  }

  if (!isCameraSupported()) {
    return "เบราว์เซอร์นี้ไม่รองรับการใช้งานกล้อง";
  }

  if (error.name === "NotAllowedError" || error.name === "SecurityError") {
    return "ผู้ใช้ไม่อนุญาตให้ใช้กล้อง กรุณาอนุญาตสิทธิ์กล้องในเบราว์เซอร์";
  }

  if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
    return "ไม่พบกล้องที่ใช้งานได้บนอุปกรณ์นี้";
  }

  if (error.name === "NotReadableError" || error.name === "AbortError") {
    return "ไม่สามารถเปิดกล้องได้ อาจมีกล้องถูกใช้งานอยู่โดยแอปหรือแท็บอื่น";
  }

  return "เกิดข้อผิดพลาดอื่นระหว่างเปิดกล้อง กรุณาลองใหม่อีกครั้ง";
}

async function requestCameraStream() {
  const rearCameraConstraints = {
    audio: false,
    video: {
      facingMode: { ideal: "environment" }
    }
  };

  try {
    return await navigator.mediaDevices.getUserMedia(rearCameraConstraints);
  } catch (error) {
    if (error.name !== "OverconstrainedError") {
      throw error;
    }

    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true
    });
  }
}

function parseStudentPayload(rawPayload) {
  const payload = rawPayload.trim();

  if (!payload.startsWith(validPayloadPrefix)) {
    return {
      isValid: false,
      payload,
      studentId: "",
      message: "ไม่ใช่บัตร Student Quest Hub"
    };
  }

  const parsedStudentId = payload.slice(validPayloadPrefix.length).trim();

  if (!studentIdPattern.test(parsedStudentId)) {
    return {
      isValid: false,
      payload,
      studentId: parsedStudentId,
      message: "ข้อมูลบัตรนักเรียนไม่ถูกต้อง"
    };
  }

  return {
    isValid: true,
    payload,
    studentId: parsedStudentId,
    message: "อ่านบัตรนักเรียนสำเร็จ"
  };
}

function shouldSkipDuplicate(payload, now) {
  return payload === lastPayload && now - lastPayloadAt < duplicateCooldownMs;
}

function handleDecodedPayload(rawPayload) {
  const now = Date.now();
  const payload = rawPayload.trim();

  if (!payload || shouldSkipDuplicate(payload, now)) {
    return;
  }

  lastPayload = payload;
  lastPayloadAt = now;

  const result = parseStudentPayload(payload);
  setStatus(result.message);
  setScanResult(result.payload, result.studentId);

  if (result.isValid) {
    hasScanSuccess = true;
    stopScanLoop();
    clearError();
  } else {
    setError(result.message);
  }
}

function getScanCanvasContext() {
  if (!scanCanvas) {
    scanCanvas = document.createElement("canvas");
    scanCanvasContext = scanCanvas.getContext("2d", { willReadFrequently: true });
  }

  return scanCanvasContext;
}

function decodeWithJsQr() {
  if (typeof window.jsQR !== "function") {
    if (!hasShownDecoderError) {
      setError("ไม่สามารถโหลดตัวอ่าน QR สำรองได้ กรุณาตรวจสอบไฟล์ vendor/jsQR.min.js");
      hasShownDecoderError = true;
    }

    stopScanLoop();
    return "";
  }

  const videoWidth = cameraPreview.videoWidth;
  const videoHeight = cameraPreview.videoHeight;

  if (!videoWidth || !videoHeight) {
    return "";
  }

  const context = getScanCanvasContext();

  if (!context) {
    return "";
  }

  scanCanvas.width = videoWidth;
  scanCanvas.height = videoHeight;
  try {
    context.drawImage(cameraPreview, 0, 0, videoWidth, videoHeight);

    const imageData = context.getImageData(0, 0, videoWidth, videoHeight);
    const code = window.jsQR(imageData.data, imageData.width, imageData.height);

    return code && code.data ? code.data : "";
  } catch (error) {
    if (!hasShownDecoderError) {
      setError("ไม่สามารถอ่านภาพจากกล้องเพื่อถอดรหัส QR ได้ กรุณาลองใหม่อีกครั้ง");
      hasShownDecoderError = true;
    }

    return "";
  }
}

async function decodeQrFromVideo() {
  if (canUseBarcodeDetector && barcodeDetector) {
    try {
      const barcodes = await barcodeDetector.detect(cameraPreview);
      const qrCode = barcodes.find((barcode) => barcode.format === "qr_code");

      if (qrCode && qrCode.rawValue) {
        return qrCode.rawValue;
      }

      return "";
    } catch (error) {
      canUseBarcodeDetector = false;
      barcodeDetector = null;
    }
  }

  return decodeWithJsQr();
}

function scanNextFrame(timestamp) {
  if (!isScanLoopActive || !currentStream) {
    scanFrameId = 0;
    return;
  }

  scanFrameId = window.requestAnimationFrame(scanNextFrame);

  if (
    hasScanSuccess ||
    isDecodeInProgress ||
    timestamp - lastDecodeAt < scanIntervalMs ||
    cameraPreview.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
    !cameraPreview.videoWidth ||
    !cameraPreview.videoHeight
  ) {
    return;
  }

  lastDecodeAt = timestamp;
  isDecodeInProgress = true;

  decodeQrFromVideo()
    .then((payload) => {
      if (payload) {
        handleDecodedPayload(payload);
      } else if (currentStream && !lastPayload) {
        setStatus("กำลังค้นหา QR");
      }
    })
    .catch(() => {
      if (!hasShownDecoderError) {
        setError("ไม่สามารถอ่าน QR จากภาพกล้องได้ กรุณาลองขยับบัตรหรือปรับแสง");
        hasShownDecoderError = true;
      }
    })
    .finally(() => {
      isDecodeInProgress = false;
    });
}

function startScanLoop() {
  stopScanLoop();
  isScanLoopActive = true;
  lastDecodeAt = 0;
  lastPayload = "";
  lastPayloadAt = 0;
  hasScanSuccess = false;
  hasShownDecoderError = false;
  setStatus("กำลังค้นหา QR");
  scanFrameId = window.requestAnimationFrame(scanNextFrame);
}

async function startCamera() {
  if (isRequestingCamera) {
    return;
  }

  if (!window.isSecureContext) {
    setError("หน้าเว็บไม่ได้ทำงานใน secure context กรุณาเปิดผ่าน HTTPS หรือ localhost");
    setStatus("เปิดกล้องไม่ได้");
    return;
  }

  if (!isCameraSupported()) {
    setError("เบราว์เซอร์นี้ไม่รองรับการใช้งานกล้อง");
    setStatus("เปิดกล้องไม่ได้");
    return;
  }

  isRequestingCamera = true;
  shouldKeepCameraActive = true;
  cameraRequestId += 1;
  const requestId = cameraRequestId;
  clearError();
  stopCamera();
  shouldKeepCameraActive = true;
  cameraRequestId = requestId;
  isRequestingCamera = true;
  setStatus("กำลังขอสิทธิ์ใช้งานกล้อง...");
  setControlsForCamera(false);

  try {
    const stream = await requestCameraStream();

    if (!shouldKeepCameraActive || requestId !== cameraRequestId) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      return;
    }

    currentStream = stream;
    cameraPreview.srcObject = currentStream;
    await cameraPreview.play();
    await setupBarcodeDetector();

    if (!shouldKeepCameraActive || requestId !== cameraRequestId) {
      stopCamera();
      return;
    }

    clearError();
    startScanLoop();
  } catch (error) {
    if (!shouldKeepCameraActive || requestId !== cameraRequestId) {
      return;
    }

    stopCamera();
    setStatus("เปิดกล้องไม่ได้");
    setError(getReadableCameraError(error));
  } finally {
    isRequestingCamera = false;
    setControlsForCamera(Boolean(currentStream));
  }
}

startCameraButton.addEventListener("click", startCamera);
stopCameraButton.addEventListener("click", () => {
  clearError();
  stopCamera();
});

resetScanButton.addEventListener("click", () => {
  clearError();
  resetScanResult();

  if (currentStream && !isScanLoopActive) {
    startScanLoop();
  }
});

window.addEventListener("pagehide", stopCamera);
window.addEventListener("beforeunload", stopCamera);

setScanResult("", "");
setControlsForCamera(false);
