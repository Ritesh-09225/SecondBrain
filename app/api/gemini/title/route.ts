import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { safeTrim } from "@/lib/sanitize";

const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
  "gemini-2.5-flash",
] as const;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ title: "Journal Entry" }, { status: 400 });
    }

    const body = (rawBody && typeof rawBody === "object") ? (rawBody as Record<string, unknown>) : {};
    const text = safeTrim(body.text, 2000);

    if (!text) {
      return NextResponse.json({ title: "Journal Entry" });
    }

    const prompt = `Based on the following journal entry excerpt, generate a concise, evocative, and clean title (strictly 3 to 6 words, no quotation marks, no emojis).

Journal Excerpt:
"${text}"

Title:`;

    const ai = getGeminiClient();
    for (const model of MODEL_FALLBACK_LADDER) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.4,
          },
        });
        const title = (response.text || "").trim().replace(/^["']|["']$/g, "");
        if (title) {
          return NextResponse.json({ title });
        }
      } catch {
        // try next fallback model
      }
    }

    return NextResponse.json({ title: "Personal Reflection" });
  } catch {
    return NextResponse.json({ title: "Personal Reflection" });
  }
}
