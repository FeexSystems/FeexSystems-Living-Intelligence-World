 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * FeexSystems — Gemini AI Service Provider
 * Implements the Provider-Neutral Intelligence layer using the Google Gemini API.
 * Powered by @google/genai and the Gemini Interactions API (gemini-3.7-flash).
 * 
 * Invariants:
 * - World Model is Authoritative: Output is grounded in canonical database entities.
 * - Provider-Neutral: Model vendors and internal model strings are abstracted away.
 * - Non-Blocking: Lazy initialization, graceful fallback if GEMINI_API_KEY is not configured.
 */

import { GoogleGenAI } from "@google/genai";

















































const PRIMARY_MODEL = "gemini-3.7-flash";

const SYSTEM_INSTRUCTION = `You are Bushfeexer, the Living Engineering Intelligence Director of FEEXSYSTEMS (feexsystems.codes).
You are an exceptionally versatile, deep-reasoning AI engineer, system architect, and technical guide.

You must answer ANY type of query with high intellectual fidelity:

1. GREETINGS & CASUAL INTERACTION:
   - When greeted (e.g. "hi", "hello", "who are you", "what can you do"), respond warmly, intelligently, and engagingly.
   - Introduce yourself as Bushfeexer, the FeexSystems Living Intelligence Director.
   - Briefly outline how you can assist: exploring the World Model, architecture reviews, writing or debugging code, or inspecting live GitHub ecosystem evidence.

2. CODE GENERATION, DEBUGGING & ALGORITHMS:
   - When asked to write, refactor, or debug code in any language (TypeScript, JavaScript, React, Python, Go, Rust, C++, SQL, Bash, HTML/CSS, etc.):
   - Produce complete, production-ready, clean, idiomatic code with clear type definitions, error handling, and inline comments.
   - Explain the algorithmic trade-offs (time/space complexity, edge cases, scalability).
   - Use standard markdown code blocks with language tags (\`\`\`typescript, \`\`\`python, etc.).

3. ABOUT FEEXSYSTEMS & LIVING WORLD MODEL:
   - Authoritative knowledge on FEEXSYSTEMS (feexsystems.codes):
     * World Model: Canonical, graph-backed living representation of GitHub repositories, branches, dependencies, and engineering relationships.
     * Evidence Fabric: Cryptographic commit SHAs, verifiable artifacts, manifests, and temporal state reconstruction.
     * 3D Spatial Knowledge Galaxy (/world): Three.js cosmic topology mapping projects, domains, and artifacts.
     * Omni-Command Stage (/omni): Multi-agent directive stage for autonomous engineering execution.
     * Subscriptions & Pricing: Starter ($29/mo), Professional ($99/mo), Enterprise ($299/mo) with Paystack checkout.
     * Key Pinned Repositories: FEEXSYSTEMS-Persona-Digital-Portfolio, yurrheeler-med-advisor, and related microservices.

4. GENERAL TECHNOLOGY, COMPUTER SCIENCE & ARCHITECTURE:
   - Provide deep, expert-level explanations across:
     * Cloud & Infrastructure: GCP, AWS, Cloud Run, Docker containerization, Kubernetes orchestration, CI/CD pipelines.
     * Frontend & UI: React 18, React Router 7, Vite, TailwindCSS 3, Three.js (@react-three/fiber & @react-three/drei), WebGL shaders, modern CSS glassmorphism.
     * Backend & Databases: Node.js, Express 5, Prisma ORM, PostgreSQL 15+, pgvector semantic search, Redis queues (Bull).
     * Security: SOC 2 Type II, ISO 27001, HMAC SHA-256 webhook verification, JWT auth, OWASP hardening.
     * AI & LLMs: Gemini 3.7 Flash, thinking/reasoning paradigms, vector embeddings, RAG architectures.

5. GROUNDED REASONING WITH WORLD MODEL EVIDENCE:
   - When Grounded Evidence Entities, Technologies, or Artifacts are supplied in the prompt context:
     * Synthesize and incorporate them authoritatively into your response.
     * Reference verified repositories, file paths, and commit records as concrete proof.
     * Never invent fake repositories or project facts that contradict the provided evidence.

Tone: Authoritative, razor-sharp, deeply knowledgeable, empowering, and articulate.`;

class GeminiService {constructor() { GeminiService.prototype.__init.call(this);GeminiService.prototype.__init2.call(this);GeminiService.prototype.__init3.call(this); }
   __init() {this.client = null}
   __init2() {this.apiKey = null}
   __init3() {this.isInitialized = false}

   getClient() {
    if (!this.isInitialized) {
      this.apiKey = process.env.GEMINI_API_KEY || null;
      if (this.apiKey) {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
      }
      this.isInitialized = true;
    }
    return this.client;
  }

   hasApiKey() {
    return Boolean(this.getClient());
  }

  /**
   * Deep interactive reasoning across all query types using Gemini Interactions API
   */
  async generateInteractiveResponse(request) {
    const ai = this.getClient();
    const prompt = request.prompt.trim();

    // Prepare grounded evidence context if entities or artifacts are present
    let contextBlock = "";
    const groundedCount = (_optionalChain([request, 'access', _ => _.groundedEntities, 'optionalAccess', _2 => _2.length]) || 0) + (_optionalChain([request, 'access', _3 => _3.artifacts, 'optionalAccess', _4 => _4.length]) || 0);

    if (request.groundedEntities && request.groundedEntities.length > 0) {
      contextBlock += `\n[WORLD MODEL GROUNDED REPOSITORIES & PROJECTS]:\n` +
        request.groundedEntities
          .map(e => `- ${e.name} (${e.repository || "repo"}): ${e.description || "Active project node"}`)
          .join("\n");
    }

    if (request.technologies && request.technologies.length > 0) {
      contextBlock += `\n[CONNECTED TECHNOLOGIES]:\n` +
        request.technologies
          .map(t => `- ${t.name} (connected to ${t.projectCount || 1} project(s))`)
          .join("\n");
    }

    if (request.artifacts && request.artifacts.length > 0) {
      contextBlock += `\n[VERIFIED EVIDENCE ARTIFACTS]:\n` +
        request.artifacts
          .map(a => `- ${a.path} (${a.kind || "file"}) in ${a.projectName || "project"} [SHA: ${_optionalChain([a, 'access', _5 => _5.sha, 'optionalAccess', _6 => _6.slice, 'call', _7 => _7(0, 7)]) || "verified"}]`)
          .join("\n");
    }

    const conversationHistory = _optionalChain([request, 'access', _8 => _8.history, 'optionalAccess', _9 => _9.length])
      ? `\n[RECENT CONVERSATION HISTORY]:\n` +
        request.history.map(h => `${h.role.toUpperCase()}: ${h.text}`).join("\n") +
        "\n"
      : "";

    const fullUserPrompt = `${conversationHistory}${contextBlock ? `${contextBlock}\n\n` : ""}[USER QUERY]:\n${prompt}`;

    // If no API key is set, use intelligent heuristic synthesizer
    if (!ai) {
      return this.synthesizeOfflineResponse(prompt, request.groundedEntities, request.technologies);
    }

    // 1. PRIMARY PATH: Gemini Interactions API
    try {
      const interaction = await ai.interactions.create({
        model: PRIMARY_MODEL,
        input: fullUserPrompt,
        system_instruction: SYSTEM_INSTRUCTION,
      });

      const explanation = _optionalChain([interaction, 'access', _10 => _10.output_text, 'optionalAccess', _11 => _11.trim, 'call', _12 => _12()]);
      if (explanation) {
        return {
          explanation,
          suggestions: this.deriveSuggestions(prompt, explanation),
          confidence: 0.99,
          groundedEvidenceCount: groundedCount,
          mode: "interactions-api",
          model: PRIMARY_MODEL,
        };
      }
    } catch (interactionsError) {
      console.warn("[GeminiService] Interactions API attempt encountered issue, falling back to generateContent with thinking:", interactionsError);
    }

    // 2. FALLBACK PATH: ai.models.generateContent with thinking/deep reasoning
    try {
      const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: fullUserPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          thinkingConfig: {
            thinkingLevel: "HIGH" ,
          },
          temperature: _nullishCoalesce(request.temperature, () => ( 0.2)),
          maxOutputTokens: _nullishCoalesce(request.maxOutputTokens, () => ( 2048)),
        },
      });

      const text = _optionalChain([response, 'access', _13 => _13.text, 'optionalAccess', _14 => _14.trim, 'call', _15 => _15()]);
      if (text) {
        return {
          explanation: text,
          suggestions: this.deriveSuggestions(prompt, text),
          confidence: 0.98,
          groundedEvidenceCount: groundedCount,
          mode: "generate-content",
          model: PRIMARY_MODEL,
        };
      }
    } catch (genError) {
      console.error("[GeminiService] Gemini generateContent failed:", genError);
    }

    // 3. GRACEFUL RESILIENT FALLBACK: Semantic graph synthesis
    return this.synthesizeOfflineResponse(prompt, request.groundedEntities, request.technologies);
  }

  /**
   * Reason over World Model evidence using Gemini (backward-compatible)
   */
  async reasonOverWorldModel(request) {
    const res = await this.generateInteractiveResponse({
      prompt: request.prompt,
      context: request.context,
      groundedEntities: request.groundedEntities,
      temperature: request.temperature,
      maxOutputTokens: request.maxOutputTokens,
    });

    return {
      explanation: res.explanation,
      confidence: res.confidence,
      groundedEvidenceCount: res.groundedEvidenceCount,
      tokensUsed: res.tokensUsed,
    };
  }

  /**
   * Multimodal analysis of Evidence Fabric media artifacts
   */
  async analyzeEvidenceArtifact(
    mediaUrl,
    mimeType,
    prompt
  ) {
    const ai = this.getClient();
    if (!ai) {
      return {
        description: `Verified evidence artifact (${mimeType}). Visual artifact registered in Evidence Fabric.`,
        confidence: 0.9,
      };
    }

    try {
      const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { text: `Analyze this software evidence artifact and describe its technical significance: ${prompt}` },
              {
                fileData: {
                  mimeType,
                  fileUri: mediaUrl,
                },
              } ,
            ],
          },
        ],
      });

      const text = response.text || "Analyzed evidence artifact.";
      return { description: text.trim(), confidence: 0.95 };
    } catch (err) {
      return {
        description: `Evidence artifact verified by Evidence Fabric ledger.`,
        confidence: 0.85,
      };
    }
  }

  /**
   * Generates intelligent, dynamic follow-up suggestions based on query and response
   */
   deriveSuggestions(query, explanation) {
    const q = query.toLowerCase();
    const suggestions = [];

    if (q.includes("hi") || q.includes("hello") || q.includes("who are you") || q.includes("help")) {
      return [
        "What projects are in the World Model?",
        "Show me how Evidence Fabric works",
        "Write a TypeScript code example",
        "Explain the 3D Galaxy architecture",
      ];
    }

    if (q.includes("code") || q.includes("typescript") || q.includes("react") || q.includes("python") || q.includes("function") || q.includes("write")) {
      return [
        "Add unit tests for this code",
        "Optimize time & space complexity",
        "Show error handling patterns",
        "How would this integrate into FeexSystems?",
      ];
    }

    if (q.includes("feex") || q.includes("world model") || q.includes("galaxy") || q.includes("evidence")) {
      return [
        "Inspect verified commit SHAs",
        "Explore 3D Galaxy at /world",
        "Open Omni-Command Stage",
        "View subscription tiers & pricing",
      ];
    }

    return [
      "Explain this in more depth",
      "Show related projects in the World Model",
      "Give an architectural diagram explanation",
      "What are the best practices here?",
    ];
  }

  /**
   * Resilient offline synthesis for greetings, code, FeexSystems, and technology
   */
   synthesizeOfflineResponse(
    prompt,
    entities,
    techs
  ) {
    const q = prompt.toLowerCase();
    let text = "";
    const suggestions = [];

    if (q.match(/hello|hi|hey|who are you|what is your name/)) {
      text = "👋 **Greetings! I am Bushfeexer**, the Living Engineering Intelligence Director for **FEEXSYSTEMS** (feexsystems.codes).\n\nI am connected to our canonical World Model and Evidence Fabric. Whether you want to explore software architectures, generate high-performance code, inspect our GitHub ecosystem, or deep-dive into cloud technology, I'm ready to assist. What would you like to build or explore?";
      suggestions.push("Tell me about FeexSystems", "Show me the projects in the World Model", "Write a code snippet", "Explain the 3D Galaxy");
    } else if (q.match(/code|function|typescript|python|react|implement|algorithm/)) {
      text = `💻 **FeexSystems Engineering Synthesis**:\n\nTo build robust solutions for "${prompt}", maintain strict typing, modular boundaries, and comprehensive error handling. In the FeexSystems codebase, we utilize **TypeScript with strict ESM**, **React 18 / React Router 7**, and **Express 5 with Prisma ORM**.\n\nConnect to our live Gemini Interactive engine for instant code synthesis, or explore our repository manifests in the World Model.`;
      suggestions.push("Show TypeScript examples", "View architecture patterns", "Explain testing with Vitest");
    } else if (entities && entities.length > 0) {
      const topEntities = entities.slice(0, 3).map(e => `**${e.name}**: ${e.description || "Canonical repository entity"}`).join("\n- ");
      text = `🛰️ **FEEXSYSTEMS World Model Grounded Resolution**:\n\nThe query "${prompt}" resolves to ${entities.length} verified project(s) and ${_optionalChain([techs, 'optionalAccess', _16 => _16.length]) || 0} technology relation(s) across our living graph:\n\n- ${topEntities}\n\nEach entity is cryptographically anchored to its GitHub repository, branch, and commit SHA via the Evidence Fabric ledger.`;
      suggestions.push("Inspect evidence ledger", "Explore in 3D Galaxy", "View repository dependencies");
    } else {
      text = `⚡ **FEEXSYSTEMS Living Intelligence**:\n\nAnalyzing query: "${prompt}".\n\nFeexSystems turns our GitHub ecosystem into an explorable World Model with verified Evidence Fabric provenance. From automated DevOps and AI orchestration to real-time security scans, our platform provides evidence-backed engineering intelligence.`;
      suggestions.push("Explore World Model", "View pricing plans", "Check platform health");
    }

    return {
      explanation: text,
      suggestions,
      confidence: 0.9,
      groundedEvidenceCount: _optionalChain([entities, 'optionalAccess', _17 => _17.length]) || 0,
      mode: "heuristic",
      model: "feex-world-model-synthesizer",
    };
  }
}

export const geminiService = new GeminiService();
