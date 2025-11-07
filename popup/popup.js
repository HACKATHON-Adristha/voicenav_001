// popup.js
console.log("✅ VoiceNav popup.js loaded and ready.");

// Get UI elements
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const commandText = document.getElementById("commandText");

let recognition;

// Logging helper
function log(message) {
  console.log(message);
}

// 🧠 Function: Start listening for voice input
async function startListening() {
  try {
    log("🎙 Start Listening clicked.");
    statusEl.textContent = "Status: Requesting microphone access...";
    commandText.textContent = "";

    // Check if SpeechRecognition API is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    // Ask for mic permission first (avoids silent denials)
    log("🎤 Requesting microphone permission...");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      log("✅ Microphone permission granted.");
    } catch (err) {
      log("🚫 Microphone permission blocked: " + err.message);
      alert(
        "VoiceNav needs microphone access.\n\nPlease click the microphone icon in Chrome’s address bar and choose 'Allow'."
      );
      statusEl.textContent = "Status: Mic permission denied.";
      return;
    }

    // Initialize Speech Recognition
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    // When recognition starts
    recognition.onstart = () => {
      statusEl.textContent = "Status: Listening...";
      startBtn.disabled = true;
      stopBtn.disabled = false;
      log("🎧 Listening...");
    };

    // When speech is recognized
    recognition.onresult = async (event) => {
      const text = event.results[0][0].transcript;
      commandText.textContent = text;
      statusEl.textContent = "Status: Processing...";
      log("🗣 Recognized text:", text);

      // Send the command to the active tab (content.js)
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { type: "VOICE_COMMAND", text });
        log("📤 Command sent to content.js:", text);
      } else {
        log("⚠️ No active tab found.");
      }

      statusEl.textContent = "Status: Idle";
    };

    // Error handler
    recognition.onerror = (e) => {
      console.error("❌ Recognition error:", e.error);
      statusEl.textContent = "Error: " + e.error;

      if (e.error === "not-allowed") {
        log("🔒 Microphone permission denied. Check Chrome settings → Site settings → Microphone.");
      }
    };

    // When recognition stops
    recognition.onend = () => {
      log("🔚 Recognition ended.");
      startBtn.disabled = false;
      stopBtn.disabled = true;
      statusEl.textContent = "Status: Idle";
    };

    recognition.start();
  } catch (err) {
    console.error("❌ Unexpected error in startListening():", err);
    statusEl.textContent = "Error: " + err.message;
  }
}

// 🛑 Stop listening
function stopListening() {
  if (recognition) {
    recognition.stop();
    statusEl.textContent = "Status: Stopped.";
    startBtn.disabled = false;
    stopBtn.disabled = true;
    log("🛑 Listening stopped by user.");
  }
}

// 🧩 Event listeners
startBtn.addEventListener("click", startListening);
stopBtn.addEventListener("click", stopListening);
