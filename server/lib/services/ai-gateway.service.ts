/**
 * AI Gateway Service
 * 
 * Provides a synchronous, provider-neutral abstraction over our AI models
 * for use in real-time HTTP requests (like Omni-Command and Grounded Answers).
 * This satisfies the Provider-Neutral Intelligence invariant.
 */

export type LlmProviderId = "gemini" | "openai" | "none";

interface GatewayResponse {
  text: string;
  provider: LlmProviderId;
  model: string;
}

interface ObjectGatewayResponse<T> {
  object: T;
  provider: LlmProviderId;
  model: string;
}

export class AIGatewayService {
  /**
   * Generates text based on a system and user prompt.
   * Attempts preferred provider first, falls back to the other if available.
   */
  async generateText(
    system: string,
    user: string,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<GatewayResponse | null> {
    const preferred = (process.env.DEFAULT_AI_PROVIDER || "gemini").toLowerCase();

    type ProviderFn = () => Promise<GatewayResponse | null>;
    
    const geminiFirst: [ProviderFn, LlmProviderId][] = [
      [() => this.callGeminiText(system, user, options), "gemini"],
      [() => this.callOpenAIText(system, user, options), "openai"],
    ];
    
    const openaiFirst: [ProviderFn, LlmProviderId][] = [
      [() => this.callOpenAIText(system, user, options), "openai"],
      [() => this.callGeminiText(system, user, options), "gemini"],
    ];
    
    const tryOrder = preferred === "openai" ? openaiFirst : geminiFirst;

    for (const [fn, providerId] of tryOrder) {
      try {
        const out = await fn();
        if (out?.text) {
          return out;
        }
      } catch (e) {
        console.warn(`[ai-gateway] ${providerId} provider error`, e);
      }
    }

    return null;
  }

  /**
   * Generates a structured JSON object.
   */
  async generateObject<T>(
    system: string,
    user: string,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<ObjectGatewayResponse<T> | null> {
    const preferred = (process.env.DEFAULT_AI_PROVIDER || "gemini").toLowerCase();

    type ProviderFn = () => Promise<ObjectGatewayResponse<T> | null>;
    
    const geminiFirst: [ProviderFn, LlmProviderId][] = [
      [() => this.callGeminiObject<T>(system, user, options), "gemini"],
      [() => this.callOpenAIObject<T>(system, user, options), "openai"],
    ];
    
    const openaiFirst: [ProviderFn, LlmProviderId][] = [
      [() => this.callOpenAIObject<T>(system, user, options), "openai"],
      [() => this.callGeminiObject<T>(system, user, options), "gemini"],
    ];
    
    const tryOrder = preferred === "openai" ? openaiFirst : geminiFirst;

    for (const [fn, providerId] of tryOrder) {
      try {
        const out = await fn();
        if (out?.object) {
          return out;
        }
      } catch (e) {
        console.warn(`[ai-gateway] ${providerId} JSON provider error`, e);
      }
    }

    return null;
  }

  private async callGeminiText(
    system: string, 
    user: string, 
    options: { temperature?: number; maxTokens?: number }
  ): Promise<GatewayResponse | null> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}` }] }],
        generationConfig: { 
          temperature: options.temperature ?? 0.25, 
          maxOutputTokens: options.maxTokens ?? 1024 
        },
      }),
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return text ? { text, provider: "gemini", model } : null;
  }

  private async callOpenAIText(
    system: string, 
    user: string,
    options: { temperature?: number; maxTokens?: number }
  ): Promise<GatewayResponse | null> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;
    
    const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
    
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: options.temperature ?? 0.25,
        max_tokens: options.maxTokens ?? 1024,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    
    return text ? { text, provider: "openai", model } : null;
  }

  private async callGeminiObject<T>(
    system: string, 
    user: string,
    options: { temperature?: number; maxTokens?: number }
  ): Promise<ObjectGatewayResponse<T> | null> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    
    // For structured output, Gemini 2.0 Flash is preferred
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}\n\nReturn ONLY valid JSON without markdown formatting.` }] }],
        generationConfig: { 
          temperature: options.temperature ?? 0.15, 
          maxOutputTokens: options.maxTokens ?? 1024,
          responseMimeType: "application/json",
        },
      }),
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (text) {
      try {
        const cleanJson = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        return { object: parsed as T, provider: "gemini", model };
      } catch (err) {
        console.warn("[ai-gateway] Failed to parse JSON from Gemini", err);
      }
    }
    
    return null;
  }

  private async callOpenAIObject<T>(
    system: string, 
    user: string,
    options: { temperature?: number; maxTokens?: number }
  ): Promise<ObjectGatewayResponse<T> | null> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;
    
    const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
    
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: options.temperature ?? 0.15,
        max_tokens: options.maxTokens ?? 1024,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    
    if (text) {
      try {
        const parsed = JSON.parse(text);
        return { object: parsed as T, provider: "openai", model };
      } catch (err) {
        console.warn("[ai-gateway] Failed to parse JSON from OpenAI", err);
      }
    }
    
    return null;
  }
}

export const aiGateway = new AIGatewayService();
