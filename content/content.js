// content.js — VoiceNav
console.log("✅ VoiceNav content script active 🧠");

// 🧠 1. Local Command Parser
// This translates raw text into actionable command objects.
const CommandParser = {
  parse(text) {
    text = text.toLowerCase().trim();

    // Scroll Commands
    if (text.includes("scroll down")) return { action: "scroll", direction: "down" };
    if (text.includes("scroll up")) return { action: "scroll", direction: "up" };
    if (text.includes("top of page") || text.includes("go to top")) return { action: "scroll", direction: "top" };
    if (text.includes("bottom of page") || text.includes("go to bottom")) return { action: "scroll", direction: "bottom" };

    // Navigation Commands
    if (text.includes("go back")) return { action: "navigate", to: "back" };
    if (text.includes("go forward")) return { action: "navigate", to: "forward" };

    // Read Commands
    if (text.includes("read selected") || text.includes("read selection")) return { action: "read", target: "selection" };
    if (text.includes("read page") || text.includes("read all")) return { action: "read", target: "visible" };
    if (text.includes("stop reading") || text.includes("shut up") || text.includes("stop talking")) return { action: "stop" };

    // Link Commands
    if (text.startsWith("open link")) {
      // Match "open link 5"
      const numMatch = text.match(/open link (\d+)/);
      if (numMatch) return { action: "open", whichIndex: parseInt(numMatch[1]) - 1 };

      // Match "open link contact"
      const textMatch = text.replace("open link", "").trim();
      if (textMatch) return { action: "open", byText: textMatch };
    }

    // Find Commands
    if (text.startsWith("find") || text.startsWith("search for")) {
        const query = text.replace(/^(find|search for)/, "").trim();
        return { action: "find", query: query };
    }

    return { action: "unknown", originalText: text };
  }
};

// 📨 2. Message Listener
chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "VOICE_COMMAND") return;

  console.log("🎤 Raw text received:", message.text);
  const cmd = CommandParser.parse(message.text);
  console.log("🤖 Parsed command:", cmd);

  handleCommand(cmd);
});

// 🎮 3. Main Command Handler
function handleCommand(cmd) {
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
      console.log("Unknown command:", cmd.originalText);
      // Optional: speak("I didn't understand that.");
  }
}

// 🛠️ 4. Action Functions

function scrollPage(direction) {
  const h = window.innerHeight * 0.8; // Scroll 80% of screen height for better continuity
  if (direction === "down") window.scrollBy({ top: h, behavior: "smooth" });
  else if (direction === "up") window.scrollBy({ top: -h, behavior: "smooth" });
  else if (direction === "top") window.scrollTo({ top: 0, behavior: "smooth" });
  else if (direction === "bottom") window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

function readSelection() {
  const text = window.getSelection().toString().trim();
  if (text) speak(text);
  else speak("No text selected to read.");
}

function readVisible() {
  // Priority: <article> -> <main> -> all <p> tags -> full body fallback
  const mainContent = document.querySelector('article') || document.querySelector('main');
  let text = "";

  if (mainContent) {
      text = mainContent.innerText;
  } else {
      // Gather all paragraphs if no main content container exists
      text = Array.from(document.querySelectorAll('p'))
          .map(p => p.innerText)
          .join('. ');
  }

  // Fallback if still empty or too short
  if (!text || text.length < 100) {
      text = document.body.innerText;
  }

  // Cap at 2000 chars to prevent reading entire massive pages accidentally
  speak(text.slice(0, 2000));
}

function openLink(cmd) {
  const links = Array.from(document.querySelectorAll("a[href]"))
      .filter(a => a.offsetWidth > 0 && a.offsetHeight > 0); // Only visible links

  if (links.length === 0) return speak("No visible links found.");

  if (cmd.byText) {
    const searchStr = cmd.byText.toLowerCase();
    // Find link that contains the spoken text
    const link = links.find((a) => a.innerText.toLowerCase().includes(searchStr));
    if (link) {
      speak(`Opening ${link.innerText.slice(0, 20)}...`);
      window.open(link.href, "_blank");
    } else {
      speak(`Could not find a link matching "${cmd.byText}".`);
    }
    return;
  }

  if (typeof cmd.whichIndex === "number") {
      const target = links[cmd.whichIndex];
      if (target) {
        speak("Opening link.");
        window.open(target.href, "_blank");
      } else {
        speak("Link number not found.");
      }
  }
}

function findText(query) {
  if (!query) return speak("Please say what to find.");

  // Use native window.find() to highlight and scroll to the text
  // Arguments: aString, caseSensitive, backwards, wrapAround, wholeWord, searchInFrames, showDialog
  const found = window.find(query, false, false, true, false, true, false);

  if (found) {
      // Ensure it's visible by smoothing scrolling to it if needed
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
          selection.getRangeAt(0).startContainer.parentElement.scrollIntoView({behavior: "smooth", block: "center"});
      }
      speak(`Found ${query}.`);
  } else {
      speak(`Could not find ${query}.`);
  }
}

function speak(text) {
  speechSynthesis.cancel(); // Stop any current speech first
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = 1.0; // Adjust speed if desired (0.1 to 10)
  speechSynthesis.speak(utter);
}