import { ExtractedItem } from "./types";
import { getAllFolders, getRecentNotesByFolder } from "./storage";
import { format } from "date-fns";

/** Transcribes an audio file using Gemini's multimodal API.
 *  Works with files from iPhone Voice Memos (.m4a), Android (.3gp, .ogg),
 *  and standard formats (.mp3, .wav, .webm). Max ~20MB inline.
 */
export async function transcribeAudioFile(
  file: File,
  apiKey: string,
  model: string = "gemini-2.0-flash"
): Promise<string> {
  // Convert file to base64
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);

  // Determine MIME type — Gemini supports: audio/wav, audio/mp3, audio/aiff,
  // audio/aac, audio/ogg, audio/flac, audio/m4a, audio/mpeg, audio/webm
  const mimeMap: Record<string, string> = {
    "m4a": "audio/mp4",
    "mp4": "audio/mp4",
    "mp3": "audio/mpeg",
    "mpeg": "audio/mpeg",
    "wav": "audio/wav",
    "ogg": "audio/ogg",
    "flac": "audio/flac",
    "aiff": "audio/aiff",
    "aif": "audio/aiff",
    "webm": "audio/webm",
    "3gp": "audio/3gp",
    "3gpp": "audio/3gp",
  };
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const mimeType = mimeMap[ext] || file.type || "audio/mp4";

  const modelsToTry = [model, "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-latest"]
    .filter((v, i, a) => a.indexOf(v) === i);

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  for (const currentModel of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await delay(1500);
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: "Please transcribe the following audio accurately. Return only the transcription text with no commentary, no timestamps, and no formatting. Just the spoken words exactly as said." },
                  { inline_data: { mime_type: mimeType, data: base64 } },
                ],
              }],
              generationConfig: { temperature: 0 },
            }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (text.trim()) return text.trim();
        } else if (res.status === 429) {
          continue; // retry
        } else {
          break; // try next model
        }
      } catch {
        // network error, try next
      }
    }
  }
  throw new Error("Audio transcription failed. Please check your API key and try again.");
}


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

  // The requested model + a very robust list of safe fallbacks that work on most API keys
  const modelsToTry = [
    model, 
    "gemini-2.5-flash",
    "gemini-1.5-flash", 
    "gemini-1.5-flash-latest",
    "gemini-pro"
  ].filter((v, i, a) => a.indexOf(v) === i);
  
  let lastError = null;
  let response = null;
  let failedModels: string[] = [];
  
  for (const currentModel of modelsToTry) {
    let retries = 1; // Allow 1 retry per model for 429s (don't stall the UI too long)
    let currentAttempt = 0;
    let modelSuccess = false;
    
    while (currentAttempt <= retries) {
      if (currentAttempt > 0) {
        await delay(1500); // 1.5s backoff
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
          modelSuccess = true;
          break; // Break while loop
        }

        const errStatus = response.status;
        const errText = await response.text();
        lastError = new Error(`Model ${currentModel} failed: ${errStatus} — ${errText}`);
        
        if (errStatus === 429) {
          console.warn(`[AI] 429 hit on ${currentModel}. Retrying...`);
          currentAttempt++;
        } else {
          // 404 (not found) or 400 (bad request) -> break immediately to try next model
          failedModels.push(`${currentModel}(${errStatus})`);
          break; 
        }
      } catch (e: any) {
        lastError = e;
        currentAttempt++;
      }
    }
    
    if (modelSuccess) {
      break; // Success! Break out of the outer for loop completely
    }
  }

  if (!response?.ok) {
    throw new Error(`AI extraction failed completely. Models tried and failed: ${failedModels.join(", ")}. Last error: ${lastError?.message || 'Unknown'}. Please check your API key or use the Google AI Studio to verify your access.`);
  }

  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

  let jsonStr = raw.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed: any[] = JSON.parse(jsonStr);

  return parsed.map((item: any, i: number) => ({
    id: crypto.randomUUID(),
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
