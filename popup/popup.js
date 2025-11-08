// popup.js — VoiceNav
console.log("✅ VoiceNav popup loaded.");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const commandText = document.getElementById("commandText");

let recognition;

// 🎤 Main Function: Start Listening
// Marked 'async' because we use 'await' inside it for microphone permission
async function startListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Sorry, your browser does not support speech recognition.");
    return;
  }

  // Request mic permission
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    statusEl.textContent = "Error: Mic access denied.";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    statusEl.textContent = "Status: Listening...";
    startBtn.disabled = true;
    stopBtn.disabled = false;
  };

  // We don't strictly need 'async' here if we don't 'await' the sendMessage,
  // but it's good practice if you want to use promises later.
 recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    commandText.textContent = `"${text}"`;
    statusEl.textContent = "Status: Processing...";

    // Get the debug log element (ensure this exists in your HTML)
    const debugLog = document.getElementById("debugLog");

    console.log("🗣 Sending to background:", text);
    if (debugLog) debugLog.textContent += `📤 Sending: "${text}"\n`;

    // Send to background and wait for a detailed response
    chrome.runtime.sendMessage({ type: "PROCESS_TEXT", text: text }, (response) => {
        // 1. Handle fatal connection errors (background script crashed or unreachable)
        if (chrome.runtime.lastError) {
             const errMsg = chrome.runtime.lastError.message;
             console.warn("Background unreachable:", errMsg);
             statusEl.textContent = "Error: Background unreachable.";
             if (debugLog) debugLog.textContent += `❌ Critical Error: ${errMsg}\n`;
             return;
        }

        // 2. Handle the structured response from background.js
        if (response && response.status === "success") {
            statusEl.textContent = "Status: Success! ✅";
            if (debugLog) debugLog.textContent += `✅ ${response.message}\n`;
            // Optional: automatically close popup after success
            // setTimeout(() => window.close(), 1000);
        } else {
            statusEl.textContent = "Status: Failed ❌";
            // Show the specific error (e.g., "Please refresh page")
            if (debugLog) debugLog.textContent += `⚠️ Error: ${response?.message || "Unknown error"}\n`;
        }
    });
  };

  recognition.onerror = (event) => {
    console.error("Recognition error:", event.error);
    statusEl.textContent = "Error: " + event.error;
    stopUI();
  };

  recognition.onend = () => {
    if (statusEl.textContent === "Status: Listening...") {
        statusEl.textContent = "Status: Idle";
    }
    stopUI();
  };

  recognition.start();
}

function stopListening() {
  if (recognition) {
    recognition.stop();
    statusEl.textContent = "Status: Stopped.";
  }
  stopUI();
}

function stopUI() {
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

// Event Listeners
// These don't need to be async unless you await startListening() inside them.
startBtn.addEventListener("click", startListening);
stopBtn.addEventListener("click", stopListening);