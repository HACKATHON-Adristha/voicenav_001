// popup.js — VoiceNav
console.log("✅ VoiceNav popup loaded.");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const commandText = document.getElementById("commandText");
const debugLog = document.getElementById("debugLog");

let recognition;

// Start listening (requests mic permission first)
async function startListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Sorry — speech recognition not supported in this browser.");
    return;
  }

  // Request mic permission via navigator.mediaDevices so Chrome shows permission prompt
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    statusEl.textContent = "Error: Mic access denied.";
    if (debugLog) debugLog.textContent += `❌ Mic access denied: ${err.message}\n`;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onstart = () => {
    statusEl.textContent = "🎙 Listening...";
    startBtn.disabled = true;
    stopBtn.disabled = false;
    if (debugLog) debugLog.textContent += `🎙 Start Listening\n`;
  };

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript.trim();
    commandText.textContent = `"${text}"`;
    statusEl.textContent = "⏳ Processing...";
    if (debugLog) debugLog.textContent += `📥 Heard: "${text}"\n`;

    // Send to background for intent parsing
    chrome.runtime.sendMessage({ type: "PROCESS_TEXT", text }, (response) => {
      if (chrome.runtime.lastError) {
        const msg = chrome.runtime.lastError.message;
        console.warn("Background unreachable:", msg);
        statusEl.textContent = "Error: Background unreachable";
        if (debugLog) debugLog.textContent += `⚠️ ${msg}\n`;
        stopUI();
        return;
      }

      if (response?.status === "success") {
        statusEl.textContent = "✅ Success";
        if (debugLog) debugLog.textContent += `✅ ${response.message}\n`;
      } else {
        statusEl.textContent = "❌ Failed";
        if (debugLog) debugLog.textContent += `⚠️ ${response?.message || "Unknown error"}\n`;
      }

      // keep popup open so user sees status; popup will not auto-close
    });
  };

  recognition.onerror = (event) => {
    console.error("Recognition error:", event.error);
    statusEl.textContent = "Error: " + event.error;
    if (debugLog) debugLog.textContent += `❌ Recognition error: ${event.error}\n`;
    stopUI();
  };

  recognition.onend = () => {
    // ensure UI buttons restored
    stopUI();
    if (statusEl.textContent === "🎙 Listening...") statusEl.textContent = "Idle";
    if (debugLog) debugLog.textContent += `🔚 Recognition ended\n`;
  };

  recognition.start();
}

function stopListening() {
  if (recognition) recognition.stop();
  statusEl.textContent = "Stopped.";
  stopUI();
}

function stopUI() {
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

// Attach listeners
startBtn.addEventListener("click", startListening);
stopBtn.addEventListener("click", stopListening);
