import OpenAI from "openai";

import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources";

const OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const makeChatCompletionRequest = async (
  systemPrompt: string,
  userPrompt?: string,
  isJSON: boolean = false
): Promise<Record<string, any> | string> => {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];
  if (userPrompt) {
    messages.push({ role: "user", content: userPrompt });
  }
  const requestBody: ChatCompletionCreateParamsNonStreaming = {
    model: OPENAI_MODEL,
    messages: messages,
    temperature: 0.2,
    max_tokens: 1000,
    response_format: isJSON ? { type: "json_object" } : undefined,
  };

  try {
    const response = await openai.chat.completions.create(requestBody);
    console.log(response.choices[0].message.content);
    return isJSON
      ? JSON.parse(response.choices[0].message.content || "{}")
      : response.choices[0].message.content;
  } catch (error) {
    console.error("Error making chat completion request:", error);
    throw new Error("Failed to fetch chat completion");
  }
};

export const getChatCompletionAsJSON = async (
  systemPrompt: string,
  userPrompt?: string
): Promise<Record<string, any>> => {
  return makeChatCompletionRequest(systemPrompt, userPrompt, true) as Promise<
    Record<string, any>
  >;
};

export const getChatCompletionAsString = async (
  systemPrompt: string,
  userPrompt?: string
): Promise<string> => {
  return makeChatCompletionRequest(
    systemPrompt,
    userPrompt,
    false
  ) as Promise<string>;
};
