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
