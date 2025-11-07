console.log("VoiceNav content script active 🧠");

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "VOICE_COMMAND") return;
  const cmd = window.VoiceNav.parseCommand(message.text);
  console.log("Parsed command:", cmd);
  handleCommand(cmd);
});

function handleCommand(cmd) {
  switch (cmd.action) {
    case "scroll":
      scrollPage(cmd.direction);
      speak(`Scrolling ${cmd.direction}`);
      break;

    case "read":
      if (cmd.target === "selection") readSelection();
      else readVisible();
      break;

    case "navigate":
      if (cmd.to === "back") history.back();
      else if (cmd.to === "forward") history.forward();
      speak(`Going ${cmd.to}`);
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
      speak("Command not recognized.");
  }
}

function scrollPage(direction) {
  const h = window.innerHeight;
  if (direction === "down") window.scrollBy({ top: h, behavior: "smooth" });
  else if (direction === "up") window.scrollBy({ top: -h, behavior: "smooth" });
  else if (direction === "top") window.scrollTo({ top: 0, behavior: "smooth" });
  else if (direction === "bottom") window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

function readSelection() {
  const text = window.getSelection().toString();
  if (text) speak(text);
  else speak("No text selected.");
}

function readVisible() {
  const text = document.body.innerText.slice(0, 1500);
  speak(text);
}

function openLink(cmd) {
  const links = [...document.querySelectorAll("a[href]")];
  if (links.length === 0) return speak("No links found on this page.");

  if (cmd.byText) {
    const link = links.find((a) => a.innerText.toLowerCase().includes(cmd.byText.toLowerCase()));
    if (link) {
      window.open(link.href, "_blank");
      speak(`Opening link that says ${cmd.byText}`);
    } else speak("No matching link found.");
    return;
  }

  const target = links[cmd.whichIndex];
  if (target) {
    window.open(target.href, "_blank");
    speak(`Opening link number ${cmd.whichIndex + 1}`);
  } else speak("That link number does not exist.");
}

function findText(query) {
  if (!query) return speak("Please say what to find.");
  const body = document.body.innerText.toLowerCase();
  const idx = body.indexOf(query.toLowerCase());
  if (idx >= 0) {
    speak(`Found ${query} on this page.`);
  } else {
    speak(`Could not find ${query}.`);
  }
}

function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}
