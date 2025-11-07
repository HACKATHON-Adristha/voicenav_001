<<<<<<< HEAD
// popup.js
=======
// popup.js — VoiceNav (Final Version)
>>>>>>> bc4a5ddf128804a8c29afca31bf75c775030a6b2
console.log("✅ VoiceNav popup.js loaded and ready.");

// Get UI elements
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const commandText = document.getElementById("commandText");

let recognition;

<<<<<<< HEAD
// Logging helper
function log(message) {
  console.log(message);
}

// 🧠 Function: Start listening for voice input
=======
// Helper log function
function log(msg) {
  console.log(msg);
}

// 🧠 Function: Start Listening
>>>>>>> bc4a5ddf128804a8c29afca31bf75c775030a6b2
async function startListening() {
  try {
    log("🎙 Start Listening clicked.");
    statusEl.textContent = "Status: Requesting microphone access...";
    commandText.textContent = "";

<<<<<<< HEAD
    // Check if SpeechRecognition API is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    // Ask for mic permission first (avoids silent denials)
    log("🎤 Requesting microphone permission...");
    try {
=======
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    // ✅ Step 1: Ask for microphone permission first
    try {
      log("🎤 Requesting microphone permission...");
>>>>>>> bc4a5ddf128804a8c29afca31bf75c775030a6b2
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

<<<<<<< HEAD
    // Initialize Speech Recognition
=======
    // ✅ Step 2: Initialize recognition
>>>>>>> bc4a5ddf128804a8c29afca31bf75c775030a6b2
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

<<<<<<< HEAD
    // When recognition starts
=======
    // On recognition start
>>>>>>> bc4a5ddf128804a8c29afca31bf75c775030a6b2
    recognition.onstart = () => {
      statusEl.textContent = "Status: Listening...";
      startBtn.disabled = true;
      stopBtn.disabled = false;
      log("🎧 Listening...");
    };

<<<<<<< HEAD
    // When speech is recognized
=======
    // When a result is recognized
>>>>>>> bc4a5ddf128804a8c29afca31bf75c775030a6b2
    recognition.onresult = async (event) => {
      const text = event.results[0][0].transcript;
      commandText.textContent = text;
      statusEl.textContent = "Status: Processing...";
      log("🗣 Recognized text:", text);

<<<<<<< HEAD
      // Send the command to the active tab (content.js)
=======
      // Send command to active tab
>>>>>>> bc4a5ddf128804a8c29afca31bf75c775030a6b2
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { type: "VOICE_COMMAND", text });
        log("📤 Command sent to content.js:", text);
      } else {
<<<<<<< HEAD
        log("⚠️ No active tab found.");
=======
        log("⚠ No active tab found.");
>>>>>>> bc4a5ddf128804a8c29afca31bf75c775030a6b2
      }

      statusEl.textContent = "Status: Idle";
    };

<<<<<<< HEAD
    // Error handler
=======
    // 🔧 Improved Error Handler
>>>>>>> bc4a5ddf128804a8c29afca31bf75c775030a6b2
    recognition.onerror = (e) => {
      console.error("❌ Recognition error:", e.error);
      statusEl.textContent = "Error: " + e.error;

<<<<<<< HEAD
      if (e.error === "not-allowed") {
        log("🔒 Microphone permission denied. Check Chrome settings → Site settings → Microphone.");
=======
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        console.warn("🔒 Microphone permission denied or blocked.");
        alert(
          "Microphone access is blocked.\n\nTo fix this:\n1. Click the microphone icon in Chrome's address bar.\n2. Select 'Always allow'.\n3. Reload the page and try again."
        );
        statusEl.textContent = "Status: Mic access blocked.";

        // Retry permission request automatically after 2 seconds
        setTimeout(() => {
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => console.log("🎤 Microphone re-allowed, ready for next try."))
            .catch(() => console.warn("🚫 Still blocked, please allow manually."));
        }, 2000);
      } else if (e.error === "network") {
        alert("Network error — please check your internet connection.");
      } else if (e.error === "no-speech") {
        statusEl.textContent = "No speech detected. Please try again.";
      } else {
        alert("An error occurred: " + e.error);
>>>>>>> bc4a5ddf128804a8c29afca31bf75c775030a6b2
      }

      startBtn.disabled = false;
      stopBtn.disabled = true;
    };

<<<<<<< HEAD
    // When recognition stops
=======
    // On recognition end
>>>>>>> bc4a5ddf128804a8c29afca31bf75c775030a6b2
    recognition.onend = () => {
      log("🔚 Recognition ended.");
      startBtn.disabled = false;
      stopBtn.disabled = true;
      statusEl.textContent = "Status: Idle";
    };

    // ✅ Start recognition
    recognition.start();
  } catch (err) {
    console.error("❌ Unexpected error in startListening():", err);
    statusEl.textContent = "Error: " + err.message;
  }
}

<<<<<<< HEAD
// 🛑 Stop listening
=======
// 🛑 Stop Listening
>>>>>>> bc4a5ddf128804a8c29afca31bf75c775030a6b2
function stopListening() {
  if (recognition) {
    recognition.stop();
    statusEl.textContent = "Status: Stopped.";
    startBtn.disabled = false;
    stopBtn.disabled = true;
    log("🛑 Listening stopped by user.");
  }
}

<<<<<<< HEAD
// 🧩 Event listeners
=======
// Event listeners
>>>>>>> bc4a5ddf128804a8c29afca31bf75c775030a6b2
startBtn.addEventListener("click", startListening);
stopBtn.addEventListener("click", stopListening);