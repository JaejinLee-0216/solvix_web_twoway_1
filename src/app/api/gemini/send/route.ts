import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const DEFAULT_TUTOR_PROMPT = `역할: 너는 수능 수학 문제를 함께 풀어주는 과외 선생님이야. 너의 목표는 정답을 알려주는 것이 아니라, 학생이 스스로 생각의 벽을 넘을 수 있도록 돕는 페이스메이커야.

- 설명 원칙:
1. 생각의 흐름을 따라가는 대화: 절대 결론부터 말하지 마. 학생의 풀이를 보고 "음, 여기까지는 정말 잘 왔는데, 여기서부터 길이 두 갈래로 나뉘네. 어느 쪽으로 가야 할까?" 와 같이 학생의 생각 과정을 따라가며 대화해 줘. 항상 "왜 그렇게 될까?", "그 다음엔 뭘 확인해야 할까?" 같은 질문을 던져서 학생이 스스로 답을 찾도록 유도해야 해.
2. 자연스러운 리액션 (과한 칭찬 금지): - "핵심을 찔렀어", "정말 대단해" 같은 과장되고 인위적인 칭찬은 절대 금지. - 대신, 학생의 말이 맞으면 "오, 그거지", "맞아", "좋아, 거기까지"처럼 자연스럽게 인정하고 바로 다음 질문으로 연결해. - 학생이 막히면 "음... 힌트를 좀 줄까?", "아니면 다른 방향으로 생각해 볼까?"라고 제안해.


- 출력 형식 지침
실제 카톡 대화처럼 한 턴(turn)에 한두 문장의 짧은 메시지를 보내야 해. 학생과 대화를 여러 번 주고받는(ping-pong) 게 목표야.
1. 짧은 호흡으로 대화하기: 답변을 한두 문장의 짧은 문단 여러 개로 나누어, 마치 메신저로 대화하듯 말해. 한 번의 답변(문단)에는 하나의 핵심 아이디어나 질문만 담아서, 대화가 자연스럽게 이어지도록 해 줘.
2. 구체적인 채팅 스타일 예시:
"음... '원과 직선 사이에서 가장 특수한 상태'가 뭘까?"
"바로 '접할 때'지!"
"좋아! 그럼 원에 접선을 스윽- 그었다고 상상해 봐."
"원의 중심이랑 접점을 이은 선은, 우리가 방금 그은 접선이랑 어떻게 만날까?"
"서로 '수직'이라는 거! 여기까지 따라왔어?"
3. 가벼운 입버릇 사용: 문장 사이사이에 "음...", "뭐", "그", "저"와 같은 가벼운 감탄사나 입버릇을 조금씩 섞어 말문을 여는 느낌을 줍니다.
4. 수학 기호 표기: 수학과 관련된 모든 문자나 기호는 LaTeX 수식 표기(예: $x^2$)를 활용합니다.
5. 이해도 확인: 학생의 이해를 확인하는 짧은 질문이나 다음 학습 방향 제안을 포함합니다.`;

type PreparedImage = {
  base64: string;
  mime: string;
  dataUrl: string;
};

const SOLVIX_LITE_MODEL = "SOLVIX 1.0 LITE";

const GEMINI_MODEL_ID = process.env.GOOGLE_GENAI_MODEL_ID || "gemini-flash-latest";

export const runtime = "nodejs";

const generateSessionId = () => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (error) {
    // ignore
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const resolveSupabaseUserId = async (request: NextRequest): Promise<string | null> => {
  try {
    const userInfoCookie = request.cookies.get("userInfo");
    if (!userInfoCookie?.value) {
      return null;
    }

    const parsed = JSON.parse(userInfoCookie.value);
    const kakaoId = parsed?.kakao_id ?? parsed?.id;
    if (!kakaoId) {
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("kakao_id", kakaoId)
      .single();

    if (error || !data) {
      if (error) {
        console.error("Supabase user lookup error:", error);
      }
      return null;
    }

    return data.id as string;
  } catch (error) {
    console.error("Failed to parse userInfo cookie:", error);
    return null;
  }
};

const persistConversation = async (
  request: NextRequest,
  params: {
    sessionId: string;
    question: string;
    answer: string;
    images: PreparedImage[];
    model: string;
    style: string;
  }
) => {
  const userId = await resolveSupabaseUserId(request);
  if (!userId) {
    return;
  }

  if (!params.question && params.images.length === 0 && !params.answer) {
    return;
  }

  try {
    const payload: Array<Record<string, unknown>> = [];

    payload.push({
      user_id: userId,
      session_id: params.sessionId,
      message_type: "user",
      message_content: params.question,
      image_url: params.images.length > 0
        ? JSON.stringify(params.images.map((item) => item.dataUrl))
        : null,
      model_used: params.model,
      style_used: params.style,
    });

    if (params.answer) {
      payload.push({
        user_id: userId,
        session_id: params.sessionId,
        message_type: "assistant",
        message_content: params.answer,
        image_url: null,
        model_used: params.model,
        style_used: params.style,
      });
    }

    await supabaseAdmin.from("user_conversations").insert(payload);
  } catch (error) {
    console.error("Failed to persist conversation:", error);
  }
};

const normalizeBase64 = (src: unknown) => {
  if (typeof src !== "string" || src.length === 0) return null;
  const commaIndex = src.indexOf(',');
  const base64 = commaIndex >= 0 ? src.slice(commaIndex + 1) : src;
  return base64.length > 0 ? base64 : null;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_GENAI_API_KEY가 설정되어 있지 않습니다." }, { status: 500 });
  }

  const form = await req.formData();
  const text = String(form.get("text") || "");
  const conversation = form.get("conversation") as string | null;
  const modelLabel = String(form.get("model") || SOLVIX_LITE_MODEL);
  const style = String(form.get("style") || "해설지");
  const sessionRaw = form.get("sessionId");
  const sessionId = typeof sessionRaw === "string" && sessionRaw.trim().length > 0
    ? sessionRaw.trim()
    : generateSessionId();

  const imageEntries = form.getAll("images");
  const images = imageEntries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const legacyImage = form.get("image");
  if (images.length === 0 && legacyImage instanceof File && legacyImage.size > 0) {
    images.push(legacyImage);
  }

  const preparedImages: PreparedImage[] = await Promise.all(
    images.map(async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mime = file.type || "image/png";
      return {
        base64,
        mime,
        dataUrl: `data:${mime};base64,${base64}`,
      };
    })
  );

  if (!text && preparedImages.length === 0) {
    return NextResponse.json({ error: "Empty request" }, { status: 400 });
  }

  let conversationHistory: any[] = [];
  if (conversation) {
    try {
      conversationHistory = JSON.parse(conversation);
    } catch (error) {
      console.error("Failed to parse conversation history:", error);
    }
  }

  const contents: any[] = [];

  conversationHistory.forEach((msg: any) => {
    const role = msg.role === 'user' ? 'user' : 'model';
    const parts: any[] = [];

    if (typeof msg.text === "string" && msg.text.length > 0) {
      parts.push({ text: msg.text });
    }

    if (Array.isArray(msg.images)) {
      msg.images.forEach((raw: unknown) => {
        const normalized = normalizeBase64(raw);
        if (normalized) {
          parts.push({
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
        parts.push({
          inline_data: {
            mime_type: "image/png",
            data: normalized,
          },
        });
      }
    }

    if (parts.length > 0) {
      contents.push({ role, parts });
    }
  });

  const userParts: any[] = [];
  if (text) {
    userParts.push({ text });
  }
  preparedImages.forEach(({ base64, mime }) => {
    userParts.push({ inline_data: { mime_type: mime, data: base64 } });
  });

  if (userParts.length > 0) {
    contents.push({ role: "user", parts: userParts });
  }

  const requestBody = {
    systemInstruction: {
      role: "system",
      parts: [{ text: DEFAULT_TUTOR_PROMPT }],
    },
    contents,
    safetySettings: [
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_LOW_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_LOW_AND_ABOVE" },
    ],
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_ID}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = typeof payload?.error?.message === "string" && payload.error.message.length > 0
        ? payload.error.message
        : "Gemini 응답을 가져오지 못했습니다.";
      throw new Error(message);
    }

    const textOut = Array.isArray(payload?.candidates)
      ? payload.candidates
          .map((candidate: any) =>
            Array.isArray(candidate?.content?.parts)
              ? candidate.content.parts
                  .map((part: any) => part?.text)
                  .filter(Boolean)
                  .join("\n")
              : ""
          )
          .filter((entry: string) => entry.length > 0)
          .join("\n\n")
      : "";

    await persistConversation(req, {
      sessionId,
      question: text,
      answer: textOut,
      images: preparedImages,
      model: modelLabel,
      style,
    });

    return NextResponse.json({ ok: true, text: textOut, raw: payload });
  } catch (error: any) {
    console.error("Gemini API error", error);
    const message = typeof error?.message === "string" && error.message.length > 0
      ? error.message
      : "Gemini API 요청에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


