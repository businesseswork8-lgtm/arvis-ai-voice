import { ExtractedItem } from "./types";
import { getAllFolders } from "./storage";

export async function extractItems(
  transcript: string,
  apiKey: string,
  model: string
): Promise<ExtractedItem[]> {
  const folders = getAllFolders();
  const folderList = folders.map((f) => `${f.emoji} ${f.label} (key: "${f.key}")`).join(", ");

  const systemPrompt = `You are Declutter AI — a personal secretary for founders. The user will give you a raw voice transcript. Extract EVERY distinct actionable item from it.

For each item return a JSON object with:
- type: one of "Task", "Reminder", "Calendar Event", "Note"
- folder: one of these folder keys: ${folderList}. If unsure, use "personal".
- title: short clear title
- content: expanded description
- datetime: ISO 8601 string if a date/time was mentioned, otherwise null

Return a JSON array of items. Only return the JSON array, nothing else.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\n---\n\nTranscript:\n${transcript}` }] },
        ],
        generationConfig: { temperature: 0.3 },
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
    folder: item.folder || "personal",
    title: item.title || "Untitled",
    content: item.content || "",
    datetime: item.datetime || undefined,
    confirmed: false,
    dismissed: false,
  }));
}
