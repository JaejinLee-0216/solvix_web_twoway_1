import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const text = String(form.get("text") || "");
  const image = form.get("image") as File | null;
  const conversation = form.get("conversation") as string | null;

  if (!text && !image) {
    return new Response(JSON.stringify({ error: "Empty request" }), { status: 400 });
  }

  const apiKey = required("GOOGLE_CLOUD_API_KEY");
  const modelPath = required("MODEL_PATH"); // projects/.../locations/.../endpoints/...

  const ai = new GoogleGenAI({ apiKey });

  // Parse conversation history
  let conversationHistory: any[] = [];
  if (conversation) {
    try {
      conversationHistory = JSON.parse(conversation);
    } catch (e) {
      console.error("Failed to parse conversation history:", e);
    }
  }

  // Build contents array with conversation history
  const contents: any[] = [];
  
  // Add conversation history
  conversationHistory.forEach((msg: any) => {
    const role = msg.role === 'user' ? 'user' : 'model';
    const messageParts: any[] = [];
    
    if (msg.text) messageParts.push({ text: msg.text });
    if (msg.image) {
      // Handle base64 image from conversation history
      const base64Data = msg.image.split(',')[1] || msg.image;
      messageParts.push({ 
        inlineData: { 
          mimeType: "image/png", 
          data: base64Data 
        } 
      });
    }
    
    if (messageParts.length > 0) {
      contents.push({
        role,
        parts: messageParts
      });
    }
  });
  
  // Add current message
  const parts: any[] = [];
  if (text) parts.push({ text });
  if (image) {
    const b64 = Buffer.from(await image.arrayBuffer()).toString("base64");
    parts.push({ inlineData: { mimeType: image.type || "image/png", data: b64 } });
  }
  
  contents.push({
    role: "user",
    parts,
  });

  try {
    const generationConfig = {
      temperature: 1,
      topP: 0.9,
      maxOutputTokens: 65535,
      safetySettings: [
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_LOW_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_LOW_AND_ABOVE" },
      ],
    } as any;

    // Prefer chats API if available (matches your Node.js sample)
    if ((ai as any).chats?.create) {
      const chat = (ai as any).chats.create({ model: modelPath, config: generationConfig });
      if (chat.sendMessageStream) {
        const stream = await chat.sendMessageStream({ message: parts });
        let out = "";
        for await (const chunk of stream as any) {
          if (chunk?.text) out += chunk.text;
        }
        return new Response(JSON.stringify({ ok: true, text: out }), { headers: { "content-type": "application/json" } });
      }
      const single = await chat.sendMessage({ message: parts });
      const textOut = (single as any)?.response?.candidates?.map((c: any) => c?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n")).filter(Boolean).join("\n\n")
        ?? (single as any)?.output_text ?? "";
      return new Response(JSON.stringify({ ok: true, text: textOut, raw: (single as any).response ?? single }), { headers: { "content-type": "application/json" } });
    }

    // Fallback to responses API if provided by SDK
    if ((ai as any).responses?.generate) {
      const resp = await (ai as any).responses.generate({
        model: modelPath,
        contents,
        generationConfig,
      });
      const candidates = (resp as any)?.response?.candidates || (resp as any)?.candidates || [];
      const textOut = candidates
        .map((c: any) => c?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n"))
        .filter(Boolean)
        .join("\n\n") || (resp as any)?.output_text || "";
      return new Response(JSON.stringify({ ok: true, text: textOut, raw: (resp as any).response ?? resp }), { headers: { "content-type": "application/json" } });
    }

    throw new Error("Unsupported @google/genai SDK surface: neither chats nor responses API available");
  } catch (e: any) {
    console.error("genai route_second error", e);
    return new Response(JSON.stringify({ error: "genai request failed" }), { status: 500 });
  }
}

