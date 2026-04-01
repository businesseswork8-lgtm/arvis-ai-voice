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

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\nHere is the transcript:\n${transcript}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI request failed: ${response.status} — ${err}`);
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
