// background.js
console.log("🔥 VoiceNav AI Brain starting...");
import { GEMINI_API_KEY } from './config.js';

// 1️⃣ MAIN MESSAGE LISTENER (Handles voice intent & summarization requests)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // HANDLER 1: Initial Voice Intent
    if (request.type === "PROCESS_TEXT") {
        handleVoiceIntent(request.text, sendResponse);
        return true; // Keep channel open for async response
    }
    // HANDLER 2: NEW - Actual Page Summarization
    if (request.type === "GENERATE_SUMMARY") {
        generatePageSummary(request.text, sendResponse);
        return true; // Keep channel open
    }
});

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// 2️⃣ INTENT PARSING (Updated with 'summarize')
async function handleVoiceIntent(userText, sendResponse) {
    const SYSTEM_PROMPT = `
You are a browser automation assistant. Output ONLY valid JSON.
SCHEMA:
{ "action": "scroll", "direction": "up"|"down"|"top"|"bottom" }
{ "action": "navigate", "to": "back"|"forward" }
{ "action": "navigate", "url": "https://..." }
{ "action": "createTab", "url": "https://..." }
{ "action": "read", "target": "selection"|"page"|"paragraph", "whichIndex": number_0_based } <-- UPDATED
{ "action": "summarize", "target": "page"|"selection"|"paragraph", "whichIndex": number_0_based } <-- UPDATED
{ "action": "click", "byText": "text" }
{ "action": "click", "whichIndex": number }
{ "action": "stop" }

EXAMPLES:
"read the third paragraph" -> { "action": "read", "target": "paragraph", "whichIndex": 2 }
"summarize this" (if text selected) -> { "action": "summarize", "target": "selection" }
"summarize the first paragraph" -> { "action": "summarize", "target": "paragraph", "whichIndex": 0 }
`;

    try {
        // ... (Use your existing fetch code here for intent parsing) ...
        // For brevity, I'm skipping repeating the exact same fetch block from before.
        // Just make sure you use the NEW SYSTEM_PROMPT above.
        const response = await fetch(API_URL, {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ contents: [{ parts: [{ text: SYSTEM_PROMPT + "\nUser: " + userText }] }] })
        });
        const data = await response.json();
        const command = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim());

        // ... (Keep your existing createTab interceptor here) ...
         if (command.action === "createTab" && command.url) {
             await chrome.tabs.create({ url: command.url });
             sendResponse({ status: "success", message: "Opened new tab" });
             return;
         }

        // Send to tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
             await chrome.tabs.sendMessage(tab.id, { type: "EXECUTE_COMMAND", command });
             sendResponse({ status: "success", message: `Action: ${command.action}` });
        }
    } catch (error) {
        sendResponse({ status: "error", message: error.message });
    }
}

// 3️⃣ NEW: GENERATE SUMMARY FUNCTION
async function generatePageSummary(pageText, sendResponse) {
    try {
        const SUMMARY_PROMPT = "Summarize the following webpage text in 3 concise sentences for a visually impaired user. Capture the main point only.\n\nTEXT:\n" + pageText;

        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: SUMMARY_PROMPT }] }] })
        });
        const data = await response.json();
        const summary = data.candidates[0].content.parts[0].text;

        sendResponse({ status: "success", summary: summary });
    } catch (error) {
        sendResponse({ status: "error", summary: "Sorry, I couldn't summarize this page." });
    }
}