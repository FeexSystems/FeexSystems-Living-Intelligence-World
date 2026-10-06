 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * AI Gateway Service
 * 
 * Provides a synchronous, provider-neutral abstraction over our AI models
 * for use in real-time HTTP requests (like Omni-Command and Grounded Answers).
 * This satisfies the Provider-Neutral Intelligence invariant.
 */

 













export class AIGatewayService {
  /**
   * Generates text based on a system and user prompt.
   * Attempts preferred provider first, falls back to the other if available.
   */
  async generateText(
    system,
    user,
    options = {}
  ) {
    const preferred = (process.env.DEFAULT_AI_PROVIDER || "gemini").toLowerCase();

    
    
    const geminiFirst = [
      [() => this.callGeminiText(system, user, options), "gemini"],
      [() => this.callOpenAIText(system, user, options), "openai"],
    ];
    
    const openaiFirst = [
      [() => this.callOpenAIText(system, user, options), "openai"],
      [() => this.callGeminiText(system, user, options), "gemini"],
    ];
    
    const tryOrder = preferred === "openai" ? openaiFirst : geminiFirst;

    for (const [fn, providerId] of tryOrder) {
      try {
        const out = await fn();
        if (_optionalChain([out, 'optionalAccess', _ => _.text])) {
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
  async generateObject(
    system,
    user,
    options = {}
  ) {
    const preferred = (process.env.DEFAULT_AI_PROVIDER || "gemini").toLowerCase();

    
    
    const geminiFirst = [
      [() => this.callGeminiObject(system, user, options), "gemini"],
      [() => this.callOpenAIObject(system, user, options), "openai"],
    ];
    
    const openaiFirst = [
      [() => this.callOpenAIObject(system, user, options), "openai"],
      [() => this.callGeminiObject(system, user, options), "gemini"],
    ];
    
    const tryOrder = preferred === "openai" ? openaiFirst : geminiFirst;

    for (const [fn, providerId] of tryOrder) {
      try {
        const out = await fn();
        if (_optionalChain([out, 'optionalAccess', _2 => _2.object])) {
          return out;
        }
      } catch (e) {
        console.warn(`[ai-gateway] ${providerId} JSON provider error`, e);
      }
    }

    return null;
  }

   async callGeminiText(
    system, 
    user, 
    options
  ) {
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
          temperature: _nullishCoalesce(options.temperature, () => ( 0.25)), 
          maxOutputTokens: _nullishCoalesce(options.maxTokens, () => ( 1024)) 
        },
      }),
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    const text = _optionalChain([data, 'optionalAccess', _3 => _3.candidates, 'optionalAccess', _4 => _4[0], 'optionalAccess', _5 => _5.content, 'optionalAccess', _6 => _6.parts, 'optionalAccess', _7 => _7[0], 'optionalAccess', _8 => _8.text]);
    
    return text ? { text, provider: "gemini", model } : null;
  }

   async callOpenAIText(
    system, 
    user,
    options
  ) {
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
        temperature: _nullishCoalesce(options.temperature, () => ( 0.25)),
        max_tokens: _nullishCoalesce(options.maxTokens, () => ( 1024)),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    const text = _optionalChain([data, 'optionalAccess', _9 => _9.choices, 'optionalAccess', _10 => _10[0], 'optionalAccess', _11 => _11.message, 'optionalAccess', _12 => _12.content]);
    
    return text ? { text, provider: "openai", model } : null;
  }

   async callGeminiObject(
    system, 
    user,
    options
  ) {
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
          temperature: _nullishCoalesce(options.temperature, () => ( 0.15)), 
          maxOutputTokens: _nullishCoalesce(options.maxTokens, () => ( 1024)),
          responseMimeType: "application/json",
        },
      }),
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    const text = _optionalChain([data, 'optionalAccess', _13 => _13.candidates, 'optionalAccess', _14 => _14[0], 'optionalAccess', _15 => _15.content, 'optionalAccess', _16 => _16.parts, 'optionalAccess', _17 => _17[0], 'optionalAccess', _18 => _18.text]);
    
    if (text) {
      try {
        const cleanJson = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        return { object: parsed , provider: "gemini", model };
      } catch (err) {
        console.warn("[ai-gateway] Failed to parse JSON from Gemini", err);
      }
    }
    
    return null;
  }

   async callOpenAIObject(
    system, 
    user,
    options
  ) {
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
        temperature: _nullishCoalesce(options.temperature, () => ( 0.15)),
        max_tokens: _nullishCoalesce(options.maxTokens, () => ( 1024)),
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    const text = _optionalChain([data, 'optionalAccess', _19 => _19.choices, 'optionalAccess', _20 => _20[0], 'optionalAccess', _21 => _21.message, 'optionalAccess', _22 => _22.content]);
    
    if (text) {
      try {
        const parsed = JSON.parse(text);
        return { object: parsed , provider: "openai", model };
      } catch (err) {
        console.warn("[ai-gateway] Failed to parse JSON from OpenAI", err);
      }
    }
    
    return null;
  }
}

export const aiGateway = new AIGatewayService();
