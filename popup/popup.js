let recognition;
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const commandText = document.getElementById("commandText");
const debugLog = document.getElementById("debugLog");

function log(msg) {
  console.log(msg);
  debugLog.textContent += msg + "\n";
}

log("✅ popup.js loaded and ready.");

async function requestMicrophonePermission() {
  log("🎤 Requesting microphone permission...");
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    log("✅ Microphone permission granted.");
    return true;
  } catch (err) {
    log("🚫 Microphone permission blocked: " + err.message);
    alert("Please allow microphone access in Chrome settings to use VoiceNav.");
    return false;
  }
}

async function startListening() {
  log("🎙 Start Listening clicked.");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech recognition not supported in this browser. Please use Google Chrome.");
    log("❌ SpeechRecognition API not found.");
    return;
  }

  const micAllowed = await requestMicrophonePermission();
  if (!micAllowed) {
    log("🔒 Cannot start listening — mic access denied.");
    return;
  }

  try {
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;

    recognition.onstart = () => {
      statusEl.textContent = "Status: Listening...";
      startBtn.disabled = true;
      stopBtn.disabled = false;
      log("🟢 Recognition started successfully.");
    };

    recognition.onresult = async (event) => {
      const text = event.results[0][0].transcript;
      commandText.textContent = text;
      statusEl.textContent = "Status: Processing...";
      log(`🗣 Heard: "${text}"`);

      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          chrome.tabs.sendMessage(tab.id, { type: "VOICE_COMMAND", text });
          log(`📨 Sent command to content.js for tab ${tab.id}`);
        } else {
          log("⚠️ No active tab found.");
        }
      } catch (err) {
        log("❌ Error sending command: " + err.message);
      }

      statusEl.textContent = "Status: Idle";
    };

    recognition.onerror = (e) => {
      console.error(e);
      statusEl.textContent = "Error: " + e.error;
      log("❌ Recognition error: " + e.error);
      if (e.error === "not-allowed") {
        log("🔒 Microphone permission denied. Check Chrome settings → Site settings → Microphone.");
      }
    };

    recognition.onend = () => {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      statusEl.textContent = "Status: Idle";
      log("🔚 Recognition ended.");
    };

    recognition.start();
  } catch (error) {
    log("💥 Exception starting recognition: " + error.message);
  }
}

function stopListening() {
  if (recognition) {
    recognition.stop();
    log("🛑 Stop button clicked. Recognition stopped.");
  } else {
    log("⚠️ Tried to stop but recognition is undefined.");
  }
}

startBtn.addEventListener("click", startListening);
stopBtn.addEventListener("click", stopListening);
