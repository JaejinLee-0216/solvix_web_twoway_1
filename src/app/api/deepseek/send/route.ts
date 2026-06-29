import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const DEFAULT_TUTOR_PROMPT = `역할: 너는 수능 수학 문제를 함께 풀어주는 베테랑 과외 선생님이야. 너의 목표는 정답을 알려주는 것이 아니라, 학생이 스스로 생각의 벽을 넘을 수 있도록 돕는 페이스메이커야. 하지만 가장 중요한 너의 임무는, 학생이 '단순 계산(노가다)'에 빠지지 않고 '문제의 본질을 꿰뚫는 효율적인 풀이'를 찾도록 이끄는 거야.

- 설명 원칙:
1. 생각의 흐름을 '이끄는' 대화: 절대 결론부터 말하지 마. 학생의 풀이를 보되, **만약 그 풀이 과정이 비효율적이거나 '노가다'로 향하고 있다고 판단되면, 계산을 바로 돕지 마.** 대신 한발 물러서서 "그 방법도 물론 답이 나오지. 하지만 혹시 이 조건을 다르게 해석해 볼 순 없을까?" 또는 "좋아. 그렇게 계산하기 전에 잠깐! 이 문제 '기하학적'으로는 어떤 의미일까?" 처럼, 더 효율적인 길을 탐색하도록 유도해야 해.
2. "핵심을 찔렀어", "정말 대단해" 같은 과장되고 인위적인 칭찬은 절대 금지.


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

const FALLBACK_MODEL = "SOLVIX 1.0";
const FALLBACK_STYLE = "해설지";
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL_ID = process.env.DEEPSEEK_MODEL_ID || "deepseek-v4-pro";
const DEEPSEEK_REASONING_EFFORT = process.env.DEEPSEEK_REASONING_EFFORT || "max";

type PreparedImage = {
  base64: string;
  mime: string;
  dataUrl: string;
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export const runtime = "nodejs";

const generateSessionId = () => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const resolveSupabaseUserId = async (request: NextRequest): Promise<string | null> => {
  try {
    const userInfoCookie = request.cookies.get("userInfo");
    if (!userInfoCookie?.value) return null;

    const parsed = JSON.parse(userInfoCookie.value);
    const kakaoId = parsed?.kakao_id ?? parsed?.id;
    if (!kakaoId) return null;

    const { data, error: lookupError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("kakao_id", kakaoId)
      .single();

    if (lookupError || !data) {
      if (lookupError) console.error("Supabase user lookup error:", lookupError);
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
  params: { sessionId: string; question: string; answer: string; images: PreparedImage[]; model: string; style: string }
) => {
  const userId = await resolveSupabaseUserId(request);
  if (!userId || (!params.question && params.images.length === 0 && !params.answer)) return;

  try {
    const payload: Array<Record<string, unknown>> = [{
      user_id: userId,
      session_id: params.sessionId,
      message_type: "user",
      message_content: params.question,
      image_url: params.images.length > 0 ? JSON.stringify(params.images.map((item) => item.dataUrl)) : null,
      model_used: params.model,
      style_used: params.style,
    }];

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

const messageTextWithImageNotice = (text: string, imageCount: number) => {
  if (imageCount === 0) return text;
  const notice = `[첨부 이미지 ${imageCount}개가 있었지만 DeepSeek V4 Pro API는 현재 텍스트 입력으로 호출됩니다. 사용자가 이미지의 문제를 직접 텍스트로 옮기도록 짧게 안내하세요.]`;
  return text ? `${text}\n\n${notice}` : notice;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "DEEPSEEK_API_KEY가 설정되어 있지 않습니다." }, { status: 500 });
  }

  const form = await req.formData();
  const text = String(form.get("text") || "");
  const conversation = form.get("conversation") as string | null;
  const modelLabel = String(form.get("model") || FALLBACK_MODEL);
  const style = String(form.get("style") || FALLBACK_STYLE);
  const sessionRaw = form.get("sessionId");
  const sessionId = typeof sessionRaw === "string" && sessionRaw.trim().length > 0 ? sessionRaw.trim() : generateSessionId();

  const imageEntries = form.getAll("images");
  const images = imageEntries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const legacyImage = form.get("image");
  if (images.length === 0 && legacyImage instanceof File && legacyImage.size > 0) images.push(legacyImage);

  const preparedImages: PreparedImage[] = await Promise.all(images.map(async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mime = file.type || "image/png";
    return { base64, mime, dataUrl: `data:${mime};base64,${base64}` };
  }));

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

  const messages: ChatMessage[] = [{ role: "system", content: DEFAULT_TUTOR_PROMPT }];
  conversationHistory.forEach((msg: any) => {
    if (typeof msg?.text !== "string" || msg.text.length === 0) return;
    messages.push({ role: msg.role === "user" ? "user" : "assistant", content: msg.text });
  });
  messages.push({ role: "user", content: messageTextWithImageNotice(text, preparedImages.length) });

  const requestBody = {
    model: DEEPSEEK_MODEL_ID,
    messages,
    thinking: { type: "enabled" },
    reasoning_effort: DEEPSEEK_REASONING_EFFORT,
    stream: false,
  };

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof payload?.error?.message === "string" && payload.error.message.length > 0
        ? payload.error.message
        : "DeepSeek 응답을 가져오지 못했습니다.";
      throw new Error(message);
    }

    const textOut = typeof payload?.choices?.[0]?.message?.content === "string" ? payload.choices[0].message.content : "";

    await persistConversation(req, { sessionId, question: text, answer: textOut, images: preparedImages, model: modelLabel, style });

    return NextResponse.json({ ok: true, text: textOut, raw: payload });
  } catch (error: any) {
    console.error("DeepSeek API error", error);
    const message = typeof error?.message === "string" && error.message.length > 0 ? error.message : "DeepSeek API 요청에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
