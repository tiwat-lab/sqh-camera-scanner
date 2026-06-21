"use strict";

const cameraPreview = document.getElementById("cameraPreview");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const startCameraButton = document.getElementById("startCameraButton");
const stopCameraButton = document.getElementById("stopCameraButton");
const cameraStatus = document.getElementById("cameraStatus");
const cameraError = document.getElementById("cameraError");

let currentStream = null;
let isRequestingCamera = false;
let shouldKeepCameraActive = false;
let cameraRequestId = 0;

function setStatus(message) {
  cameraStatus.textContent = message;
}

function setError(message) {
  cameraError.textContent = message;
}

function clearError() {
  setError("ยังไม่มีข้อผิดพลาด");
}

function setControlsForCamera(isActive) {
  startCameraButton.disabled = isActive || isRequestingCamera;
  stopCameraButton.disabled = !isActive && !isRequestingCamera;
  previewPlaceholder.classList.toggle("is-hidden", isActive);
}

function stopCamera() {
  shouldKeepCameraActive = false;
  cameraRequestId += 1;

  if (currentStream) {
    currentStream.getTracks().forEach((track) => {
      track.stop();
    });
  }

  currentStream = null;
  cameraPreview.srcObject = null;
  setStatus("ปิดกล้องแล้ว");
  setControlsForCamera(false);
}

function isCameraSupported() {
  return Boolean(
    navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
  );
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

    if (!shouldKeepCameraActive || requestId !== cameraRequestId) {
      stopCamera();
      return;
    }

    setStatus("เปิดกล้องแล้ว");
    clearError();
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

window.addEventListener("pagehide", stopCamera);
window.addEventListener("beforeunload", stopCamera);

setControlsForCamera(false);
