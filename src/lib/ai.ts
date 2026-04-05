import { ExtractedItem } from "./types";
import { getAllFolders, getRecentNotesByFolder } from "./storage";
import { format } from "date-fns";

export async function extractItems(
  transcript: string,
  apiKey: string,
  model: string
): Promise<ExtractedItem[]> {
  const folders = getAllFolders();
  const folderList = folders.map((f) => `${f.emoji} ${f.label} (key: "${f.key}")`).join(", ");
  const todayStr = format(new Date(), "yyyy-MM-dd, EEEE");

  // Get recent notes for context
  const recentNotes = await getRecentNotesByFolder();
  let folderExamples = "";
  for (const [key, titles] of Object.entries(recentNotes)) {
    const folder = folders.find((f) => f.key === key);
    if (folder && titles.length > 0) {
      folderExamples += `\n${folder.label} folder examples: ${titles.join(", ")}`;
    }
  }

  const systemPrompt = `You are Declutter AI — a personal secretary for founders. The user will give you a raw voice transcript. Extract EVERY distinct actionable item from it.

Today's date is: ${todayStr}. Resolve ALL relative dates (tomorrow, next Monday, in 3 days, etc.) to actual ISO 8601 dates.

For each item return a JSON object. The schema depends on the type:

Calendar Event: { type: "Calendar Event", title, content, datetime (ISO start), end_datetime (ISO end), event_color (one of: "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4") }

Task: { type: "Task", title, content, datetime (ISO due date/time if mentioned, else null) }

Reminder: { type: "Reminder", title, datetime (ISO date/time) }

Note: { type: "Note", title, content, folder (one of these folder keys: ${folderList}), confidence ("high" or "low") }
- If the note clearly belongs to a folder, set confidence: "high"
- If unsure which folder, set confidence: "low" and pick the best guess
- If no folder matches at all, set folder to "personal" and confidence to "low"
${folderExamples ? `\nFolder assignment context:${folderExamples}` : ""}

IMPORTANT: Tasks, Reminders, and Calendar Events do NOT have a folder field.

Return a JSON array of items. Only return the JSON array, nothing else. No markdown, no explanation.`;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // The requested model + safe fallbacks
  const modelsToTry = [model, "gemini-1.5-flash", "gemini-1.5-pro"].filter((v, i, a) => a.indexOf(v) === i);
  
  let lastError = null;
  let response = null;
  
  // Try up to 3 models, and for 429s (Rate Limit), retry the same model up to 2 times with backoff
  for (const currentModel of modelsToTry) {
    let retries = 2; // Allow 2 retries per model for 429s
    let currentAttempt = 0;
    
    while (currentAttempt <= retries) {
      if (currentAttempt > 0) {
        // Exponential backoff: 1.5s, then 3s
        const waitTime = 1500 * Math.pow(2, currentAttempt - 1);
        console.log(`[AI Retry] Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
      }
      
      try {
        console.log(`[AI] Attempting extraction with model: ${currentModel}`);
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\nHere is the transcript:\n${transcript}` }] }],
              generationConfig: { temperature: 0.3 },
            }),
          }
        );

        if (response.ok) {
          break; // Success! Break out of the while loop
        }

        const errStatus = response.status;
        const errText = await response.text();
        lastError = new Error(`AI request failed: ${errStatus} — ${errText}`);
        
        if (errStatus === 429) {
          console.warn(`[AI] Rate limit (429) hit on ${currentModel}. Retrying... (Attempt ${currentAttempt + 1}/${retries + 1})`);
          currentAttempt++;
        } else if (errStatus === 404) {
          console.warn(`[AI] Model not found (404) for ${currentModel}. Moving to fallback model.`);
          break; // Break the while loop to move to the NEXT model in the for loop
        } else {
          // Bad request, auth error, etc. Break while loop, try fallback model.
          break; 
        }
      } catch (e) {
        lastError = e;
        // Network error, retry same model
        currentAttempt++;
      }
    }
    
    if (response?.ok) {
      break; // Success! Break out of the outer for loop
    }
  }

  if (!response?.ok) {
    throw lastError || new Error("AI extraction failed after retries and fallbacks.");
  }

  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

  let jsonStr = raw.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed: any[] = JSON.parse(jsonStr);

  return parsed.map((item: any, i: number) => ({
    id: `${Date.now()}-${i}`,
    type: item.type || "Note",
    folder: item.type === "Note" ? (item.folder || "personal") : "",
    title: item.title || "Untitled",
    content: item.content || "",
    datetime: item.datetime || undefined,
    end_datetime: item.end_datetime || undefined,
    event_color: item.event_color || undefined,
    confidence: item.confidence || undefined,
    confirmed: false,
    dismissed: false,
  }));
}
