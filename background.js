// background.js — VoiceNav (complete)
// Note: requires ./config.js with `export const GEMINI_API_KEY = "..."`

import { GEMINI_API_KEY } from './config.js';
console.log("🚀 VoiceNav AI background service started");

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "PROCESS_TEXT") {
    handleVoiceIntent(request.text, sendResponse);
    return true; // async
  }
  if (request.type === "GENERATE_SUMMARY") {
    generatePageSummary(request.text, sendResponse);
    return true;
  }
  return false;
});

async function handleVoiceIntent(userText, sendResponse) {
  const SYSTEM_PROMPT = `
You are VoiceNav, a browser assistant. ALWAYS reply with exactly one valid JSON object (no explanation).

Valid actions:
{ "action":"scroll", "direction":"up"|"down"|"top"|"bottom" }
{ "action":"navigate", "url":"https://..." }
{ "action":"navigate", "to":"back"|"forward" }
{ "action":"createTab", "url":"https://..." }
{ "action":"click", "byText":"text", "whichIndex": number_0_based }
{ "action":"type", "text":"...", "target":"optional" }
{ "action":"read", "target":"selection"|"page"|"paragraph", "whichIndex": number_0_based }
{ "action":"summarize", "target":"page"|"selection"|"paragraph" }
{ "action":"stop" }

Examples:
"scroll down" -> {"action":"scroll","direction":"down"}
"open youtube" -> {"action":"navigate","url":"https://www.youtube.com"}
"click the first video" -> {"action":"click","byText":"video","whichIndex":0}
"type hello into comment" -> {"action":"type","text":"hello","target":"comment"}
`;

  try {
    // Call Gemini
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: SYSTEM_PROMPT + "\nUser: " + userText }] }] }),
    });

    const data = await res.json();
    let aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    // Clean code fences / markdown wrappers
    aiText = aiText.replace(/```json|```/g, "").trim();

    // Try parse JSON
    let command = null;
    try {
      command = JSON.parse(aiText);
      console.log("✅ Parsed Gemini JSON:", command);
    } catch (err) {
      console.warn("⚠️ JSON parse failed, using fallback. Raw:", aiText);
      return await handleFallbackIntent(userText, sendResponse);
    }

    // If createTab — open new tab
    if (command.action === "createTab" && command.url) {
      await chrome.tabs.create({ url: command.url });
      sendResponse({ status: "success", message: "Opened new tab" });
      return;
    }

    // If navigate with url — update or open
    if (command.action === "navigate" && command.url) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        // update same tab
        await chrome.tabs.update(tab.id, { url: command.url });
        sendResponse({ status: "success", message: `Navigating to ${command.url}` });
      } else {
        await chrome.tabs.create({ url: command.url });
        sendResponse({ status: "success", message: `Opened ${command.url}` });
      }
      return;
    }

    // Otherwise send the structured command to the active tab's content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      sendResponse({ status: "error", message: "No active tab found" });
      return;
    }

    // Ensure content script available: try sendMessage; if error, inject and retry once
    chrome.tabs.sendMessage(tab.id, { type: "EXECUTE_COMMAND", command }, (resp) => {
      if (chrome.runtime.lastError) {
        console.warn("⚠️ sendMessage failed, trying reinjection:", chrome.runtime.lastError.message);
        // Inject content script and retry
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content/content.js"] }, () => {
          chrome.tabs.sendMessage(tab.id, { type: "EXECUTE_COMMAND", command }, (retryResp) => {
            if (chrome.runtime.lastError) {
              console.error("❌ Retry sendMessage failed:", chrome.runtime.lastError.message);
              sendResponse({ status: "error", message: chrome.runtime.lastError.message });
            } else {
              sendResponse({ status: "success", message: `Command executed after reinjection: ${command.action}` });
            }
          });
        });
      } else {
        sendResponse({ status: "success", message: `Command dispatched: ${command.action}` });
      }
    });
  } catch (err) {
    console.error("❌ handleVoiceIntent error:", err);
    sendResponse({ status: "error", message: err.message });
  }
}

// Fallback when AI doesn't return valid JSON
async function handleFallbackIntent(userText, sendResponse) {
  const lower = userText.toLowerCase();
  let fallback = null;

  if (lower.includes("scroll down")) fallback = { action: "scroll", direction: "down" };
  else if (lower.includes("scroll up")) fallback = { action: "scroll", direction: "up" };
  else if (lower.includes("scroll top")) fallback = { action: "scroll", direction: "top" };
  else if (lower.includes("scroll bottom")) fallback = { action: "scroll", direction: "bottom" };
  else if (lower.includes("stop")) fallback = { action: "stop" };
  else if (lower.match(/open (https?:\/\/)?([\w.-]+\.\w{2,})/)) {
    const m = lower.match(/open (https?:\/\/)?([\w.-]+\.\w{2,})/);
    const host = m && m[2] ? m[2] : null;
    if (host) fallback = { action: "navigate", url: `https://${host}` };
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    sendResponse({ status: "error", message: "No active tab found for fallback." });
    return;
  }

  if (fallback) {
    chrome.tabs.sendMessage(tab.id, { type: "EXECUTE_COMMAND", command: fallback }, (resp) => {
      if (chrome.runtime.lastError) {
        // try reinjection, then retry
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] }, () => {
          chrome.tabs.sendMessage(tab.id, { type: "EXECUTE_COMMAND", command: fallback });
        });
        sendResponse({ status: "error", message: "Reinjected content script for fallback." });
      } else {
        sendResponse({ status: "success", message: `Fallback executed: ${fallback.action}` });
      }
    });
  } else {
    // treat as conversational text — forward to content script for TTS
    chrome.tabs.sendMessage(tab.id, { type: "VOICE_COMMAND", text: userText }, (resp) => {
      if (chrome.runtime.lastError) {
        // reinject & retry
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content/content.js"] }, () => {
          chrome.tabs.sendMessage(tab.id, { type: "VOICE_COMMAND", text: userText });
        });
        sendResponse({ status: "error", message: "Reinjected content script for chat." });
      } else {
        sendResponse({ status: "success", message: "Conversation forwarded to content script." });
      }
    });
  }
}

// Summarize page text using Gemini
async function generatePageSummary(pageText, sendResponse) {
  try {
    const prompt = `Summarize the following webpage in 3 short sentences for a visually impaired user:\n\n${pageText}`;
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = await res.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No summary available.";
    sendResponse({ status: "success", summary });
  } catch (err) {
    console.error("❌ generatePageSummary error:", err);
    sendResponse({ status: "error", summary: "Could not summarize." });
  }
}
