import { NextRequest } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import { readFileSync } from "fs";

export const runtime = "nodejs";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function resolveServiceAccountCredentials(): { client_email: string; private_key: string } | undefined {
  const inlineJson = process.env.GCP_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (inlineJson) {
    try {
      return JSON.parse(inlineJson);
    } catch (error) {
      console.error("Failed to parse inline Google credentials JSON", error);
      throw new Error("Invalid service account JSON provided in environment variable");
    }
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath) {
    try {
      const data = readFileSync(credentialsPath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to read GOOGLE_APPLICATION_CREDENTIALS file", error);
      throw new Error("Unable to read service account file at GOOGLE_APPLICATION_CREDENTIALS path");
    }
  }

  return undefined;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const text = String(form.get("text") || "");
  const modelLabel = String(form.get("model") || "SOLVIX 1.0");
  const style = String(form.get("style") || "해설지");
  const image = form.get("image") as File | null;
  const conversation = form.get("conversation") as string | null;

  if (!text && !image) {
    return new Response(JSON.stringify({ error: "Empty request" }), { status: 400 });
  }

  // Project configuration
  const project = getEnv("GCP_PROJECT_ID");
  const location = getEnv("GCP_LOCATION");
  const endpointId = getEnv("VERTEX_ENDPOINT_ID");

  // Initialize Vertex AI
  const credentials = resolveServiceAccountCredentials();
  if (!credentials) {
    throw new Error("Google Cloud service account credentials not configured. Set GCP_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS_JSON in Vercel environment.");
  }

  const vertex = new VertexAI({
    project,
    location,
    googleAuthOptions: {
      credentials,
    },
  });
  const endpointPath = `projects/${project}/locations/${location}/endpoints/${endpointId}`;
  const generativeModel = vertex.getGenerativeModel({ model: endpointPath });

      // Build request body with conversation context
      const parts: any[] = [];
      if (text) parts.push({ text });
      if (image) {
        const arrayBuffer = await image.arrayBuffer();
        const b64 = Buffer.from(arrayBuffer).toString("base64");
        parts.push({ inline_data: { mime_type: image.type || "image/png", data: b64 } });
      }

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
            inline_data: { 
              mime_type: "image/png", 
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
      contents.push({
        role: "user",
        parts,
      });

      const requestBody = {
        contents,
    // Optional: system/context instructions
    tools: [],
    generation_config: {
      temperature: 1,
      top_p: 0.9,
      top_k: 40,
    },
    // Safety settings aligned with console samples
    safety_settings: [
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_LOW_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_LOW_AND_ABOVE" },
    ],
  } as any;

  try {
    const resp = await generativeModel.generateContent(requestBody);
    // The SDK returns a rich object; extract plain text if available
    const candidates = (resp as any)?.response?.candidates || [];
    const textOut = candidates
      .map((c: any) => c?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n"))
      .filter(Boolean)
      .join("\n\n");

    return new Response(
      JSON.stringify({ ok: true, text: textOut, raw: resp.response }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Vertex AI error", err);
    const message = err?.message || "Vertex AI request failed";
    const details = err?.response?.error ?? err?.stack ?? null;
    return new Response(
      JSON.stringify({ error: "Vertex AI request failed", message, details }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

