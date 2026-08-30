import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { safeTrim } from "@/lib/sanitize";

// Cost-optimized model fallback ladder: prioritizing ultra-lightweight, high-speed, lowest-cost models
const MODEL_FALLBACK_LADDER = [
  "gemini-3.1-flash-lite", // Primary: lowest cost, high throughput, minimal token usage
  "gemini-flash-latest",   // Secondary: fast, cost-effective standard flash
  "gemini-3.7-flash",      // Tertiary: resilient standard fallback
  "gemini-3.6-flash",      // Quaternary fallback
] as const;

// Lazy initialization of GoogleGenAI SDK with telemetry header
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

interface FallbackResult {
  text: string;
  modelUsed: string;
}

/**
 * Standard Helper: Resilient Model Fallback Ladder
 * Sequentially attempts models across recoverable failure codes (503, 429, 404, 500)
 */
async function generateContentWithFallback(
  systemInstruction: string,
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
  temperature = 0.7
): Promise<FallbackResult> {
  const ai = getGeminiClient();
  let lastError: unknown = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature,
          // Minimal thinking level minimizes token usage, latency, and cost
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
          },
        },
      });

      const text = response.text || "";
      if (text) {
        return { text, modelUsed: model };
      }
    } catch (err: unknown) {
      lastError = err;
      // Continue to next model in the fallback ladder
    }
  }

  throw lastError || new Error("All Gemini fallback models exhausted without response.");
}

async function generateTitleWithFallback(promptText: string): Promise<string | null> {
  try {
    const ai = getGeminiClient();
    const prompt = `Based on the following journal reflection, generate a concise, evocative, and clean title (strictly 3 to 6 words, no quotation marks, no emojis):\n\n"${promptText}"\n\nTitle:`;
    for (const model of MODEL_FALLBACK_LADDER) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.3,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.MINIMAL,
            },
          },
        });
        const title = (response.text || "").trim().replace(/^["']|["']$/g, "");
        if (title && title.length > 2) {
          return title;
        }
      } catch {
        // next fallback
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Top-Level Request Deserialization & Defensive Ingestion
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload in request body." },
        { status: 400 }
      );
    }

    const body = (rawBody && typeof rawBody === "object") ? (rawBody as Record<string, unknown>) : {};
    const prompt = safeTrim(body.prompt, 10000);
    const mode = typeof body.mode === "string" ? body.mode : "reflect";
    const rawHistory = Array.isArray(body.contextHistory) ? body.contextHistory : [];

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt or journal content cannot be empty." },
        { status: 400 }
      );
    }

    // 2. Build Structured System Prompts based on Reflection Mode
    let modeGuidance = "";
    switch (mode) {
      case "summarize":
        modeGuidance = `
Focus on delivering a crisp, high-value summary of the user's reflection:
- Provide an Executive Essence (1-2 sentences).
- Extract 3-5 Key Themes & Takeaways (bulleted).
- Highlight emotional tone and underlying priorities.
- Suggest 1 high-leverage question to ponder.`;
        break;
      case "brainstorm":
        modeGuidance = `
Focus on creative expansion, practical ideas, and forward momentum:
- Validate the user's situation and intent.
- Propose 3-4 structured, inventive ideas or actionable pathways.
- Identify potential obstacles and simple countermeasures.
- End with a low-friction "Immediate Next Step" (under 5 minutes to start).`;
        break;
      case "reframe":
        modeGuidance = `
Provide thoughtful cognitive reframing and perspective expansion:
- Acknowledge feelings with warmth and non-judgmental empathy.
- Offer 2 alternative constructive lenses through which to view the situation.
- Highlight latent strengths, resilience, or growth opportunities.
- Offer a grounding affirmation.`;
        break;
      case "reflect":
      default:
        modeGuidance = `
Act as an insightful, supportive journaling companion:
- Deeply reflect on what the user shared with warmth, wisdom, and active listening.
- Unpack nuanced subtleties and emotional undercurrents.
- Ask 1-2 open-ended, thought-provoking questions that guide deeper self-discovery.
- Keep the tone encouraging, authentic, and grounded.`;
        break;
    }

    const systemInstruction = `You are Aether, a trusted and dedicated AI Reflection, Brainstorming, and Journaling Companion.
Your exclusive purpose is to help the user introspect, process thoughts, gain emotional and mental clarity, organize abstract ideas, brainstorm creative concepts, and reflect deeply on their personal and professional journey.

STRICT DOMAIN BOUNDARIES & CODE POLICY:
- YOU MUST NEVER WRITE CODE, PROGRAMMING SCRIPTS, OR TECHNICAL SYNTAX (e.g., Python, JavaScript, TypeScript, C++, Rust, Go, SQL, Bash scripts, HTML/CSS).
- If the user asks you to write code, build a programming script, implement an algorithm, or act as a software developer / coding assistant:
  1. Politely and firmly decline writing code or programming scripts.
  2. Remind the user with warmth that Aether is exclusively an introspective journaling, brainstorming, and philosophical reflection space.
  3. Pivot the conversation into a reflective journaling inquiry: offer to help them brainstorm the conceptual ideas, clarify architectural trade-offs, explore their motivation/mindset, or journal about the problem they are trying to solve.

RESPONSE & FORMATTING GUIDELINES:
- Format your responses with clean Markdown (bold text, thoughtful bullet points, and gentle headers where appropriate).
- Avoid generic cliches, robotic pleasantries, and preachy advice. Be an empathetic, articulate thinking partner.
- Help the user unearth insights, unpack cognitive friction, and structure their thinking.
${modeGuidance}`;

    // 3. Construct Multi-Turn Contents
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    for (const item of rawHistory) {
      if (item && typeof item === "object" && typeof item.content === "string") {
        const text = safeTrim(item.content, 4000);
        if (text) {
          contents.push({
            role: item.role === "model" ? "model" : "user",
            parts: [{ text }],
          });
        }
      }
    }

    // Append current prompt as the latest user turn
    contents.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    const shouldGenerateTitle = Boolean(body.generateTitle);

    // 4. Execute AI Generation with Resilient Fallback Ladder (and concurrent title generation if requested)
    if (shouldGenerateTitle) {
      const [result, titleResult] = await Promise.all([
        generateContentWithFallback(systemInstruction, contents),
        generateTitleWithFallback(prompt),
      ]);

      return NextResponse.json({
        reply: result.text,
        title: titleResult || undefined,
        modelUsed: result.modelUsed,
        timestamp: Date.now(),
      });
    }

    const result = await generateContentWithFallback(systemInstruction, contents);

    return NextResponse.json({
      reply: result.text,
      modelUsed: result.modelUsed,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      {
        error: "Failed to generate reflection from Gemini. Please try again.",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
