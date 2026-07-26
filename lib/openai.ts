import OpenAI from "openai";

export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export function hasOpenAI(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
