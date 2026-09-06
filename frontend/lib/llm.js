// Suvio LLM adapter.
//
// Google Gemini via its OpenAI-compatible endpoint. Gemini's free tier
// (aistudio.google.com) is very generous and covers chat + vision for
// Suvio's needs. If GOOGLE_AI_API_KEY is missing, falls back to the
// Emergent OpenAI proxy using EMERGENT_LLM_KEY.
//
// We keep the OpenAI SDK so all existing `chat.completions.create` call
// sites keep working unchanged — only baseURL / apiKey / model differ.
import OpenAI from 'openai';

const GEMINI_KEY = process.env.GOOGLE_AI_API_KEY;
const EMERGENT_KEY = process.env.EMERGENT_LLM_KEY;

const useGemini = !!GEMINI_KEY;

const client = useGemini
  ? new OpenAI({
      apiKey: GEMINI_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    })
  : new OpenAI({
      apiKey: EMERGENT_KEY,
      baseURL: 'https://integrations.emergentagent.com/llm/openai/v1',
    });

// Map "friendly" model names used across the codebase to the actual model
// id understood by the current provider. Anywhere the app asks for
// `gpt-4o-mini`, `gpt-4o-mini-2024-07-18`, or `gpt-4o` we transparently
// route to a Gemini model when Gemini is active.
const GEMINI_MAP = {
  'gpt-4o-mini': 'gemini-2.0-flash',
  'gpt-4o-mini-2024-07-18': 'gemini-2.0-flash',
  'gpt-4o': 'gemini-2.0-flash',
  'gpt-4-vision': 'gemini-2.0-flash',
  'gpt-5': 'gemini-2.0-flash',
};
function resolveModel(m) {
  if (!m) return useGemini ? 'gemini-2.0-flash' : 'gpt-4o-mini';
  if (useGemini) return GEMINI_MAP[m] || m;
  return m;
}

// Proxy so the app's existing `client.chat.completions.create({...})`
// calls work unchanged.
const proxy = {
  chat: {
    completions: {
      create(payload) {
        return client.chat.completions.create({ ...payload, model: resolveModel(payload.model) });
      },
    },
  },
};

export async function chatCompletion(messages, opts = {}) {
  const model = resolveModel(opts.model);
  const payload = { model, messages };
  payload.temperature = opts.temperature ?? 0.7;
  if (opts.max_tokens) payload.max_tokens = opts.max_tokens;
  const resp = await client.chat.completions.create(payload);
  return resp.choices[0].message.content;
}

export const activeProvider = useGemini ? 'gemini' : 'emergent';
export default proxy;
