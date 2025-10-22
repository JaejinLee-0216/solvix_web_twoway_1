import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = "gemini-flash-latest";
const MODEL_MAP: Record<string, string> = {
  "SOLVIX 1.0": "gemini-flash-latest",
  "SOLVIX 1.0 LITE": "gemini-flash-latest",
};

const SYSTEM_HINT = `
당신은 대한민국 수능 수학 전문 튜터 서비스의 시각화 엔진입니다.
수험생이 이해하기 쉽도록 수학 풀이 과정을 D3.js 코드로 시각화하세요.

요구 사항:
1. 반드시 JSON만 반환합니다. Markdown, 코드블록, 설명 텍스트 금지.
2. JSON 스키마는 아래와 같습니다:
{
  "type": "dynamic_d3",
  "description": "시각화 설명",
  "width": 600,
  "height": 400,
  "interactive": true,
  "controls": [
    {
      "type": "slider" | "select" | "toggle",
      "label": "라벨",
      "key": "unique_key",
      "min": 숫자,
      "max": 숫자,
      "step": 숫자,
      "initial": 초기값,
      "options": [{"label": "옵션", "value": 값}]
    }
  ],
  "data": {},
  "d3Code": "// renderVisualization(...) 함수 구현"
}
3. 반드시 renderVisualization(svg, data, width, height, interactiveValues, helpers) 함수 또는 module.exports.renderVisualization 를 구현합니다.
4. helpers API: registerCleanup(fn), setError(message), setZoomLevel(value), clamp, toRadians, toDegrees, formatNumber.
5. SVG 크기(width, height)는 400~900 범위에서 문제에 맞게 조절할 수 있습니다.
6. 수험생이 직관적으로 조작할 수 있도록 필요한 경우 슬라이더, 토글, 셀렉트 등 인터랙티브 컨트롤을 추가하십시오.
7. 좌표는 D3 기본 좌표계(왼쪽-위가 (0,0)) 기준입니다.
8. 코드 내에서 외부 라이브러리 사용 금지. d3-selection, d3-scale 등 d3.* 네임스페이스만 사용 가능합니다.
9. 데이터가 부족하거나 시각화가 필요 없을 경우 "type": "none"으로 반환하고 이유를 "description"에 적으십시오.
10. 기호는 ASCII로 표기하십시오 (π 대신 pi 등).
11. JSON을 출력할 때 모든 백슬래시는 반드시 두 번(\\\\)으로 이스케이프하십시오.
12. 모든 수학 기호는 ASCII 문자열만 사용하십시오. (theta, pi, sqrt(x), Math.pow, ->, +/- 등)
13. 코드 작성 시 CRITICAL 규칙:
    - 절대로 같은 변수명을 두 번 선언하지 마십시오 (const, let, var 모두 해당)
    - 모든 변수명은 고유해야 합니다
    - 변수를 재사용하려면 let으로 선언 후 재할당하십시오
    - 함수 내부 scope 변수명도 외부와 중복되지 않게 하십시오
14. 스마트 따옴표("")나 특수 대시(—)를 사용하지 말고 일반 ASCII 문자만 사용하십시오.
`;

export async function POST(request: NextRequest) {
  let rawResponseText = "";
  try {
    const { text, model } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_2_5_FLASH_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_2_5_FLASH_API_KEY not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenAI({ apiKey });
    const requestedModel = typeof model === "string" ? model.trim() : "";
    const resolvedModel = MODEL_MAP[requestedModel] ?? DEFAULT_MODEL;

    const prompt = `${SYSTEM_HINT}

사용자 입력(풀이/설명):
"""
${text}
"""`;

    const result = await genAI.models.generateContent({
      model: resolvedModel,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const rawText = extractTextFromCandidates(result.candidates);
    rawResponseText = rawText;
    const visualization = rawText ? parseVisualizationText(rawText) : null;

    const validated = validateVisualizationPayload(visualization);
    if (!validated.valid) {
      return NextResponse.json(
        {
          error: "Invalid visualization payload",
          issues: validated.issues,
          rawResponse: rawText,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      visualization: visualization?.type === "none" ? null : visualization,
      rawResponse: rawText,
      success: visualization?.type !== "none",
    });
  } catch (error: any) {
    console.error("Visualization API error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate visualization",
        details: error.message ?? "Unknown error",
        rawResponse: rawResponseText,
      },
      { status: 500 }
    );
  }
}

function extractTextFromCandidates(candidates?: any[]): string {
  if (!Array.isArray(candidates)) return "";

  for (const candidate of candidates) {
    const parts: any[] = candidate?.content?.parts ?? [];
    for (const part of parts) {
      if (typeof part?.text === "string" && part.text.trim().length > 0) {
        return part.text.trim();
      }
    }
  }

  return "";
}

function parseVisualizationText(rawText: string): any {
  const attempts: string[] = [];
  const seen = new Set<string>();

  const trimmed = rawText.trim();
  if (trimmed.length > 0) {
    attempts.push(trimmed);
    const unwrapped = unwrapQuotedJson(trimmed);
    if (unwrapped && !seen.has(unwrapped)) attempts.push(unwrapped);
    const extracted = extractJsonObject(trimmed);
    if (extracted && !seen.has(extracted)) attempts.push(extracted);
    const decoded = decodeEscapedJson(trimmed);
    if (decoded && !seen.has(decoded)) attempts.push(decoded);
  }

  const codeMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeMatch) {
    const block = codeMatch[1].trim();
    if (block.length > 0 && !seen.has(block)) {
      attempts.push(block);
      const unwrappedBlock = unwrapQuotedJson(block);
      if (unwrappedBlock && !seen.has(unwrappedBlock)) attempts.push(unwrappedBlock);
      const extractedBlock = extractJsonObject(block);
      if (extractedBlock && !seen.has(extractedBlock)) attempts.push(extractedBlock);
      const decodedBlock = decodeEscapedJson(block);
      if (decodedBlock && !seen.has(decodedBlock)) attempts.push(decodedBlock);
    }
  }

  for (const candidate of attempts) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);

    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      const sanitized = sanitizeJson(candidate);
      if (!sanitized) continue;
      try {
        return JSON.parse(sanitized);
      } catch {
        const extracted = extractJsonObject(sanitized);
        if (extracted) {
          try {
            return JSON.parse(extracted);
          } catch {
            const nested = decodeEscapedJson(extracted);
            if (nested) {
              try {
                return JSON.parse(nested);
              } catch {
                const evaluated = tryEvalObject(nested);
                if (evaluated) return evaluated;
              }
            }
            const evaluated = tryEvalObject(extracted);
            if (evaluated) return evaluated;
          }
        }
      }
      const evaluated = tryEvalObject(sanitized);
      if (evaluated) return evaluated;
    }
  }

  throw new Error("LLM 응답이 JSON 형식이 아닙니다.");
}

function sanitizeJson(text: string): string | null {
  if (!text) return null;

  // Replace invalid escape sequences with escaped backslash
  const sanitized = text.replace(/\\(?!["\\\/bfnrtu0-9])/g, "\\\\");

  return sanitized.trim();
}

function decodeEscapedJson(text: string): string | null {
  if (!text) return null;

  try {
    const decoded = text
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t');

    const extracted = extractJsonObject(decoded);
    if (extracted) {
      return extracted;
    }
  } catch {
    return null;
  }

  return null;
}

function extractJsonObject(text: string): string | null {
  if (!text) return null;

  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === "\\") {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function unwrapQuotedJson(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length < 2) return null;

  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];

  if (first !== last || (first !== '"' && first !== "'")) {
    return null;
  }

  if (first === '"') {
    try {
      const unwrapped = JSON.parse(trimmed);
      if (typeof unwrapped === "string") {
        return unwrapped.trim();
      }
    } catch {
      // ignore
    }
    const inner = trimmed.slice(1, -1);
    return inner.replace(/\\"/g, '"').replace(/\\n/g, "\n");
  }

  if (first === "'") {
    const inner = trimmed.slice(1, -1);
    const escapedInner = inner.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const asDouble = `"${escapedInner}"`;
    try {
      const unwrappedSingle = JSON.parse(asDouble);
      if (typeof unwrappedSingle === "string") {
        return unwrappedSingle.trim();
      }
    } catch {
      return inner.trim();
    }
  }

  return null;
}

function tryEvalObject(text: string): any | null {
  const candidate = text.trim();
  if (!candidate.startsWith("{") || !candidate.endsWith("}")) {
    return null;
  }

  try {
    const fn = new Function(`"use strict"; return (${candidate});`);
    const result = fn();
    if (result && typeof result === "object") {
      return result;
    }
  } catch {
    return null;
  }

  return null;
}

function validateVisualizationPayload(payload: any): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (payload === null) {
    issues.push("No visualization content returned by the model");
    return { valid: false, issues };
  }

  if (typeof payload !== "object") {
    issues.push("Payload must be an object");
    return { valid: false, issues };
  }

  const { type } = payload;
  if (!type || typeof type !== "string") {
    issues.push("type is required");
  }

  if (type === "none") {
    if (!payload.description) {
      issues.push("description is required when type is 'none'");
    }
    return { valid: issues.length === 0, issues };
  }

  if (type !== "dynamic_d3") {
    issues.push("Only 'dynamic_d3' type is supported");
  }

  if (!payload.d3Code || (typeof payload.d3Code !== "string" && !Array.isArray(payload.d3Code))) {
    issues.push("d3Code must be a string or array of strings");
  }

  if (payload.controls && !Array.isArray(payload.controls)) {
    issues.push("controls must be an array when provided");
  }

  if (Array.isArray(payload.controls)) {
    payload.controls.forEach((control: any, index: number) => {
      if (!control?.type || typeof control.type !== "string") {
        issues.push(`controls[${index}].type is required`);
      }
      if (!control?.label || typeof control.label !== "string") {
        issues.push(`controls[${index}].label is required`);
      }
    });
  }

  return { valid: issues.length === 0, issues };
}

