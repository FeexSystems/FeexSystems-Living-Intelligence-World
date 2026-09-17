import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Terminal,
  Globe,
  Cpu,
  Shield,
  Code2,
  Database,
  GitBranch,
  ArrowRight,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Lock,
  Check,
  Copy,
  Server,
  Network,
  Workflow,
  AlertTriangle,
  HelpCircle,
  Zap,
  Layers,
  FileCode,
  CheckCircle,
  ChevronDown,
  DollarSign,
  Activity,
  ShieldCheck,
  Search,
  Eye,
  RefreshCw,
  FolderGit2,
  ShieldAlert
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

// ---------------------------------------------------------------------------
// ALL 23 NATIVE FRAMER-INSPIRED INTERACTION & SHADER MODULES
// ---------------------------------------------------------------------------
import {
  FullWidthNav,
  CursorDotTrail,
  MagneticGlowButton,
  AppleDock,
  SkeletonLoader,
  InteractionLinesBackground,
  AnimatedBackground,
  PolygonNet,
  StrokeAnimation,
  TsunamiWave,
  ScrollSyncedText,
  ScrollZoomReveal,
  SushCinematicCarousel,
  PillCarousel,
} from "@/components/framer";
import { GitHubGuardLink } from "@/components/GitHubAuthGuard";
import {
  SequentialCarousel,
  CinematicVideo,
  TheaterVideoPlayer,
  YoutubeEmbedCard,
  ParticleGlobe3D,
  GlobeMorph,
  AsciiArtEffect,
  TransitionVisualizer,
  BtcMonoBadge,
  WarpStarfield,
  FullscreenScrollSlider,
  HeroTunnel,
  AmbientLivingBackground,
  VideoOverlayBackground,
} from "@/components/framer";
import { CursorSpotlightCard } from "@/components/motion/CursorSpotlightCard";
import { TextScrambleMorph } from "@/components/motion/TextScrambleMorph";

// ---------------------------------------------------------------------------
// CORE DASHBOARD CAPABILITIES (3D CAROUSEL SHOWCASE)
// ---------------------------------------------------------------------------
const DASHBOARD_CAROUSEL_ITEMS = [
  {
    id: "01",
    title: "AI Services & Orchestration",
    category: "Neural Adapters / Model Routing",
    link: "/dashboard/ai-services",
    image: "/media/feex/ai-neural-core.webp",
    description: "Provider-neutral model routing. Orchestrate OpenAI, Anthropic, and Gemini models with custom fallback adapters.",
    tags: ["Provider-Neutral", "Model Adapters", "Fallback Routing", "Inference Scaling", "Token Telemetry"],
    metric: "MULTI-MODEL ROUTING",
  },
  {
    id: "02",
    title: "Evidence Fabric Ledger",
    category: "Cryptographic Provenance",
    link: "/evidence",
    image: "/media/feex/kappaxchangefin-ledger.webp",
    description: "Immutable ledger tracking structural facts. Inspect cryptographic commit SHAs, file paths, and observation timestamps.",
    tags: ["Cryptographic Proof", "SHA-256 Hashes", "Audit Trail", "World Model Truth", "Fact Resolution"],
    metric: "100% VERIFIED PROVENANCE",
  },
  {
    id: "03",
    title: "Omni Command Stage",
    category: "Agentic Execution / Telemetry",
    link: "/omni",
    image: "/media/feex/sonik-audio-dsp.webp",
    description: "Multi-agent task orchestration environment. Stream live reasoning traces and inspect tool-calling payloads in real-time.",
    tags: ["Multi-Agent Execution", "Live Streaming", "Tool-Calling", "Execution Telemetry", "Task Queues"],
    metric: "SUB-50MS SSE STREAM",
  },
  {
    id: "04",
    title: "Spatial Knowledge Galaxy",
    category: "3D Topology / Data Visualization",
    link: "/world",
    image: "/media/feex/holokai-guardians-armor.webp",
    description: "Immersive WebGL data visualization. Explore nodes, edges, relationships, and artifact domains in a fully spatial UI.",
    tags: ["3D Data Vis", "WebGL", "Node Inspection", "Relationship Graphs", "Progressive Disclosure"],
    metric: "60 FPS SPATIAL TOPOLOGY",
  },
  {
    id: "05",
    title: "DevOps & Security Scans",
    category: "Infrastructure / Pipelines",
    link: "/dashboard/devops",
    image: "/media/feex/rental-paradise-architecture.webp",
    description: "Continuous synchronization health checks. Monitor GitHub webhooks, pipeline deployments, and automated security scans.",
    tags: ["HMAC Validation", "Webhook Ingestion", "CI/CD Monitor", "Security Audits", "Health Checks"],
    metric: "AUTOMATED CI/CD & AUDIT",
  },
  {
    id: "06",
    title: "Intelligent Navigator",
    category: "Semantic Search / Retrieval",
    link: "/navigator",
    image: "/media/feex/yurrhealer-lab.webp",
    description: "Grounded retrieval engine with AI-generated explanations. Combines pgvector semantic search with deterministic graph traversal.",
    tags: ["Semantic Search", "pgvector", "Graph Traversal", "RAG Pipeline", "Explainable AI"],
    metric: "ZERO-HALLUCINATION RAG",
  },
];

// ---------------------------------------------------------------------------
// CANONICAL FEEXSYSTEMS DATASETS (THE 6 PINNED SYSTEM WORLDS)
// ---------------------------------------------------------------------------

const SYSTEM_WORLDS = [
  {
    id: "01",
    name: "3WM SONIK LABS",
    domain: "Audio / Creative Technology",
    repo: "FeexSystems/3WM-SONIK-LABS",
    repoUrl: "https://github.com/FeexSystems/3WM-SONIK-LABS",
    image: "/media/feex/sonik-audio-dsp.webp",
    description:
      "AI-native audio and DSP exploration connecting intelligent systems with music-production workflows.",
    capabilities: ["AI / ML", "DSP", "Audio Processing", "Interactive UI", "Creative Technology"],
    status: "ACTIVE WORLD",
  },
  {
    id: "02",
    name: "HoloKai",
    domain: "Culture / World Models / 3D",
    repo: "FeexSystems/HoloKai-Systems-Labs",
    repoUrl: "https://github.com/FeexSystems/HoloKai-Systems-Labs",
    image: "/media/feex/holokai-guardians-armor.webp",
    tagline: "Where Civilisations Remember.",
    description:
      "Exploration of cultural intelligence, knowledge representation, artifact intelligence and immersive world-model experiences.",
    capabilities: ["World Models", "Knowledge Graphs", "AI", "3D", "Artifact Intelligence"],
    status: "ACTIVE WORLD",
  },
  {
    id: "03",
    name: "Yurrheeler AI",
    domain: "Healthcare Intelligence",
    repo: "FeexSystems/yurrhealer-med-advisor",
    repoUrl: "https://github.com/FeexSystems/yurrhealer-med-advisor",
    image: "/media/feex/yurrhealer-lab.webp",
    description:
      "Multi-agent healthcare intelligence architecture focused on coordinated expert reasoning, retrieval and structured interaction.",
    capabilities: ["Agents", "RAG", "AI / ML", "Knowledge Systems", "Full-Stack"],
    status: "ACTIVE WORLD",
  },
  {
    id: "04",
    name: "KappaXchangefin",
    domain: "Fintech / Payments / Financial Infrastructure",
    repo: "Pending canonical repository connection",
    repoUrl: "https://github.com/FeexSystems",
    image: "/media/feex/kappaxchangefin-ledger.webp",
    canonicalArtifact: "ISO 20022 Financial Infrastructure",
    description:
      "Financial technology world covering payment infrastructure, intelligent financial services, APIs, security and standards-oriented messaging.",
    capabilities: ["Fintech", "Payments", "ISO 20022", "API Gateway", "Financial Security"],
    status: "PENDING REPO",
  },
  {
    id: "05",
    name: "VYRA LABS",
    domain: "Interfaces / Intelligent Media",
    repo: "FeexSystems/VYRA-LABS",
    repoUrl: "https://github.com/FeexSystems/VYRA-LABS",
    image: "/media/feex/ai-neural-core.webp",
    description: "Conversational and intelligent-media interface experimentation.",
    capabilities: ["Conversational UI", "Intelligent Media", "Full-Stack", "Interaction Design"],
    status: "ACTIVE WORLD",
  },
  {
    id: "06",
    name: "Rental Paradise",
    domain: "Real Estate / Digital Commerce",
    repo: "FeexSystems/Rental-Paradise",
    repoUrl: "https://github.com/FeexSystems/Rental-Paradise",
    image: "/media/feex/rental-paradise-architecture.webp",
    description: "Property discovery and digital rental experience architecture.",
    capabilities: ["Digital Commerce", "Discovery Engine", "PostgreSQL", "Modern Web"],
    status: "ACTIVE WORLD",
  },
];

const WORLD_CAROUSEL_ITEMS = DASHBOARD_CAROUSEL_ITEMS;

const SYSTEM_WORLD_SLIDES = [
  {
    image: "/media/feex/sonik-audio-dsp.webp",
    title: "3WM SONIK LABS: Neural DSP Audio Architecture",
    subtitle: "WORLD 01 // AUDIO & CREATIVE TECHNOLOGY",
    category: "01 // DSP & SYNTHESIS",
    tagline: "Connecting neural audio pipelines, intelligent parameter synthesis, and music production workflows.",
  },
  {
    image: "/media/feex/holokai-guardians-armor.webp",
    title: "HoloKai: Where Civilisations Remember",
    subtitle: "WORLD 02 // WORLD MODELS & SPATIAL KNOWLEDGE",
    category: "02 // ARTIFACT INTELLIGENCE",
    tagline: "Deep cultural intelligence, immutable knowledge representation, and immersive 3D world-model environments.",
  },
  {
    image: "/media/feex/yurrhealer-lab.webp",
    title: "Yurrheeler AI: Coordinated Healthcare Multi-Agents",
    subtitle: "WORLD 03 // CLINICAL INTELLIGENCE ARCHITECTURE",
    category: "03 // AGENTIC REASONING",
    tagline: "Multi-agent clinical reasoning engine with grounded retrieval, medical triage protocols, and structured memory.",
  },
  {
    image: "/media/feex/kappaxchangefin-ledger.webp",
    title: "KappaXchangefin: ISO 20022 Financial Telemetry",
    subtitle: "WORLD 04 // CRYPTOGRAPHIC LEDGER & BANKING",
    category: "04 // FINANCIAL TELEMETRY",
    tagline: "High-frequency financial telemetry, ISO 20022 message compliance, and verifiable asset validation fabrics.",
  },
  {
    image: "/media/feex/ai-neural-core.webp",
    title: "VYRA LABS: Conversational AI & FanDNA Profiling",
    subtitle: "WORLD 05 // DIGITAL TWINS & SOCIAL INTELLIGENCE",
    category: "05 // CONVERSATIONAL SYSTEMS",
    tagline: "High-concurrency real-time conversational agents, multi-provider model routing, and creator digital twins.",
  },
  {
    image: "/media/feex/rental-paradise-architecture.webp",
    title: "Rental Paradise: Spatial Real Estate & Commerce",
    subtitle: "WORLD 06 // DIGITAL COMMERCE & SPATIAL DISCOVERY",
    category: "06 // SPATIAL COMMERCE",
    tagline: "High-fidelity spatial property inspection, automated reservation state machines, and booking infrastructure.",
  },
];

const COMPETENCIES = [
  {
    domain: "AI & Intelligent Systems",
    icon: Cpu,
    items: [
      "Large Language Model integration",
      "Model-backed application architecture",
      "AI agents and tool calling",
      "Retrieval-Augmented Generation (RAG)",
      "Semantic search",
      "Embeddings and vector retrieval",
      "Knowledge graphs",
      "World Model architecture",
      "Multi-turn conversational memory",
      "AI-assisted navigation",
    ],
  },
  {
    domain: "Full-Stack Engineering",
    icon: Code2,
    items: [
      "JavaScript / TypeScript",
      "React",
      "HTML / CSS",
      "REST APIs",
      "Application architecture",
      "Component-driven interfaces",
      "Responsive and interactive web experiences",
    ],
  },
  {
    domain: "Data & Backend Infrastructure",
    icon: Database,
    items: [
      "PostgreSQL",
      "Supabase",
      "pgvector",
      "Firebase",
      "SQL",
      "Data modeling",
      "Graph-oriented data structures",
      "Retrieval pipelines",
    ],
  },
  {
    domain: "Infrastructure & DevOps",
    icon: GitBranch,
    items: [
      "Git / GitHub",
      "Docker",
      "Docker Compose",
      "CI/CD concepts",
      "Cloud deployment architectures",
      "Serverless / Edge Functions",
      "Repository automation",
    ],
  },
  {
    domain: "Creative Technology",
    icon: Globe,
    items: [
      "Three.js",
      "WebGL",
      "Interactive 3D",
      "Audio / DSP systems",
      "Music technology",
      "Spatial interfaces",
      "Digital experiences",
    ],
  },
  {
    domain: "Security",
    icon: Shield,
    items: [
      "Application security principles",
      "API security",
      "Authentication / authorization architecture",
      "Secure separation of client and server secrets",
      "Evidence-driven system design",
    ],
  },
];

const INVARIANTS = [
  {
    title: "Evidence over claims",
    desc: "Repository source, documentation and structured system data should support portfolio facts wherever possible.",
  },
  {
    title: "Separation of concerns",
    desc: "Canonical data, runtime state, model reasoning and visual presentation are independent layers.",
  },
  {
    title: "Replaceable AI",
    desc: "The World Model must survive model-provider changes. Grounding tools keep providers interchangeable.",
  },
  {
    title: "Graph-first thinking",
    desc: "Relationships are treated as first-class information instead of metadata hidden inside project descriptions.",
  },
  {
    title: "Progressive disclosure",
    desc: "Users should be able to move from ecosystem-level context to implementation-level evidence without being overwhelmed.",
  },
  {
    title: "Human + machine",
    desc: "AI augments navigation and reasoning; it does not replace the canonical identity of the builder or the factual state of the portfolio.",
  },
];

const DEV_FOCUS = [
  "Live GitHub repository ingestion",
  "Repository crawling",
  "README/source analysis",
  "Technology/version extraction",
  "Artifact discovery",
  "PostgreSQL / pgvector retrieval",
  "Semantic + graph hybrid search",
  "Multi-turn Navigator memory",
  "LLM tool calling",
  "Explainable relationship paths",
  "Voice navigation",
  "Repository telemetry",
  "Continuous World Model evolution",
];

const JOURNAL_SERIES = [
  {
    id: "01",
    title: "The Persona OS",
    articles: [
      "Why a portfolio became a digital operating environment",
      "Designing the Persona Digital Twin",
      "Building a 3D planetary interface with Three.js",
      "Spatial navigation as an information architecture",
    ],
  },
  {
    id: "02",
    title: "Intelligent World Model",
    articles: [
      "From static project registry to World Model",
      "Designing typed entities and graph relationships",
      "Explainable graph paths",
      "Repository-aware portfolio intelligence",
    ],
  },
  {
    id: "03",
    title: "Model-Backed Intelligence",
    articles: [
      "Why the LLM must not become the World Model",
      "Grounding an AI Navigator with graph tools",
      "Hybrid semantic + graph retrieval",
      "PostgreSQL and pgvector for portfolio intelligence",
      "Multi-turn memory without contaminating canonical facts",
      "Provider-neutral model adapters",
    ],
  },
  {
    id: "04",
    title: "Repository Intelligence",
    articles: [
      "Live GitHub ingestion",
      "Crawling README and source trees",
      "Technology and version extraction",
      "Automatic artifact discovery",
      "Repository telemetry and change detection",
    ],
  },
  {
    id: "05",
    title: "Systems in the World",
    articles: [
      "3WM SONIK LABS — AI-native audio systems",
      "HoloKai — civilization intelligence and world models",
      "Yurrheeler AI — coordinated healthcare agents",
      "KappaXchangefin — financial infrastructure and ISO 20022",
      "VYRA LABS — conversational interfaces",
      "Rental Paradise — property discovery and digital commerce",
    ],
  },
  {
    id: "06",
    title: "Engineering Practice",
    articles: [
      "Designing replaceable AI infrastructure",
      "Building systems around evidence rather than claims",
      "Frontend as an observability surface",
      "Security boundaries for model-backed applications",
      "Progressive disclosure in complex interfaces",
    ],
  },
];

// ---------------------------------------------------------------------------
// CANONICAL SAAS CONVERSION DATASETS (8 CORE PILLARS)
// ---------------------------------------------------------------------------

const PROBLEMS = [
  {
    id: "01",
    badge: "AI HALLUCINATIONS",
    title: "The Phantom Architecture Trap",
    desc: "Generic LLMs and coding assistants invent non-existent APIs, deprecated endpoints, and fictitious architectures because they lack an authoritative factual ground truth.",
    metric: "42% of LLM architectural answers contain ungrounded assumptions",
  },
  {
    id: "02",
    badge: "TRIBAL KNOWLEDGE",
    title: "Documentation Rot & Engineer Drift",
    desc: "Architecture decisions live in ephemeral Slack threads or stale Confluence pages that become obsolete two weeks after sprint close, leaving new engineers blind.",
    metric: "Docs rot within 14 days of rapid CI/CD iteration",
  },
  {
    id: "03",
    badge: "REPOSITORY SILOS",
    title: "Disconnected Code Silos",
    desc: "Teams manage dozens of decoupled repositories with zero cross-system topological awareness. When service contracts shift, upstream integrations break silently.",
    metric: "Zero cross-repo topological graph visibility",
  },
  {
    id: "04",
    badge: "UNVERIFIABLE CLAIMS",
    title: "Unverifiable Engineering Proof",
    desc: "Claims of scalability, ISO 20022 compliance, or microservice architecture have no traceable cryptographic link to actual repository commits, branch state, or artifacts.",
    metric: "0% cryptographic audit trail on architecture slides",
  },
];

const SOLUTIONS = [
  {
    step: "STEP 01",
    name: "Automated GitHub Ingestion",
    title: "Continuous Codebase Synchronization",
    desc: "HMAC SHA-256 verified webhooks ingest every commit, branch, release, and pull request in real time. Automatic AST parsers extract technologies, dependencies, and code artifacts without manual effort.",
    tag: "LIVE WEBHOOK INGESTION",
  },
  {
    step: "STEP 02",
    name: "Sovereign PostgreSQL World Model",
    title: "Deterministic Knowledge Graph + pgvector",
    desc: "The database is the canonical reality. Every entity (World, Repository, Artifact, Technology) is stored as a typed relational node with directional graph edges and vector embeddings.",
    tag: "AUTHORITATIVE FACTS",
  },
  {
    step: "STEP 03",
    name: "Grounded Neural Interpretation",
    title: "AI Navigator & Spatial Galaxy",
    desc: "AI models (OpenAI, Anthropic, Gemini) act as pure interpreters over the World Model. Every answer includes verifiable cryptographic commit SHAs, file paths, and interactive 3D spatial node projections.",
    tag: "VERIFIABLE PROVENANCE",
  },
];

const PRICING_TIERS = [
  {
    name: "Community Explorer",
    badge: "FREE FOREVER",
    priceMonthly: 0,
    priceAnnual: 0,
    desc: "For individual engineers, researchers, and open-source contributors exploring sovereign knowledge graphs.",
    features: [
      "Access to full-screen 3D Spatial Knowledge Galaxy",
      "Grounded AI Navigator (100 queries / month)",
      "Public GitHub repository ingestion (1 repo)",
      "Cryptographic Evidence Fabric inspection",
      "Community Discord & open documentation",
      "Standard WebGL rendering kernel",
    ],
    ctaText: "Start Exploring Free",
    ctaLink: "/register",
    popular: false,
    highlight: false,
  },
  {
    name: "Engineer Pro",
    badge: "MOST POPULAR",
    priceMonthly: 29,
    priceAnnual: 24,
    desc: "For professional engineers and tech leads turning multi-repo ecosystems into living intelligent systems.",
    features: [
      "Everything in Community Explorer",
      "Unlimited Grounded AI Navigator queries",
      "Up to 25 connected GitHub repositories",
      "Full Omni-Command Stage multi-agent execution",
      "Private GitHub organization webhook sync (HMAC SHA-256)",
      "pgvector hybrid semantic search & citation ledger",
      "Provider-neutral model routing (OpenAI, Anthropic, Gemini)",
      "Priority Bull queue indexing & real-time telemetry",
    ],
    ctaText: "Deploy Engineer Pro",
    ctaLink: "/dashboard/billing?plan=professional",
    popular: true,
    highlight: true,
  },
  {
    name: "Enterprise Sovereign",
    badge: "SELF-HOSTED / AIR-GAPPED",
    priceMonthly: 290,
    priceAnnual: 240,
    desc: "For technology organizations requiring sovereign, air-gapped deployment, custom SLAs, and custom LLM adapters.",
    features: [
      "Everything in Engineer Pro",
      "Unlimited repositories and team workspaces",
      "Self-hosted PostgreSQL & Redis cluster deployment",
      "BYOK (Bring Your Own Keys) or on-prem air-gapped LLMs",
      "Multi-tenant RBAC, audit logs & SSO (SAML / Okta)",
      "Custom model reasoning adapters & AST rules",
      "Dedicated Systems Architect & 99.99% uptime SLA",
      "Direct Slack/Discord private bridge & onboarding",
    ],
    ctaText: "Talk to Systems Architect",
    ctaLink: "mailto:contact@feexsystems.com",
    popular: false,
    highlight: false,
  },
];

const FAQS = [
  {
    q: "How does FeexSystems prevent AI hallucinations?",
    a: "FeexSystems enforces a strict invariant: 'The database-backed World Model is canonical; AI models are only interpreters.' When you ask a question, our hybrid retrieval pipeline fetches authoritative nodes from PostgreSQL and pgvector embeddings, anchoring the model prompt with concrete facts, commit SHAs, and file paths. If evidence does not exist in the World Model, the model is forbidden from fabricating claims.",
  },
  {
    q: "Does FeexSystems train AI models on our proprietary source code?",
    a: "No. FeexSystems never trains foundational models on your code or architecture. We use zero-retention enterprise API endpoints with OpenAI, Anthropic, and Google Gemini, or you can point the platform directly to your own self-hosted LLM endpoint (e.g. Ollama or vLLM) via our provider-neutral adapter layer.",
  },
  {
    q: "Can we self-host FeexSystems inside our own VPC or air-gapped cloud?",
    a: "Yes. FeexSystems is architected with Docker and Prisma ORM, backed by PostgreSQL and Redis. The entire backend, ingestion pipeline, 3D WebGL projection, and local vector search can run 100% inside your AWS, GCP, Azure, or on-premise Kubernetes cluster.",
  },
  {
    q: "What happens if a primary model provider (OpenAI / Anthropic) suffers an outage?",
    a: "The FeexSystems aiService architecture is completely provider-neutral. It includes automated fallback chains: if OpenAI is degraded, requests automatically failover to Anthropic Claude 3.5 Sonnet or Gemini 1.5 Pro without dropping context or interrupting your workflow.",
  },
  {
    q: "How does the Evidence Fabric prove architectural integrity?",
    a: "Every relationship (e.g., 'PROJECT HAS_REPOSITORY', 'REPOSITORY CONTAINS_ARTIFACT') is stored with cryptographic provenance: the exact GitHub commit SHA, branch, file path, and observation timestamp. You can click any node in the 3D Galaxy or Navigator and inspect the raw commit in GitHub.",
  },
  {
    q: "How does GitHub webhook ingestion handle private repositories and rate limits?",
    a: "Webhook events are signed with HMAC SHA-256 secrets for cryptographic authenticity. Ingestion tasks are queued in an asynchronous Redis Bull queue with exponential backoff and rate-limit budgeting, ensuring zero drops even during peak commit bursts.",
  },
];

export default function Index() {
  const [copiedTerminal, setCopiedTerminal] = useState(false);
  const [strokeVariant, setStrokeVariant] = useState<"neural" | "circuit" | "cube" | "infinity">("neural");
  const [bgTheme, setBgTheme] = useState<"cyber" | "matrix" | "violet" | "aurora">("cyber");
  const [asciiMode, setAsciiMode] = useState<"rotatingCube" | "cyberBanner" | "streamMatrix">("rotatingCube");
  const [theaterOpen, setTheaterOpen] = useState(false);
  const [showTelemetrySkeleton, setShowTelemetrySkeleton] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [activeDemoTab, setActiveDemoTab] = useState<"navigator" | "galaxy" | "omni" | "evidence">("navigator");

  const handleCopyCmd = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTerminal(true);
    setTimeout(() => setCopiedTerminal(false), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#000000] text-white antialiased font-mono selection:bg-white selection:text-black relative pb-32">
      {/* 01. GLOBAL INTERACTIVE CURSOR DOT TRAIL */}
      <CursorDotTrail />

      {/* 01.5. GLOBAL AMBIENT LIVING INTELLIGENCE CYBERNETIC BACKGROUND */}
      <AmbientLivingBackground fixed={true} opacity={32} linesOpacity={18} />

      {/* 02. FULL-WIDTH TECHNICAL NAVIGATION */}
      <FullWidthNav />

      {/* 03. FULLSCREEN THEATER VIDEO PLAYER MODAL */}
      <TheaterVideoPlayer
        isOpen={theaterOpen}
        onClose={() => setTheaterOpen(false)}
        videoUrl="/media/feex/feexsystems-pitch-deck.mp4"
        title="FEEXSYSTEMS Living Intelligence Architecture"
        description="Live tour through the Canonical Execution Pipeline., 3D Spatial Knowledge Galaxy, and Model-Backed Grounded Reasoning."
      />

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* HERO SECTION: PROFESSIONAL PROFILE & CANONICAL PRINCIPLE                  */}
        {/* ========================================================================= */}
        <section className="relative w-full overflow-hidden border-b border-white/10 bg-[#000000]/95 pt-14 pb-20 md:pt-20 md:pb-28">
          {/* 00. FEEX ROBOTICS AMBIENT VIDEO OVERLAY */}
          <VideoOverlayBackground
            src="/media/feex/feex-robotics.mp4"
            position="hero"
            opacity={0.4}
            blendMode="normal"
            label="FEEX Robotics Feed"
            showToggle={true}
          />

          {/* 01. THREE.JS INFINITE 3D SCROLL PERSPECTIVE TUNNEL (UPSTREAM FRAMER) - HIDDEN TO PREVENT WHITE WASH */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-40 overflow-hidden hidden">
            <HeroTunnel
              isDarkMode={true}
              transparent={true}
              tunnelSpeed={0.045}
              className="w-full h-full"
            />
          </div>

          {/* 02. WARP-SPEED PERSPECTIVE STARFIELD BACKGROUND */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
            <WarpStarfield
              starCount={750}
              speed={0.4}
              perspective={1.0}
              spread={1.2}
              streak={0.65}
              starColor="#FFFFFF"
              background="transparent"
              parallax={0.06}
            />
          </div>

          {/* 03. VECTOR INTERACTION LINES BACKGROUND - HIDDEN TO PREVENT WHITE WASH */}
          <div className="hidden">
            <InteractionLinesBackground className="opacity-25" />
          </div>

          <div className="container mx-auto max-w-7xl px-5 md:px-8 relative z-10">
            <div className="max-w-4xl space-y-8">
              {/* Header Badges */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3.5 py-1 text-xs text-white/90 backdrop-blur-md">
                  <span className="size-2 rounded-full bg-white animate-pulse" />
                  <span className="font-semibold uppercase tracking-wider">
                    FEEXSYSTEMS — INTELLIGENT SYSTEMS LABS
                  </span>
                </div>
                {/* 05. CRYPTOGRAPHIC PROOF BADGE */}
                <BtcMonoBadge
                  commitSha="feex9b3c4f280a91e56d7821bc34"
                  label="CANONICAL FACTS ENGINE"
                  blockHeight={840210}
                />
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-light tracking-tight text-white leading-[1.08]">
                Building the Systems Behind <br />
                <TextScrambleMorph text="Tomorrow's Intelligence." speed={25} />
              </h1>

              {/* Sub-Headline / Profile Summary */}
              <p className="text-base sm:text-xl text-white/70 font-sans leading-relaxed max-w-3xl">
                We engineer intelligent digital ecosystems at the intersection of <strong className="text-white font-semibold">AI, software architecture, data, automation, and human experience</strong>. The work is organized as a connected ecosystem rather than a collection of isolated applications.
              </p>

              {/* Core Attributes Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-xs text-zinc-300 font-mono">
                <div className="border border-white/10 rounded-lg p-3 bg-white/[0.02]">
                  <div className="text-zinc-300 text-[10px] uppercase font-semibold">Ecosystem</div>
                  <div className="text-white font-medium truncate mt-1">FEEX WORLD Operating System</div>
                </div>
                <div className="border border-white/10 rounded-lg p-3 bg-white/[0.02]">
                  <div className="text-zinc-300 text-[10px] uppercase font-semibold">GitHub</div>
                  <GitHubGuardLink href="https://github.com/FeexSystems" className="text-white font-medium hover:underline truncate mt-1 block">
                    github.com/FeexSystems
                  </GitHubGuardLink>
                </div>
                <div className="border border-white/10 rounded-lg p-3 bg-white/[0.02]">
                  <div className="text-zinc-300 text-[10px] uppercase font-semibold">Email</div>
                  <a href="mailto:Solutions@feexsystems.codes" className="text-white font-medium hover:underline truncate mt-1 block">
                    Solutions@feexsystems.codes
                  </a>
                </div>
                <div className="border border-white/10 rounded-lg p-3 bg-white/[0.02]">
                  <div className="text-zinc-300 text-[10px] uppercase font-semibold">Location</div>
                  <div className="text-white font-medium truncate mt-1">Global / Remote</div>
                </div>
              </div>

              {/* Action Buttons using MagneticGlowButton */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                {/* PRIMARY CONVERSION CTA - DEPLOY */}
                <MagneticGlowButton
                  variant="primary"
                  size="lg"
                  to="/register"
                  className="bg-white text-black font-semibold shadow-2xl hover:bg-white/90"
                >
                  <Sparkles className="w-4 h-4 mr-2 inline-block text-black" />
                  <span>Explore FeexSystems</span>
                </MagneticGlowButton>

                {/* 06. MAGNETIC GLOW BUTTON - WORLD */}
                <MagneticGlowButton
                  variant="outline"
                  size="lg"
                  to="/world"
                  className="border border-white/20 bg-black/60 text-white hover:bg-white/10"
                >
                  <Globe className="w-4 h-4 mr-2 inline-block" />
                  <span>Enter the World</span>
                </MagneticGlowButton>

                {/* 07. MAGNETIC GLOW BUTTON - OMNI */}
                <MagneticGlowButton
                  variant="outline"
                  size="lg"
                  to="/omni"
                  className="border border-white/20 bg-black/60 text-white hover:bg-white/10 hidden sm:inline-flex"
                >
                  <Terminal className="w-4 h-4 mr-2 inline-block" />
                  <span>Omni Command</span>
                </MagneticGlowButton>
              </div>

              {/* Enterprise Trust Metrics Bar */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-y-2 gap-x-6 text-[11px] font-mono text-zinc-300">
                <span className="flex items-center gap-1.5 text-white/80">
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                  100% Deterministic Grounding
                </span>
                <span className="flex items-center gap-1.5 text-white/80">
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                  0% Model Fact Hallucination
                </span>
                <span className="flex items-center gap-1.5 text-white/80">
                  <Zap className="w-3.5 h-3.5 text-white" />
                  Sub-50ms pgvector Retr.
                </span>
                <span className="flex items-center gap-1.5 text-white/80">
                  <RefreshCw className="w-3.5 h-3.5 text-white" />
                  Zero-Vendor Lock-in
                </span>
              </div>
            </div>
          </div>
        </section>

{/* ========================================================================= */}
        {/* SECTION // OUR CORE PRINCIPLE                                             */}
        {/* ========================================================================= */}
        <section className="w-full border-b border-white/10 bg-[#050505]/85 backdrop-blur-[2px] py-20 md:py-28 relative overflow-hidden">
          <div className="container mx-auto max-w-5xl px-5 md:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
              <span className="size-1.5 rounded-full bg-white" />
              <span>// OUR CORE PRINCIPLE</span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-white max-w-4xl mx-auto my-4">
              We Build Systems, Not Just Applications.
            </h2>
            <p className="text-lg text-white/60 font-sans max-w-2xl mx-auto">
              The gap between "having AI capabilities" and "having an intelligent system" is engineering.
            </p>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION // 01 — OUR PHILOSOPHY                                             */}
        {/* ========================================================================= */}
        <section className="w-full border-b border-white/10 bg-[#000000]/80 backdrop-blur-[2px] py-24 relative overflow-hidden">
          <div className="container mx-auto max-w-7xl px-5 md:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="max-w-2xl space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
                  <span>// 01 OUR PHILOSOPHY</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                  Intelligence Is an Ecosystem.
                </h2>
                <p className="text-base sm:text-lg text-white/60 font-sans leading-relaxed">
                  True intelligence doesn't live in a single model or a standalone API. It emerges when robust software architecture, authoritative data pipelines, and responsive human interfaces are woven together. We don't just prompt models; we build the foundational systems that allow models to reason accurately and operate safely.
                </p>
              </div>
              <div className="flex justify-center lg:justify-end">
                <div className="w-full aspect-video border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden flex items-center justify-center p-8">
                   <div className="w-full h-full opacity-50 flex flex-col justify-center gap-4">
                     <TransitionVisualizer />
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION // 02 — OUR ARCHITECTURE                                           */}
        {/* ========================================================================= */}
        <section className="w-full border-b border-white/10 bg-[#050505]/85 backdrop-blur-[2px] py-24 relative overflow-hidden">
          <div className="container mx-auto max-w-7xl px-5 md:px-8 space-y-16">
            <div className="max-w-3xl space-y-4">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
                  <span>// 02 OUR ARCHITECTURE</span>
                </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
                The Spectrum of Intelligence.
              </h2>
              <p className="text-base sm:text-lg text-white/60 font-sans leading-relaxed">
                From deterministic data systems to autonomous agentic layers, we architect across the entire spectrum.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Canonical Databases', desc: 'Authoritative World Models.', icon: Database },
                { title: 'Evidence Fabrics', desc: 'Cryptographically verifiable state.', icon: ShieldCheck },
                { title: 'Semantic Search', desc: 'High-performance vector retrieval.', icon: Search },
                { title: 'Agentic Workflows', desc: 'Multi-agent orchestration and reasoning.', icon: GitBranch },
                { title: 'Spatial Interfaces', desc: '3D WebGL data visualization.', icon: Globe }
              ].map((card, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-black/60 p-6 space-y-4 hover:border-white/30 transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <card.icon className="w-5 h-5 text-white/80" />
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-white/90">{card.title}</h3>
                  <p className="text-sm text-zinc-400">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* SECTION // 03 — WHAT WE BUILD                                              */}
        {/* ========================================================================= */}
        <section className="w-full border-b border-white/10 bg-[#050505]/85 backdrop-blur-[2px] py-24 relative overflow-hidden">
          <div className="container mx-auto max-w-7xl px-5 md:px-8 space-y-16">
            <div className="max-w-3xl space-y-4">
              <div className="text-xs tracking-widest text-zinc-300 font-semibold uppercase">
                // 03 WHAT WE BUILD
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white">
                Persona Digital Operating Environment
              </h2>
              <p className="text-base sm:text-lg text-white/60 font-sans leading-relaxed">
                
              </p>
            </div>

            {/* 10. SCROLL ZOOM REVEAL WRAPPER */}
            <ScrollZoomReveal>
              <div className="rounded-2xl border border-white/15 bg-black/80 p-8 backdrop-blur-xl shadow-2xl">
                <div className="text-xs font-mono text-zinc-300 mb-6 uppercase tracking-wider font-semibold flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-white" />
                    CANONICAL EXECUTION PIPELINE
                  </span>
                  <span>7-TIER ARCHITECTURE SPECIFICATION</span>
                </div>

                {/* The 7-Step Pipeline */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center font-mono">
                  {[
                    { step: "01", name: "PERSONA", desc: "Builder Identity" },
                    { step: "02", name: "DIGITAL TWIN", desc: "Runtime State" },
                    { step: "03", name: "WORLD MODEL", desc: "Canonical Database" },
                    { step: "04", name: "KNOWLEDGE GRAPH", desc: "Typed Topology" },
                    { step: "05", name: "HYBRID RETRIEVAL", desc: "pgvector + Graph" },
                    { step: "06", name: "AI NAVIGATOR", desc: "Model Reasoning" },
                    { step: "07", name: "3D PLANETARY", desc: "Spatial WebGL" },
                  ].map((node, idx) => (
                    <div key={node.name} className="relative p-4 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col items-center justify-center space-y-2 group hover:border-white/30 transition-all">
                      <span className="text-[10px] text-zinc-200 font-bold">{node.step}</span>
                      <span className="text-xs font-bold text-white tracking-wider">{node.name}</span>
                      <span className="text-[10px] text-zinc-300 font-sans font-medium">{node.desc}</span>
                      {idx < 6 && (
                        <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-zinc-400">
                          →
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollZoomReveal>

            {/* Entities & Relationships Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
              {/* Entities Card */}
              <div className="rounded-xl border border-white/10 bg-black/60 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-white tracking-wider uppercase flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Intelligent World Model Entities
                  </h3>
                  <span className="text-[10px] text-zinc-300 font-semibold">8 TYPES</span>
                </div>
                <p className="text-xs text-white/60 font-sans">
                  Structured portfolio knowledge organized into strictly typed entities:
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {["PERSONA", "WORLD", "REPOSITORY", "ARTIFACT", "TECHNOLOGY", "CAPABILITY", "TIMELINE", "EVENT"].map((ent) => (
                    <span key={ent} className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-xs font-mono text-white/90">
                      {ent}
                    </span>
                  ))}
                </div>
              </div>

              {/* Relationships Card */}
              <div className="rounded-xl border border-white/10 bg-black/60 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-white tracking-wider uppercase flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    Typed Relationships
                  </h3>
                  <span className="text-[10px] text-zinc-300 font-semibold">8 EDGES</span>
                </div>
                <p className="text-xs text-white/60 font-sans">
                  First-class directional graph edges explaining architectural connectivity:
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {["OWNS", "IMPLEMENTS", "USES", "DEPENDS_ON", "RELATED_TO", "EVOLVED_FROM", "PUBLISHED", "OCCURRED_AT"].map((rel) => (
                    <span key={rel} className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-xs font-mono text-white/90">
                      {rel}
                    </span>
                  ))}
                </div>
              </div>

              {/* Model-Backed Intelligence Card */}
              <div className="rounded-xl border border-white/10 bg-black/60 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-white tracking-wider uppercase flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    Model-Backed Intelligence
                  </h3>
                  <span className="text-[10px] text-zinc-300 font-semibold">7 CAPABILITIES</span>
                </div>
                <p className="text-xs text-white/60 font-sans">
                  Designed the AI layer as an interpreter over canonical facts:
                </p>
                <ul className="text-xs text-white/70 space-y-1.5 font-sans pt-1">
                  <li>• Entity search & vector doc retrieval</li>
                  <li>• Graph-neighbor expansion & explainable paths</li>
                  <li>• Conversational memory without fact contamination</li>
                  <li>• Safe tool-calling & voice input/output</li>
                </ul>
              </div>
            </div>

            {/* 11. STATE MACHINE TRANSITION VISUALIZER */}
            <div className="space-y-4 pt-6">
              <div className="flex items-center justify-between text-xs text-zinc-300 font-mono uppercase font-semibold">
                <span>// LIVE STATE MACHINE TRANSITION ENGINE</span>
                <span>VERIFIABLE RUNTIME PIPELINE</span>
              </div>
              <TransitionVisualizer />
            </div>
          </div>
        </section>

{/* ========================================================================= */}
        {/* SECTION // 04 — ENTERPRISE READINESS                                       */}
        {/* ========================================================================= */}
        <section className="w-full border-b border-white/10 bg-[#050505]/85 backdrop-blur-[2px] py-24 relative overflow-hidden">
          <div className="container mx-auto max-w-7xl px-5 md:px-8 space-y-16">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
                <span>// 04 ENTERPRISE READINESS</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
                Built for Production.
              </h2>
              <p className="text-base sm:text-lg text-white/60 font-sans leading-relaxed">
                Systems designed to scale securely from day one.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'Security & Compliance', desc: 'Secure by design principles applied at every layer.', icon: ShieldAlert },
                { title: 'Observability & Telemetry', desc: 'Comprehensive monitoring, logging, and tracing.', icon: Activity },
                { title: 'Resilient Infrastructure', desc: 'Fault-tolerant architecture with automated recovery.', icon: Server }
              ].map((card, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-black/60 p-6 space-y-4 text-center hover:border-white/30 transition-all group">
                  <div className="w-12 h-12 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <card.icon className="w-6 h-6 text-white/80" />
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-white/90">{card.title}</h3>
                  <p className="text-sm text-zinc-400">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* ========================================================================= */}
        {/* SECTION // 05 — PRICING                                                  */}
        {/* ========================================================================= */}
        <section id="pricing" className="w-full border-b border-white/10 bg-[#000000]/80 backdrop-blur-[2px] py-24 relative overflow-hidden">
          <div className="container mx-auto max-w-7xl px-5 md:px-8 space-y-16">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-mono text-white">
                <DollarSign className="w-3.5 h-3.5 text-white" />
                <span>// 05 PRICING</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white">
                Start Free. Scale With Sovereign Control.
              </h2>
              <p className="text-base sm:text-lg text-white/60 font-sans leading-relaxed max-w-2xl">
                Choose the deployment tier that fits your engineering team. Every plan is backed by verifiable code evidence and zero model lock-in.
              </p>

              {/* Monthly / Annual Billing Toggle */}
              <div className="pt-4 flex items-center gap-3 font-mono text-xs">
                <span className={billingCycle === "monthly" ? "text-white font-bold" : "text-zinc-400 font-medium"}>
                  MONTHLY
                </span>
                <button
                  onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
                  className="w-12 h-6 rounded-full border border-white/20 bg-white/10 p-0.5 relative transition-colors"
                  aria-label="Toggle billing cycle"
                >
                  <div
                    className={`size-4.5 rounded-full bg-white transition-transform ${
                      billingCycle === "annual" ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
                <div className="flex items-center gap-1.5">
                  <span className={billingCycle === "annual" ? "text-white font-bold" : "text-zinc-400 font-medium"}>
                    ANNUAL BILLING
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-white text-black font-bold">
                    SAVE 20%
                  </span>
                </div>
              </div>
            </div>

            {/* 3-Tier Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              {PRICING_TIERS.map((tier) => {
                const price = billingCycle === "annual" ? tier.priceAnnual : tier.priceMonthly;
                return (
                  <div
                    key={tier.name}
                    className={`rounded-2xl border p-8 flex flex-col justify-between transition-all relative ${
                      tier.popular
                        ? "border-white bg-[#0a0a0a] shadow-2xl scale-[1.02]"
                        : "border-white/10 bg-black/60 hover:border-white/25"
                    }`}
                  >
                    {tier.popular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-white text-black font-mono text-[10px] font-bold tracking-wider uppercase">
                        MOST POPULAR FOR TEAMS
                      </div>
                    )}

                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div>
                          <div className="text-[10px] font-mono text-zinc-300 uppercase tracking-wider font-semibold">
                            {tier.badge}
                          </div>
                          <h3 className="text-xl font-bold text-white mt-1">{tier.name}</h3>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl sm:text-5xl font-light text-white">${price}</span>
                          <span className="text-xs font-mono text-zinc-300">
                            {price === 0 ? "forever" : "/ month"}
                          </span>
                        </div>
                        {billingCycle === "annual" && price > 0 && (
                          <div className="text-[11px] font-mono text-zinc-300">
                            Billed annually (${price * 12}/yr)
                          </div>
                        )}
                        <p className="text-xs text-zinc-300 font-sans pt-2 leading-relaxed">
                          {tier.desc}
                        </p>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-white/10">
                        <div className="text-[10px] font-mono text-zinc-300 uppercase tracking-wider font-semibold">
                          INCLUDED CAPABILITIES
                        </div>
                        <ul className="space-y-2.5 text-xs text-zinc-200 font-sans">
                          {tier.features.map((feat) => (
                            <li key={feat} className="flex items-start gap-2.5">
                              <Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-8 mt-6 border-t border-white/10">
                      <MagneticGlowButton
                        variant={tier.popular ? "primary" : "outline"}
                        size="md"
                        to={tier.ctaLink}
                        className={`w-full justify-center ${
                          tier.popular
                            ? "bg-white text-black font-bold hover:bg-white/90"
                            : "border border-white/20 text-white hover:bg-white/10"
                        }`}
                      >
                        {tier.popular && <Sparkles className="w-4 h-4 mr-2 text-black inline-block" />}
                        <span>{tier.ctaText}</span>
                      </MagneticGlowButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION // 13 — FREQUENTLY ANSWERED OBJECTIONS (FAQ)                       */}
        {/* ========================================================================= */}
        <section id="faq" className="w-full border-b border-white/10 bg-[#050505]/85 backdrop-blur-[2px] py-24 relative">
          <div className="container mx-auto max-w-5xl px-5 md:px-8 space-y-12">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-mono text-white">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>// HANDLING SYSTEM OBJECTIONS</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white">
                Frequently Answered Objections
              </h2>
              <p className="text-base sm:text-lg text-zinc-300 font-sans leading-relaxed">
                Clear answers regarding security boundaries, hallucination protection, model neutrality, and infrastructure sovereignty.
              </p>
            </div>

            {/* Radix FAQ Accordion */}
            <div className="pt-4">
              <Accordion type="single" collapsible className="w-full space-y-4 font-mono">
                {FAQS.map((faq, idx) => (
                  <AccordionItem
                    key={faq.q}
                    value={`faq-${idx}`}
                    className="border border-white/15 rounded-xl bg-black/80 px-6 overflow-hidden transition-colors hover:border-white/30"
                  >
                    <AccordionTrigger className="text-sm font-semibold text-white hover:text-white/80 py-5 hover:no-underline text-left">
                      <div className="flex items-center gap-3 pr-4">
                        <span className="text-zinc-300 font-mono text-xs font-semibold">0{idx + 1}.</span>
                        <span>{faq.q}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6 pt-1 text-xs text-zinc-200 font-sans leading-relaxed border-t border-white/10">
                      <p className="pt-3">{faq.a}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION // 14 — FINAL CLOSING CONVERSION STAGE (REPEAT BUY BUTTON)         */}
        {/* ========================================================================= */}
        <section className="w-full border-b border-white/10 bg-[#000000]/80 backdrop-blur-[2px] py-28 relative overflow-hidden">
          {/* Subtle Ambient Warp Backdrop */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
            <WarpStarfield
              starCount={350}
              speed={0.25}
              perspective={0.9}
              spread={1.0}
              streak={0.5}
              starColor="#FFFFFF"
              background="transparent"
              parallax={0.03}
            />
          </div>

          <div className="container mx-auto max-w-5xl px-5 md:px-8 text-center space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-mono text-white">
              <span className="size-2 rounded-full bg-white animate-pulse" />
              <span>SOVEREIGN ENGINEERING INTELLIGENCE</span>
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
              Stop relying on hallucinated architecture. <br />
              <span className="font-semibold text-zinc-300">Ground your engineering in verifiable truth.</span>
            </h2>

            <p className="text-base sm:text-lg text-zinc-200 font-sans max-w-2xl mx-auto leading-relaxed">
              Deploy your living World Model in under three minutes. Connect your GitHub repositories and turn your code, commits, and artifacts into an authoritative spatial intelligence platform.
            </p>

            {/* Primary & Secondary Repeated Conversion Actions */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <MagneticGlowButton
                variant="primary"
                size="lg"
                to="/register"
                className="bg-white text-black font-bold shadow-2xl hover:bg-white/90 px-8 py-3.5 text-sm"
              >
                <Sparkles className="w-4 h-4 mr-2 inline-block text-black" />
                <span>Launch Your Sovereign World Model</span>
              </MagneticGlowButton>

              <MagneticGlowButton
                variant="outline"
                size="lg"
                to="/world"
                className="border border-white/20 bg-black/60 text-white hover:bg-white/10 px-6 py-3.5 text-sm"
              >
                <Globe className="w-4 h-4 mr-2 inline-block" />
                <span>Explore Live 3D Galaxy</span>
              </MagneticGlowButton>
            </div>

            {/* Terminal One-Liner Quick-Start */}
            <div className="pt-6 max-w-md mx-auto">
              <div className="rounded-xl border border-white/15 bg-black/90 p-3 font-mono text-xs flex items-center justify-between text-zinc-200">
                <span className="truncate mr-2">curl -fsSL https://feexsystems.codes/install.sh | bash</span>
                <button
                  onClick={() => handleCopyCmd("curl -fsSL https://feexsystems.codes/install.sh | bash")}
                  className="hover:text-white p-1 rounded bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition-colors"
                  aria-label="Copy terminal install command"
                >
                  {copiedTerminal ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Trust and Conversion Guarantee Badges */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-mono text-zinc-300 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-white/70" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-white/70" />
                Instant GitHub webhook sync
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-white/70" />
                100% Sovereign data ownership
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION // 15 — KINETIC TSUNAMI WAVE DIVIDER                              */}
        {/* ========================================================================= */}
        <div className="w-full border-t border-white/10 bg-[#000000] relative overflow-hidden pt-8">
          <div className="text-center font-mono text-[10px] text-zinc-300 tracking-widest uppercase mb-2 font-semibold">
            VERIFIABLE MATHEMATICAL FLUID MOTION
          </div>
          <TsunamiWave height={120} className="opacity-30" />
        </div>
      </main>

      {/* ========================================================================= */}
      {/* GLOBAL TECHNICAL FOOTER                                                   */}
      {/* ========================================================================= */}
      <footer className="w-full border-t border-white/10 bg-[#000000]/30 backdrop-blur-[2px] py-16 text-xs text-zinc-300 relative z-10 overflow-hidden">
        {/* FEEX ROBOTICS AMBIENT VIDEO OVERLAY */}
        <VideoOverlayBackground
          src="/media/feex/feex-robotics.mp4"
          position="footer"
          opacity={0.65}
          blendMode="normal"
          label="FEEX Robotics Stream"
          showToggle={true}
        />

        <div className="container mx-auto max-w-7xl px-5 md:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
            {/* Brand Column */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2 text-base font-bold text-white tracking-tight">
                <span className="size-2.5 bg-white" />
                <span>FEEXSYSTEMS</span>
              </div>
              <p className="text-xs text-zinc-300 max-w-sm leading-relaxed font-sans">
                Evidence-backed engineering intelligence platform turning the FeexSystems GitHub ecosystem into an explorable World Model.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-zinc-300 font-mono font-medium">
                <span className="size-2 rounded-full bg-white animate-pulse" />
                <span>ALL CANONICAL SYSTEMS ACTIVE • LAST UPDATED SEP 2026</span>
              </div>
            </div>

            {/* Platform Links */}
            <div className="space-y-3 font-mono">
              <div className="text-white font-semibold text-xs tracking-wider uppercase">Platform</div>
              <ul className="space-y-2 text-xs text-zinc-300">
                <li>
                  <Link to="/world" className="hover:text-white transition-colors">
                    3D Spatial World
                  </Link>
                </li>
                <li>
                  <Link to="/projects" className="hover:text-white transition-colors">
                    Projects Explorer
                  </Link>
                </li>
                <li>
                  <Link to="/navigator" className="hover:text-white transition-colors">
                    AI Navigator
                  </Link>
                </li>
                <li>
                  <Link to="/omni" className="hover:text-white transition-colors">
                    Omni-Command Stage
                  </Link>
                </li>
                <li>
                  <Link to="/evidence" className="hover:text-white transition-colors">
                    Evidence Fabric
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources Links */}
            <div className="space-y-3 font-mono">
              <div className="text-white font-semibold text-xs tracking-wider uppercase">Resources</div>
              <ul className="space-y-2 text-xs text-zinc-300">
                <li>
                  <GitHubGuardLink
                    href="https://github.com/FeexSystems"
                    className="hover:text-white transition-colors"
                  >
                    GitHub Organization
                  </GitHubGuardLink>
                </li>
                <li>
                  <a href="mailto:contact@feexsystems.com" className="hover:text-white transition-colors">
                    contact@feexsystems.com
                  </a>
                </li>
                <li>
                  <a href="/health" target="_blank" className="hover:text-white transition-colors">
                    System Health
                  </a>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Platform Login
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-white transition-colors">
                    Create Account
                  </Link>
                </li>
              </ul>
            </div>

            {/* The 6 Worlds */}
            <div className="space-y-3 font-mono">
              <div className="text-white font-semibold text-xs tracking-wider uppercase">System Worlds</div>
              <ul className="space-y-2 text-xs text-zinc-300">
                <li>01 3WM SONIK LABS</li>
                <li>02 HoloKai</li>
                <li>03 Yurrheeler AI</li>
                <li>04 KappaXchangefin</li>
                <li>05 VYRA LABS</li>
                <li>06 Rental Paradise</li>
              </ul>
            </div>
          </div>

          <div className="mt-14 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-300 font-mono">
            <div>© 2026 FEEXSYSTEMS. Build better systems faster. Canonical reality holds facts.</div>
            <div className="flex items-center gap-6">
              <span>Persona Digital OS</span>
              <span>All Rights Reserved</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 23. FLOATING TECHNICAL APPLE DOCK */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto hidden sm:block">
        <AppleDock />
      </div>
    </div>
  );
}
