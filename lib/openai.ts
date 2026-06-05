export const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";
export const OPENAI_IMAGE_SIZE = process.env.OPENAI_IMAGE_SIZE || "1024x1024";
export const OPENAI_IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || "medium";

export type OpenAITestResult = {
  ok: boolean;
  status?: number;
  message: string;
  canStore: boolean;
};

type OpenAIErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

export function maskOpenAIKey(key: string) {
  if (!key) return "";
  if (key.length <= 12) return "已儲存";
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}

export async function parseOpenAIError(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) return `OpenAI API 回傳 HTTP ${response.status}。`;

  try {
    const json = JSON.parse(text) as OpenAIErrorBody;
    const message = json.error?.message;
    if (message) return decorateOpenAIStatus(response.status, message);
  } catch {
    // Keep the raw text below.
  }

  return decorateOpenAIStatus(response.status, text);
}

export function decorateOpenAIStatus(status: number, message: string) {
  if (status === 401) {
    return `OpenAI API key 無效或已撤銷：${message}`;
  }

  if (status === 403) {
    return [
      `OpenAI API 拒絕權限 HTTP 403：${message}`,
      "請到 OpenAI Platform 檢查：",
      "1. API key 是否屬於正確 Project。",
      "2. Project/API key 權限是否允許 Models/Images API。",
      "3. 帳戶是否已完成 Organization Verification；GPT Image model 可能需要先驗證組織。",
      "4. 若使用 restricted key，請開啟相關 endpoint 權限，或建立一條 unrestricted/server-side key 再試。"
    ].join("\n");
  }

  if (status === 429) {
    return `OpenAI API rate limit 或額度不足：${message}`;
  }

  return `OpenAI API 測試失敗：HTTP ${status}：${message}`;
}

export async function testOpenAIKey(apiKey: string): Promise<OpenAITestResult> {
  const response = await fetch(`https://api.openai.com/v1/models/${OPENAI_IMAGE_MODEL}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });

  if (response.ok) {
    return {
      ok: true,
      canStore: true,
      status: response.status,
      message: `OpenAI API key 可用，已確認可讀取模型 ${OPENAI_IMAGE_MODEL}。`
    };
  }

  const message = await parseOpenAIError(response);
  return {
    ok: false,
    status: response.status,
    message,
    canStore: response.status === 403
  };
}
