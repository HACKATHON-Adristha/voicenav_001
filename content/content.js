// content.js — VoiceNav (AI Version)
console.log("✅ VoiceNav AI content script ready 🧠");

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
    
    case "navigate":
      if (cmd.to === "back") {
          window.history.back();
          speak("Going back");
      } else if (cmd.to === "forward") {
          window.history.forward();
          speak("Going forward");
      }
      break;
    case "find":
      findText(cmd.query);
      break;

    case "stop":
      speechSynthesis.cancel();
      break;
    // ... inside handleCommand(cmd) switch statement in content.js ...

    case "navigate":
      if (cmd.url) {
          // Handle "go to [url]" in the SAME tab
          window.location.href = cmd.url;
      } else if (cmd.to === "back") {
          window.history.back();
          speak("Going back");
      } else if (cmd.to === "forward") {
          window.history.forward();
          speak("Going forward");
      }
      break;

    case "click":
      clickLink(cmd);
      break;  


    case "read":
      if (cmd.target === "selection") readSelection();
      else if (cmd.target === "paragraph") readSpecificParagraph(cmd.whichIndex);
      else readPage(); // renamed from readVisible for clarity
      break;
    case "summarize":
      speak("Generating summary...");
      // determine WHAT to summarize based on the command target
      let textToSum = "";
      if (cmd.target === "selection") textToSum = window.getSelection().toString();
      else if (cmd.target === "paragraph") textToSum = getNthParagraph(cmd.whichIndex);
      else textToSum = getMainPageText();

      if (textToSum) handleSummarize(textToSum);
      else speak("Nothing found to summarize.");
      break;

// ... rest of switch statement
    default:
       console.log("Unknown or unhandled action:", cmd);
  }
}

// 🛠️ Action Functions

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

function clickLink(cmd) {
    // Find all visible links
    const links = Array.from(document.querySelectorAll("a[href], button"));
    // Optional: filter for only visible ones if you want to get advanced later

    if (links.length === 0) return speak("No visible links or buttons found.");

    let target = null;

    if (cmd.byText) {
        const searchStr = cmd.byText.toLowerCase();
        // 1. Try exact match first (better accuracy)
        target = links.find(el => el.innerText.toLowerCase().trim() === searchStr);

        // 2. If no exact match, try partial match
        if (!target) {
            target = links.find(el => el.innerText.toLowerCase().includes(searchStr));
        }

        if (!target) return speak(`Could not find a link saying "${cmd.byText}".`);
    }
    else if (typeof cmd.whichIndex === "number") {
        target = links[cmd.whichIndex];
        if (!target) return speak("That link number does not exist.");
    }

    // PERFORM THE CLICK
    if (target) {
        speak(`Clicking ${target.innerText.slice(0, 20) || "link"}`);

        // Highlight it briefly before clicking so the user knows what happened
        target.style.outline = "3px solid red";
        setTimeout(() => {
            target.click(); // <--- The magic native click
        }, 500);
    }
}

function findText(query) {
  if (!query) return speak("Please say what to find.");
  // window.find(aString, caseSensitive, backwards, wrapAround, wholeWord, searchInFrames, showDialog)
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

function handleSummarize(text) {
    chrome.runtime.sendMessage({
        type: "GENERATE_SUMMARY",
        text: text
    }, (response) => {
        if (response && response.status === "success") {
            speak("Summary: " + response.summary);
        } else {
            speak("Failed to generate summary.");
        }
    });
}

function getNthParagraph(index) {
    // Get all decent-sized paragraphs that are likely actual content
    const paragraphs = Array.from(document.querySelectorAll('p'))
        .filter(p => p.innerText.length > 50 && p.offsetParent !== null);

    if (paragraphs[index]) {
        // Highlight it briefly so the user sees what is being read
        const originalBg = paragraphs[index].style.backgroundColor;
        paragraphs[index].style.backgroundColor = "#yellow";
        setTimeout(() => paragraphs[index].style.backgroundColor = originalBg, 2000);
        return paragraphs[index].innerText;
    }
    return null;
}

function readSpecificParagraph(index) {
    const text = getNthParagraph(index);
    if (text) speak(text);
    else speak("That paragraph number doesn't exist.");
}

function getMainPageText() {
    const article = document.querySelector('article') || document.querySelector('main') || document.body;
    return article.innerText.slice(0, 5000);
}

function readPage() {
    speak(getMainPageText().slice(0, 2000));
}
