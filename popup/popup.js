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
    statusEl.textContent = "Status: Sending to AI...";

    console.log("🗣 Sending to background:", text);

    // Send raw text to background.js
    // We use the standard callback here to avoid async/await confusion
    chrome.runtime.sendMessage({ type: "PROCESS_TEXT", text: text }, () => {
        // Check if the background script received it okay
        if (chrome.runtime.lastError) {
             console.warn("Wait, background script didn't answer:", chrome.runtime.lastError.message);
             statusEl.textContent = "Error: Background sleeping?";
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