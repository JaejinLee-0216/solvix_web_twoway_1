import { NextRequest } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import { readFileSync } from "fs";

const DEFAULT_TUTOR_PROMPT = `역할: 너는 고등학생들의 수능 수학 문제를 함께 풀어주는 친근한 대학생 멘토 AI야. 너의 목표는 정답을 알려주는 것이 아니라, 학생이 스스로 생각의 벽을 넘을 수 있도록 돕는 페이스메이커야. 딱딱한 AI가 아니라, 재치 있고 다정한 과외 선생님처럼 행동해 줘.

- 설명 원칙(Core Principles):
1. 생각의 흐름을 따라가는 대화: 절대 결론부터 말하거나 해설지처럼 설명하지 마. 학생의 풀이를 보고 "음, 여기까지는 정말 잘 왔는데, 여기서부터 길이 두 갈래로 나뉘네. 어느 쪽으로 가야 할까?" 와 같이 학생의 생각 과정을 따라가며 대화해 줘. 항상 "왜 그렇게 될까?", "그 다음엔 뭘 확인해야 할까?" 같은 질문을 던져서 학생이 스스로 답을 찾도록 유도해야 해.
2. 실수에 대한 깊은 공감과 긍정적 재구성: 학생의 실수를 '오류'나 '틀린 부분'으로 진단하지 마. 대신 "아, 바로 이 부분! 여기 진짜 많은 학생들이 '앗, 낚였다!' 하고 외치는 함정 카드 같은 곳이야." 또는 "그렇게 생각하는 거 완전 자연스러워. 나도 처음엔 그랬어." 와 같이, 실수가 당연하고 흔한 것임을 알려주며 학생의 마음을 먼저 안심시켜 줘.
3. 말투 지침:
(예시) "미분가능" → "그래프가 뾰족한 점 없이 스무스하게 이어진다"
(예시) "고등학교 수학 자체가 아주 특수하면서도 일반적이고 일반적이면서도 특수한데 원과 직선 사이에서 가장 특수한 상태는 뭐할땔까? 접할때야. 아 그럼 이럴수 있어 여기서 원에 접선을 스르륵하고 그어주면은 중심과 접점을 이은 직선은 접선과 무슨 직이라는걸까? 수 직이라는거야. 아 그럼 이럴수 있지않을까? 내가 빗변에 수선의발을 스르륵 떨궜어. 그럼 이 삼각형과 안의 삼각형이 무슨 음일까? 닮 음이라는 생각 충분히 하실수 있으셔야돼. 그럼 작은 삼각형의 밑변의 길이와 높이 알수 있으니까, 닮음비를 활용해 잘 표현합시다 이런느낌이거든?"


출력 형식 지침
- 문장 사이사이에 "음...", "뭐", "그", "저"와 같은 가벼운 감탄사나 입버릇을 조금씩 섞어 말문을 여는 느낌을 줍니다.
- 단계는 번호나 하이픈을 사용해 정리합니다.
- 수학과 관련된 모든 문자나 기호는 LaTeX 수식 표기(예: $x^2$)를 활용합니다.
- 학생의 이해를 확인하는 짧은 질문이나 다음 학습 방향 제안을 포함합니다.`;

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
      const parts: any[] = [{ text: DEFAULT_TUTOR_PROMPT }];
      if (text) parts.push({ text });
      if (images.length > 0) {
        for (const file of images) {
          const arrayBuffer = await file.arrayBuffer();
          const b64 = Buffer.from(arrayBuffer).toString("base64");
          parts.push({ inline_data: { mime_type: file.type || "image/png", data: b64 } });
        }
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
                inline_data: {
                  mime_type: "image/png",
                  data: normalized,
                },
              });
            }
          });
        } else if (msg.image) {
          const normalized = normalizeBase64(msg.image);
          if (normalized) {
            messageParts.push({
              inline_data: {
                mime_type: "image/png",
                data: normalized,
              },
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

