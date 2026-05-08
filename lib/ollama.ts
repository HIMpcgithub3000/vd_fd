import { createOpenAI } from '@ai-sdk/openai';

/**
 * Ollama exposes an OpenAI-compatible /v1 endpoint, so we reuse the OpenAI
 * provider from the AI SDK and point it at the local Ollama server. No API
 * key is needed for local Ollama; the SDK still requires one to be set, so
 * we pass a placeholder.
 */

const baseURL = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');

export const ollama = createOpenAI({
  baseURL: `${baseURL}/v1`,
  apiKey: 'ollama-local',
  compatibility: 'compatible',
});

export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen2.5:7b';
