<<<<<<< HEAD
<<<<<<< HEAD
console.log("🎯 VoiceNav content script loaded.");

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "VOICE_COMMAND" && message.text) {
    const command = message.text.toLowerCase();
    console.log("🎙 Received command:", command);

    if (command.includes("scroll down")) {
      smoothScroll("down");
    } else if (command.includes("scroll up")) {
      smoothScroll("up");
    } else if (command.includes("scroll top")) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (command.includes("scroll bottom")) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } else if (command.includes("read") || command.includes("speak")) {
      readSelectedOrVisibleText();
    } else if (command.includes("open first article")) {
      openFirstArticle();
    } else {
      console.log("🤷 Unknown command:", command);
      speakText("Sorry, I did not understand that command.");
    }
  }
});

// ----------------------
// SCROLL FUNCTIONALITY
// ----------------------
function smoothScroll(direction) {
  const distance = window.innerHeight * 0.8;
  const targetPosition = direction === "down" 
    ? window.scrollY + distance 
    : window.scrollY - distance;
  window.scrollTo({ top: targetPosition, behavior: "smooth" });
  speakText(`Scrolling ${direction}`);
  console.log(`⬇️ Scrolling ${direction}`);
}

// ----------------------
// TEXT-TO-SPEECH FUNCTION
// ----------------------
function speakText(text) {
  if (!("speechSynthesis" in window)) {
    alert("Text-to-speech not supported in this browser.");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
}

// ----------------------
// READ SELECTED OR MAIN TEXT
// ----------------------
function readSelectedOrVisibleText() {
  let selectedText = window.getSelection().toString().trim();

  if (!selectedText) {
    // Try to read main visible text
    const paragraphs = Array.from(document.querySelectorAll("p, h1, h2, h3, article, section"));
    const mainText = paragraphs
      .map((el) => el.innerText)
      .filter((t) => t.length > 40)
      .slice(0, 5)
      .join(" ");
    selectedText = mainText || "No readable text found on this page.";
  }

  console.log("🗣 Reading text:", selectedText.slice(0, 200), "...");
  speakText(selectedText);
}

// ----------------------
// OPEN FIRST ARTICLE / LINK
// ----------------------
function openFirstArticle() {
  const firstLink = document.querySelector("a[href]");
  if (firstLink) {
    speakText("Opening first article.");
    window.open(firstLink.href, "_blank");
  } else {
    speakText("No links found on this page.");
  }
}

// content.js — VoiceNav
console.log("✅ VoiceNav content script active 🧠");
=======
// content.js — VoiceNav (AI Version)
console.log("✅ VoiceNav AI content script ready 🧠");
>>>>>>> 390a309 (gemini api integrated)

// 📨 Message Listener
// Now listens for pre-parsed JSON commands from background.js
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "EXECUTE_COMMAND") {
      console.log("🤖 Executing command:", message.command);
      handleCommand(message.command);
  }
});

// 🎮 Main Command Handler
function handleCommand(cmd) {
  // cmd is already a nice JSON object from Gemini, e.g., { action: "scroll", direction: "down" }
  switch (cmd.action) {
    case "scroll":
      scrollPage(cmd.direction);
      break;
    case "read":
      if (cmd.target === "selection") readSelection();
      else readVisible();
      break;
    case "navigate":
      if (cmd.to === "back") {
          window.history.back();
          speak("Going back");
      } else if (cmd.to === "forward") {
          window.history.forward();
          speak("Going forward");
      }
      break;
    case "open":
      openLink(cmd);
      break;
    case "find":
      findText(cmd.query);
      break;
    case "stop":
      speechSynthesis.cancel();
      break;
    default:
       console.log("Unknown or unhandled action:", cmd);
  }
}

// 🛠️ Action Functions (These remain exactly the same as before)

function scrollPage(direction) {
  const h = window.innerHeight * 0.8;
  if (direction === "down") window.scrollBy({ top: h, behavior: "smooth" });
  else if (direction === "up") window.scrollBy({ top: -h, behavior: "smooth" });
  else if (direction === "top") window.scrollTo({ top: 0, behavior: "smooth" });
  else if (direction === "bottom") window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

function readSelection() {
  const text = window.getSelection().toString().trim();
  if (text) speak(text);
  else speak("No text selected.");
}

function readVisible() {
  const mainContent = document.querySelector('article') || document.querySelector('main');
  let text = mainContent ? mainContent.innerText : Array.from(document.querySelectorAll('p')).map(p => p.innerText).join('. ');
  if (!text || text.length < 100) text = document.body.innerText;
  speak(text.slice(0, 2000));
}

function openLink(cmd) {
  const links = Array.from(document.querySelectorAll("a[href]")).filter(a => a.offsetWidth > 0 && a.offsetHeight > 0);
  if (links.length === 0) return speak("No visible links found.");

  if (cmd.byText) {
    const link = links.find((a) => a.innerText.toLowerCase().includes(cmd.byText.toLowerCase()));
    if (link) {
      speak(`Opening ${link.innerText.slice(0, 20)}...`);
      window.open(link.href, "_blank");
    } else {
      speak(`Could not find link for "${cmd.byText}".`);
    }
    return;
  }

  if (typeof cmd.whichIndex === "number") {
      const target = links[cmd.whichIndex];
      if (target) {
        speak("Opening link.");
        window.open(target.href, "_blank");
      } else speak("Link number not found.");
  }
}

function findText(query) {
  if (!query) return speak("Please say what to find.");
  if (window.find(query, false, false, true, false, true, false)) {
      speak(`Found ${query}.`);
  } else {
      speak(`Could not find ${query}.`);
  }
}

function speak(text) {
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  speechSynthesis.speak(utter);
}
>>>>>>> bc4a5ddf128804a8c29afca31bf75c775030a6b2
