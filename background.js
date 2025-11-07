// background.js
console.log("🔥 VoiceNav AI Brain starting...");

import { GEMINI_API_KEY } from './config.js';

// 1️⃣ REGISTER LISTENER IMMEDIATELY
// This must be at the top level to ensure it catches wake-up messages.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "PROCESS_TEXT") {
        console.log("🎤 Voice received:", request.text);
        fetchCommandFromGemini(request.text);
    }
    // Return true if you ever need to use sendResponse asynchronously
    return true;
});

console.log("✅ Listener ready. Waiting for voice commands...");

// 2️⃣ CONFIG & AI LOGIC
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `
You are a browser automation assistant. Translate user speech into STRICT JSON commands.
Output ONLY valid JSON. No conversational text.

SCHEMA:
{ "action": "scroll", "direction": "up"|"down"|"top"|"bottom" }
{ "action": "navigate", "to": "back"|"forward" }
{ "action": "read", "target": "selection"|"visible" }
{ "action": "open", "byText": "link text matched" }
{ "action": "open", "whichIndex": number_0_based }
{ "action": "find", "query": "search text" }
{ "action": "stop" }
`;

async function fetchCommandFromGemini(userText) {
    try {
        console.log("📡 Asking Gemini...");
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: SYSTEM_PROMPT + "\nUser: " + userText }] }]
            })
        });

        const data = await response.json();

        if (data.error) {
             throw new Error(data.error.message || "Google API Error");
        }
        if (!data.candidates || data.candidates.length === 0) {
             throw new Error("Gemini returned no content.");
        }

        const rawText = data.candidates[0].content.parts[0].text;
        const cleanJson = rawText.replace(/```json|```/g, "").trim();
        const commandObj = JSON.parse(cleanJson);

        console.log("🤖 Command parsed:", commandObj);

        // Send to active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, { type: "EXECUTE_COMMAND", command: commandObj });
            console.log("📤 Sent to tab:", tab.id);
        } else {
            console.warn("⚠️ No active tab found to send command to.");
        }

    } catch (error) {
        console.error("❌ AI Error:", error.message);
    }
}