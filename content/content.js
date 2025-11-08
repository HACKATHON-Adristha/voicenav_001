// content.js — VoiceNav (AI Version) (complete)
console.log("✅ VoiceNav AI content script ready 🧠");

let currentSpeakerLang = 'en-US';
let preferredVoice = null;

// 🎤 VOICE LOADER (Add this back to get female voices)
function loadVoices() {
  const allVoices = speechSynthesis.getVoices() || [];
  // Priority list for female-sounding voices
  const priority = ["Google US English", "Microsoft Zira", "Samantha"];
  preferredVoice = allVoices.find(v => priority.includes(v.name)) || allVoices[0];
  console.log("🎧 Voice selected:", preferredVoice?.name);
}
// Chrome loads voices asynchronously, so we must wait for them
speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

// --------------------- Message Listener ---------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXECUTE_COMMAND") {
    if (message.command?.replyLang) currentSpeakerLang = message.command.replyLang;
    console.log("🤖 Executing:", message.command);
    handleCommand(message.command);
    sendResponse({ status: "ok" });
    return;
  }

  if (message.type === "VOICE_COMMAND") {
    console.log("🗨 Voice command:", message.text);
    handleConversation(message.text);
    sendResponse({ status: "ok" });
    return;
  }
});

// --------------------- Conversation Handler ---------------------
function handleConversation(text) {
  if (!text) return;
  const lower = text.toLowerCase().trim();

  // 1. Casual Greetings
  if (/(hello|hi|hey|good morning|good evening)$/.test(lower)) {
    return speak(randomReply(["Hey there!", "Hello! How can I help?", "Hi! Ready when you are."]));
  }
  if (/(how are you|how's it going)$/.test(lower)) {
    return speak("I'm doing great, thanks! What can I do for you?");
  }
  if (/(who are you|what is your name)$/.test(lower)) {
    return speak("I'm VoiceNav, your AI browsing assistant.");
  }
  if (/(thank you|thanks)$/.test(lower)) {
    return speak("You're welcome!");
  }

  // 2. Site-Specific Commands
  const site = detectSite();
  let handled = false;
  if (site === "youtube") handled = handleYouTubeCommand(lower);
  else if (site === "linkedin") handled = handleLinkedInCommand(lower);
  else if (site === "instagram") handled = handleInstagramCommand(lower);
  else if (site === "twitter") handled = handleTwitterCommand(lower);

  if (handled) return;

  // 3. Generic "Open [website]" (Fast Fallback)
  const openMatch = lower.match(/^open\s+(.+)/i);
  if (openMatch && !lower.includes("tab") && !lower.includes("link")) {
      const host = openMatch[1].replace(/\s+/g, "").replace(/dot/g, ".");
      const url = host.includes(".") ? (host.startsWith("http") ? host : `https://${host}`) : `https://${host}.com`;
      window.open(url, "_blank");
      return speak(`Opening ${host}`);
  }

  // 4. AI Brain (Ultimate Fallback)
  console.log("🧠 Sending to AI Brain:", text);
  chrome.runtime.sendMessage({ type: "PROCESS_TEXT", text });
}

// --------------------- Command Handler ---------------------
function handleCommand(cmd) {
  if (!cmd || typeof cmd !== "object") return console.warn("Invalid command:", cmd);

  switch (cmd.action) {
    case "scroll":
      scrollPage(cmd.direction);
      break;
    case "navigate":
      if (cmd.url) window.location.href = cmd.url;
      else if (cmd.to === "back") window.history.back();
      else if (cmd.to === "forward") window.history.forward();
      break;
    case "click":
      clickLink(cmd);
      break;
    case "type":
      handleType(cmd);
      break;
    case "read":
      if (cmd.target === "selection") readSelection();
      else if (cmd.target === "paragraph") readSpecificParagraph(cmd.whichIndex);
      else readPage();
      break;
    case "summarize":
      if (cmd.target === "paragraph") handleSummarize(getNthParagraph(cmd.whichIndex));
      else if (cmd.target === "selection") handleSummarize(window.getSelection().toString());
      else handleSummarize(getMainPageText());
      break;
    case "stop":
      speechSynthesis.cancel();
      break;
  }
}

// --------------------- Standard Actions ---------------------
function scrollPage(direction) {
  const h = window.innerHeight * 0.8;
  if (direction === "down") window.scrollBy({ top: h, behavior: "smooth" });
  else if (direction === "up") window.scrollBy({ top: -h, behavior: "smooth" });
  else if (direction === "top") window.scrollTo({ top: 0, behavior: "smooth" });
  else if (direction === "bottom") window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

function readSelection() {
  const text = window.getSelection().toString().trim();
  if (text) speak(text); else speak("No text selected.");
}

function readPage() {
  speak(getMainPageText().slice(0, 3000));
}

function readSpecificParagraph(index) {
  const text = getNthParagraph(index);
  if (text) speak(text); else speak("Paragraph not found.");
}

function clickLink(cmd) {
  const links = Array.from(document.querySelectorAll("a[href], button, [role='button'], input[type='submit']"));
  if (links.length === 0) return speak("No clickable elements found.");

  let target = null;
  if (cmd.byText) {
    const search = cmd.byText.toLowerCase();
    target = links.find(el => (el.innerText || el.getAttribute("aria-label") || "").toLowerCase().trim() === search) ||
             links.find(el => (el.innerText || el.getAttribute("aria-label") || "").toLowerCase().includes(search));
    if (!target) return speak(`Could not find "${cmd.byText}".`);
  } else if (typeof cmd.whichIndex === "number") {
    target = links[cmd.whichIndex];
    if (!target) return speak("That number doesn't exist.");
  }

  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.style.outline = "3px solid #00ff88";
    setTimeout(() => { target.style.outline = ""; target.click(); }, 500);
    speak(`Clicking ${ (target.innerText || "element").slice(0, 20) }`);
  }
}

function handleType(cmd) {
  let target = null;
  if (cmd.target) {
    const search = cmd.target.toLowerCase();
    target = Array.from(document.querySelectorAll('input, textarea, [contenteditable="true"]'))
        .find(el => (el.placeholder || el.name || el.id || el.getAttribute('aria-label') || "").toLowerCase().includes(search));
  }
  if (!target) target = document.activeElement && isTypable(document.activeElement) ? document.activeElement : null;
  if (!target) target = document.querySelector('textarea, input[type="text"], [contenteditable="true"]');

  if (target) {
    target.focus();
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') target.value = cmd.text;
    else target.innerText = cmd.text;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    speak(`Typed: ${cmd.text}`);
  } else {
    speak("No text field found.");
  }
}

function handleSummarize(text) {
  if (!text || text.length < 50) return speak("Not enough text to summarize.");
  speak("Summarizing...");
  chrome.runtime.sendMessage({ type: "GENERATE_SUMMARY", text }, (response) => {
    if (response?.status === "success") speak("Summary: " + response.summary);
    else speak("Failed to summarize.");
  });
}

// --------------------- Site Handlers (Corrected to return true/false) ---------------------
function detectSite() {
  const url = window.location.href;
  if (url.includes("youtube.com")) return "youtube";
  if (url.includes("linkedin.com")) return "linkedin";
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
  return "generic";
}

function handleYouTubeCommand(text) {
  if (/open shorts/.test(text)) {
    const el = document.querySelector("a[title='Shorts'], ytd-guide-entry-renderer a[href='/shorts']");
    if (el) { el.click(); speak("Opening Shorts"); } else speak("Shorts not found.");
    return true;
  }
  if (/play (?:the )?(first|second|third|(\d+))/.test(text)) {
    const idx = extractOrdinal(text);
    const vids = Array.from(document.querySelectorAll("ytd-video-renderer, ytd-rich-item-renderer, ytd-compact-video-renderer"));
    const target = vids[idx - 1] || vids[0];
    if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => target.querySelector("a#thumbnail, a#video-title")?.click(), 500);
        speak(`Playing video ${idx}`);
    } else speak("Video not found.");
    return true;
  }
  return false;
}

function handleLinkedInCommand(text) {
  if (/like (?:the )?(first|second|third|(\d+))/.test(text)) {
    const idx = extractOrdinal(text);
    const btns = Array.from(document.querySelectorAll("button[aria-label*='React like']"));
    const t = btns[idx - 1] || btns[0];
    if (t) { t.click(); speak(`Liked post ${idx}`); } else speak("Like button not found.");
    return true;
  }
  return false;
}

function handleTwitterCommand(text) {
  if (/like (?:the )?(first|second|third|(\d+))/.test(text)) {
    const idx = extractOrdinal(text);
    const likes = Array.from(document.querySelectorAll('div[data-testid="like"]'));
    const b = likes[idx - 1] || likes[0];
    if (b) { b.click(); speak(`Liked tweet ${idx}`); } else speak("Like button not found.");
    return true;
  }
  return false;
}

// --------------------- Helpers ---------------------
function speak(text) {
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = currentSpeakerLang;
  // 👇 ADD THIS LINE to use the voice we selected above
  if (preferredVoice) utter.voice = preferredVoice;
  speechSynthesis.speak(utter);
}

function randomReply(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function extractOrdinal(text) {
  const n = text.match(/\d+/);
  if (n) return parseInt(n[0], 10);
  const map = { first:1, second:2, third:3, fourth:4, fifth:5 };
  for (const k in map) if (text.includes(k)) return map[k];
  return 1;
}
function getNthParagraph(index) {
  const p = Array.from(document.querySelectorAll('p')).filter(el => el.innerText.length > 50);
  return p[index]?.innerText || null;
}
function getMainPageText() {
  return (document.querySelector('article') || document.querySelector('main') || document.body)?.innerText?.slice(0, 5000) || "";
}
function isTypable(el) {
    return ['TEXTAREA', 'INPUT'].includes(el.tagName) || el.isContentEditable;
}