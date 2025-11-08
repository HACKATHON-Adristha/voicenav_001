// content.js — VoiceNav (AI Version) (complete)
console.log("✅ VoiceNav AI content script ready 🧠");

let currentSpeakerLang = 'en-US';
let availableVoices = [];
let preferredVoice = null;
let voicesReady = false;
let activeCommentInput = null;

// Load voices and pick a preferred (male-ish) voice where available
function loadVoices() {
  availableVoices = speechSynthesis.getVoices() || [];
  const priority = [
    "Google US English Male",
    "Google UK English Male",
    "Microsoft David",
    "Google US English",
    "Google UK English"
  ];
  preferredVoice =
    availableVoices.find(v => priority.includes(v.name)) ||
    availableVoices.find(v => v.lang === "en-US") ||
    availableVoices[0] || null;
  voicesReady = availableVoices.length > 0;
  console.log("🎧 Voices loaded:", preferredVoice?.name || "default");
}
speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

// --------------------- Message Listener ---------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXECUTE_COMMAND") {
    // optionally capture requested reply language
    if (message.command?.replyLang) currentSpeakerLang = message.command.replyLang;
    console.log("🤖 Executing:", message.command);
    handleCommand(message.command);
    // reply quickly to keep channel alive
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

  // Casual greetings
  if (/(hello|hi|hey|good morning|good evening)/.test(lower)) {
    return speak(randomReply([
      "Hey there! Nice to see you.",
      "Hello! How can I help today?",
      "Hi! Ready when you are."
    ]));
  }

  if (/(how are you|how's it going)/.test(lower)) {
    return speak("I'm doing great, thanks! What can I do for you?");
  }

  if (/(who are you|your name)/.test(lower)) {
    return speak("I'm VoiceNav, your AI browsing assistant.");
  }

  if (/(thank you|thanks)/.test(lower)) {
    return speak("You're welcome!");
  }

  // Site-aware quick commands
  const site = detectSite();
  if (site === "youtube") return handleYouTubeCommand(lower);
  if (site === "linkedin") return handleLinkedInCommand(lower);
  if (site === "instagram") return handleInstagramCommand(lower);
  if (site === "twitter" || site === "x") return handleTwitterCommand(lower);

  // Generic actions
  if (/^open\s+(.+)/i.test(lower)) {
    // fallback: open domain directly if phrase like "open youtube"
    const m = lower.match(/^open\s+(.+)/i);
    if (m) {
      const host = m[1].replace(/\s+/g, "").replace(/dot/g, ".");
      const url = host.includes(".") ? (host.startsWith("http") ? host : `https://${host}`) : `https://${host}.com`;
      window.open(url, "_blank");
      return speak(`Opening ${host}`);
    }
  }

  // let background attempt to parse complex commands if not handled here
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
      if (cmd.url) {
        try {
          const host = new URL(cmd.url).hostname.replace("www.", "");
          speak(`Opening ${host}`);
        } catch (e) {
          speak("Opening site");
        }
        window.location.href = cmd.url;
      } else if (cmd.to === "back") {
        window.history.back(); speak("Going back");
      } else if (cmd.to === "forward") {
        window.history.forward(); speak("Going forward");
      }
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
      // background handles summarization request normally,
      // but if content received a summarize with text, call the background
      if (cmd.text) {
        handleSummarize(cmd.text);
      } else {
        handleSummarize(getMainPageText());
      }
      break;

    case "stop":
      speechSynthesis.cancel();
      break;

    default:
      console.log("Unknown command:", cmd);
  }
}

// --------------------- Actions: scroll/read/click ---------------------
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

function readPage() {
  const el = document.querySelector('article') || document.querySelector('main') || document.body;
  const text = el?.innerText?.slice(0, 3000) || "No readable text found.";
  if (el) el.scrollIntoView({ behavior: "smooth" });
  speak(text);
}

function getNthParagraph(index) {
  const paragraphs = Array.from(document.querySelectorAll('p')).filter(p => p.innerText.length > 30 && p.offsetParent !== null);
  if (paragraphs[index]) return paragraphs[index].innerText;
  return null;
}

function readSpecificParagraph(index) {
  const text = getNthParagraph(index);
  if (text) speak(text);
  else speak("That paragraph number doesn't exist.");
}

function getMainPageText() {
  const article = document.querySelector('article') || document.querySelector('main') || document.body;
  return article?.innerText?.slice(0, 5000) || "";
}

// --------------------- clickLink (generic) ---------------------
function clickLink(cmd) {
  // Accepts cmd.byText or cmd.whichIndex
  const links = Array.from(document.querySelectorAll("a[href], button, [role='button']"));
  if (links.length === 0) return speak("No clickable elements found on this page.");

  let target = null;
  if (cmd.byText) {
    const search = cmd.byText.toLowerCase();
    // exact then partial
    target = links.find(el => (el.innerText || el.getAttribute("aria-label") || "").toLowerCase().trim() === search) ||
             links.find(el => (el.innerText || el.getAttribute("aria-label") || "").toLowerCase().includes(search));
    if (!target) return speak(`Could not find an element matching "${cmd.byText}".`);
  } else if (typeof cmd.whichIndex === "number") {
    target = links[cmd.whichIndex];
    if (!target) return speak("That numbered element doesn't exist.");
  } else {
    // default: click first
    target = links[0];
  }

  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.style.outline = "3px solid #00ff88";
    setTimeout(() => target.style.outline = "", 1200);
    setTimeout(() => target.click(), 250);
    speak(`Clicked ${ (target.innerText || target.getAttribute("aria-label") || "element").slice(0, 30) }`);
  }
}

// --------------------- Type handler ---------------------
function handleType(cmd) {
  // cmd: { action: "type", text: "hello", target: "email" }
  let targetEl = null;
  if (cmd.target) {
    const search = cmd.target.toLowerCase();
    // find by placeholder, name, id
    targetEl = Array.from(document.querySelectorAll('input, textarea, [contenteditable="true"]')).find(el => {
      const p = (el.placeholder || el.name || el.id || el.getAttribute('aria-label') || "").toString().toLowerCase();
      return p.includes(search);
    });
  }

  if (!targetEl) {
    // fallback to active element
    const active = document.activeElement;
    if (active && isTypable(active)) targetEl = active;
  }

  if (!targetEl) {
    // last fallback: first input/textarea on page
    targetEl = document.querySelector('textarea, input[type="text"], input[type="search"], input[type="email"], [contenteditable="true"]');
  }

  if (!targetEl) return speak("Please focus a text box or specify a field to type into.");

  // Insert text
  if (targetEl.tagName === 'INPUT' || targetEl.tagName === 'TEXTAREA') {
    targetEl.focus();
    targetEl.value = cmd.text || "";
    targetEl.dispatchEvent(new Event('input', { bubbles: true }));
    targetEl.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (targetEl.isContentEditable) {
    targetEl.focus();
    targetEl.innerText = cmd.text || "";
    targetEl.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    return speak("Couldn't type into that element.");
  }

  activeCommentInput = targetEl;
  speak(`Typed: ${cmd.text?.slice(0, 60) || ""}`);
}

// Helper to verify typable element
function isTypable(el) {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === 'textarea') return true;
  if (tag === 'input') {
    const t = el.type?.toLowerCase();
    return !['checkbox','radio','button','submit','hidden','image','file'].includes(t);
  }
  if (el.isContentEditable) return true;
  return false;
}

// --------------------- Summarize support ---------------------
function handleSummarize(text) {
  chrome.runtime.sendMessage({ type: "GENERATE_SUMMARY", text }, (response) => {
    if (response && response.status === "success") speak("Summary: " + response.summary);
    else speak("Failed to generate summary.");
  });
}

// --------------------- Site-aware helpers (YouTube / LinkedIn / Twitter / Instagram) ---------------------
function detectSite() {
  const url = window.location.href;
  if (url.includes("youtube.com")) return "youtube";
  if (url.includes("linkedin.com")) return "linkedin";
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
  return "generic";
}

// YouTube commands approachable from voice
function handleYouTubeCommand(text) {
  if (/open shorts/.test(text)) {
    const el = document.querySelector("a[title*='Shorts'], a[href*='/shorts']");
    if (el) { el.click(); return speak("Opening Shorts"); }
    return speak("Shorts not found.");
  }

  if (/play (?:the )?(first|second|third|(\d+))/.test(text)) {
    const idx = extractOrdinal(text);
    const vids = Array.from(document.querySelectorAll("ytd-rich-item-renderer ytd-thumbnail, a#video-title, ytd-rich-grid-media a#thumbnail"));
    const target = vids[idx - 1] || vids[0];
    if (target) { target.scrollIntoView({ behavior: "smooth" }); setTimeout(() => target.click(), 500); return speak(`Playing the ${ordinalWord(idx)} video`); }
    return speak("No videos found.");
  }

  if (/like (?:the )?(first|second|third|(\d+))/.test(text)) {
    const idx = extractOrdinal(text);
    const likeBtns = Array.from(document.querySelectorAll("ytd-toggle-button-renderer button[aria-label*='like']"));
    const b = likeBtns[idx - 1] || likeBtns[0];
    if (b) { b.click(); return speak(`Liked the ${ordinalWord(idx)} video`); }
    return speak("Like button not found.");
  }

  speak("Couldn't understand the YouTube instruction.");
}

// LinkedIn
function handleLinkedInCommand(text) {
  if (/like (?:the )?(first|second|third|(\d+))/.test(text)) {
    const idx = extractOrdinal(text);
    const btns = Array.from(document.querySelectorAll("button[aria-label*='Like'], button.reaction-button__trigger"));
    const t = btns[idx - 1] || btns[0];
    if (t) { t.click(); return speak(`Liked the ${ordinalWord(idx)} post`); }
    return speak("No like button found.");
  }

  if (/comment (.+)/.test(text)) {
    const comment = text.match(/comment (.+)/)[1];
    const area = document.querySelector("div.comments-comment-box__editor, textarea, div[contenteditable='true']");
    if (area) { area.focus(); document.execCommand('insertText', false, comment); activeCommentInput = area; return speak(`Typed comment: ${comment}`); }
    return speak("No comment box available.");
  }

  if (/post it/.test(text)) {
    const postBtn = Array.from(document.querySelectorAll("button")).find(b => /post|send|reply/i.test(b.innerText));
    if (postBtn) { postBtn.click(); return speak("Posted your comment."); }
    return speak("Couldn't find post button.");
  }

  speak("Couldn't understand LinkedIn instruction.");
}

// Instagram
function handleInstagramCommand(text) {
  if (/like (?:the )?(first|second|third|(\d+))/.test(text)) {
    const idx = extractOrdinal(text);
    const hearts = Array.from(document.querySelectorAll("svg[aria-label='Like'], button[aria-label*='Like']"));
    const el = hearts[idx - 1];
    if (el) { const btn = el.closest("button") || el; btn.click(); return speak(`Liked the ${ordinalWord(idx)} post.`); }
    return speak("Couldn't find post.");
  }

  if (/comment (.+)/.test(text)) {
    const comment = text.match(/comment (.+)/)[1];
    const area = document.querySelector("textarea, input[aria-label='Add a comment'], div[contenteditable='true']");
    if (area) { area.focus(); if (area.tagName === 'DIV') area.innerText = comment; else area.value = comment; area.dispatchEvent(new Event('input',{bubbles:true})); activeCommentInput = area; return speak(`Typed comment: ${comment}`); }
    return speak("No comment box found.");
  }

  if (/post it/.test(text)) {
    const btn = Array.from(document.querySelectorAll("button")).find(b => /post|reply|send/i.test(b.innerText));
    if (btn) { btn.click(); return speak("Posted your comment."); }
    return speak("Couldn't find post button.");
  }

  speak("Couldn't understand Instagram instruction.");
}

// Twitter/X
function handleTwitterCommand(text) {
  if (/like (?:the )?(first|second|third|(\d+))/.test(text)) {
    const idx = extractOrdinal(text);
    const likes = Array.from(document.querySelectorAll('div[data-testid="like"]'));
    const b = likes[idx - 1];
    if (b) { b.click(); return speak(`Liked the ${ordinalWord(idx)} tweet.`); }
    return speak("Couldn't find like button.");
  }

  if (/reply|comment (.+)/.test(text)) {
    const comment = (text.match(/comment (.+)/) || text.match(/reply (.+)/))[1];
    const box = document.querySelector('div[role="textbox"], textarea, input[aria-label*="Tweet"]');
    if (box) { box.focus(); if (box.tagName === 'DIV') box.textContent = comment; else box.value = comment; box.dispatchEvent(new Event('input', { bubbles: true })); activeCommentInput = box; return speak(`Typed reply: ${comment}`); }
    return speak("No reply box found.");
  }

  if (/post it/.test(text)) {
    const postBtn = document.querySelector('div[data-testid="tweetButtonInline"], div[data-testid="tweetButton"]');
    if (postBtn) { postBtn.click(); return speak("Posted your reply."); }
    return speak("Couldn't find post button.");
  }

  speak("Couldn't understand Twitter instruction.");
}

// --------------------- Comment posting helper ---------------------
function submitComment() {
  if (activeCommentInput) {
    // try to find nearby post button
    const form = activeCommentInput.closest('form') || document.body;
    const btn = form.querySelector("button, input[type='submit']");
    if (btn && /post|send|reply|comment|submit/i.test(btn.innerText || btn.value || "")) {
      btn.click();
      activeCommentInput = null;
      return speak("Posted your comment.");
    }
    // fallback: press Enter
    activeCommentInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    activeCommentInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    activeCommentInput = null;
    return speak("Tried to submit the comment.");
  } else {
    // try to find any visible post buttons
    const btn = Array.from(document.querySelectorAll("button")).find(b => /post|send|reply|submit/i.test(b.innerText));
    if (btn) { btn.click(); return speak("Posted comment."); }
    return speak("No active comment to post.");
  }
}

// --------------------- Helpers ---------------------
function randomReply(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function extractOrdinal(text) {
  if (!text) return 1;
  const map = { first:1, second:2, third:3, fourth:4, fifth:5, sixth:6, seventh:7, eighth:8, ninth:9, tenth:10 };
  for (const k of Object.keys(map)) if (text.includes(k)) return map[k];
  const n = text.match(/\d+/);
  return n ? parseInt(n[0],10) : 1;
}
function ordinalWord(n) {
  const arr = ["first","second","third","fourth","fifth","sixth","seventh","eighth","ninth","tenth"];
  return arr[n-1] || `${n}th`;
}
function getMainPageText() {
  const article = document.querySelector('article') || document.querySelector('main') || document.body;
  return article?.innerText?.slice(0, 5000) || "";
}
