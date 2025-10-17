import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const DEFAULT_TUTOR_PROMPT = `역할: 당신은 수능 수학을 지도하는 Q&A 조교입니다. 학생이 올린 문제와 자신의 풀이 과정을 분석해 실시간으로 도움을 줍니다.

말투 지침
- 학생과 자연스럽게 대화하듯 답변하되, 분석적이고 정확한 내용을 전합니다.
- 문장 사이사이에 "음...", "뭐", "그", "저"와 같은 가벼운 감탄사나 입버릇을 조금씩 섞어 말문을 여는 느낌을 줍니다.
- 감탄사는 남용하지 말고, 핵심 설명 앞이나 생각을 정리하는 구간에 자연스럽게 배치합니다.

1. "왜 틀렸을까?" 진단
- 학생이 업로드한 틀린 풀이 이미지를 분석하고 잘못된 단계와 개념을 정확히 짚어 줍니다.
- 오류 유형을 구체적으로 설명합니다. 예: "3번째 줄에서 미분 계수 공식을 잘못 적용했습니다."와 같이 오류 지점을 명확히 말합니다.
- 사고 과정을 역추적해 잠재적인 오개념을 질문 형태로 확인합니다. 예: "혹시 A 개념을 B로 착각했나요? 이 문제의 함정은 그 부분이에요."처럼 학생이 놓쳤을 가능성을 짚어 줍니다.

2. 소통(상호작용)하는 조교
- 정답을 곧바로 제시하지 말고 학생이 스스로 생각을 이어갈 수 있도록 결정적인 힌트를 단계별로 제공합니다.
- 학생이 "왜 여기서 치환을 하나요?"라고 물으면 해당 단계의 이유를 자세히 설명하고 배경 개념을 연결해 줍니다.
- "어려운 문제인데 거의 다 왔어요!"처럼 긍정적이고 동기부여가 되는 피드백을 덧붙입니다.

출력 형식 지침
- 친절하고 명료한 한국어로 답변하며, 단계는 번호나 하이픈을 사용해 정리합니다.
- 수학과 관련된 모든 문자나 기호는 LaTeX 수식 표기(예: $x^2$)를 활용합니다.
- 학생의 이해를 확인하는 짧은 질문이나 다음 학습 방향 제안을 포함합니다.`;

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const text = String(form.get("text") || "");
  const conversation = form.get("conversation") as string | null;

  const imageEntries = form.getAll("images");
  const images = imageEntries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const legacyImage = form.get("image");
  if (images.length === 0 && legacyImage instanceof File && legacyImage.size > 0) {
    images.push(legacyImage);
  }

  if (!text && images.length === 0) {
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
    const normalizeBase64 = (src: unknown) => {
      if (typeof src !== "string" || src.length === 0) return null;
      const commaIndex = src.indexOf(',');
      const base64 = commaIndex >= 0 ? src.slice(commaIndex + 1) : src;
      return base64.length > 0 ? base64 : null;
    };

    if (Array.isArray(msg.images)) {
      msg.images.forEach((raw: unknown) => {
        const normalized = normalizeBase64(raw);
        if (normalized) {
          messageParts.push({
            inlineData: {
              mimeType: "image/png",
              data: normalized,
            }
          });
        }
      });
    } else if (msg.image) {
      const normalized = normalizeBase64(msg.image);
      if (normalized) {
        messageParts.push({ 
          inlineData: { 
            mimeType: "image/png", 
            data: normalized 
          } 
        });
      }
    }
    
    if (messageParts.length > 0) {
      contents.push({
        role,
        parts: messageParts
      });
    }
  });
  
  // Add current message
  const parts: any[] = [{ text: DEFAULT_TUTOR_PROMPT }];
  if (text) parts.push({ text });
  if (images.length > 0) {
    for (const file of images) {
      const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      parts.push({ inlineData: { mimeType: file.type || "image/png", data: b64 } });
    }
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

