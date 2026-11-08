import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Search, Eye, Network, Cpu } from "lucide-react";
import { CinematicScene } from "../components/CinematicScene";
import { cn } from "@/lib/utils";
import { Zap, Target, Activity, Users, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import type { MarketingNavigatorAnswer } from "../../../shared/marketing-contracts";
import type { SceneId } from "../registry/landingAssets";

export interface CoreSystemsSceneProps {
  onSelectScene?: (sceneId: SceneId, targetIndex: number) => void;
}

interface CoreSystemsState {
  loading: boolean;
  navigatorData: MarketingNavigatorAnswer | null;
  error: string | null;
  useTemplate: boolean;
}

/**
 * AI Core Mission Services Showcase — Template Response
 */
function getTemplateResponse(): MarketingNavigatorAnswer {
  return {
    version: "1.0",
    query: "ai core mission services",
    answer: "FeexSystems AI Core delivers five mission-aligned products that turn engineering evidence into an explorable World Model with Semantic Claim Search, Provider-Neutral LLM Abstraction, Graph-Enhanced Recommendations, Grounded Answer Generation, and Evidence Fabric Ledger provenance.",
    grounded: false,
    provider: "template",
    claims: [
      { id: "claim-operations", statement: "Operations (Mission 001) provides provider-neutral AI orchestration", confidence: 0.96, productId: "operations", evidenceCount: 5 },
      { id: "claim-shared-platform", statement: "Shared Platform (Mission 002) establishes Team-based RBAC", confidence: 0.94, productId: "shared-platform", evidenceCount: 4 },
      { id: "claim-world-intelligence", statement: "World Intelligence (Mission 003) separates canonical facts", confidence: 0.93, productId: "world-intelligence", evidenceCount: 3 },
      { id: "claim-domain-products", statement: "RentAll + FarmPlug (Mission 004) deliver domain products", confidence: 0.91, productId: "domain-products", evidenceCount: 4 },
      { id: "claim-knowledge", statement: "Knowledge (Mission 005) provides Document AI with SHA-256 hashing", confidence: 0.92, productId: "knowledge", evidenceCount: 5 },
    ],
    contentAssets: [
      { id: "asset-001", title: "Mission 001 — AI Operations", type: "document", state: "PUBLISHED" },
      { id: "asset-002", title: "Mission 002 — Shared AI Core", type: "document", state: "PUBLISHED" },
      { id: "asset-003", title: "Mission 003 — World Intelligence", type: "document", state: "PUBLISHED" },
      { id: "asset-004", title: "Mission 004 — RentAll + FarmPlug", type: "document", state: "PUBLISHED" },
      { id: "asset-005", title: "Mission 005 — Knowledge & Document AI", type: "document", state: "PUBLISHED" },
    ],
    campaigns: [
      { id: "campaign-ai-core", name: "AI Core Launch", description: "Five mission-aligned products delivering AI intelligence" },
      { id: "campaign-tenant-isolation", name: "Tenant Isolation", description: "Team-based RBAC across all products" },
    ],
    recommendations: [
      { id: "rec-operations", kind: "OPPORTUNITY", title: "Explore Feex AI Operations", rationale: "Provider-neutral orchestration", confidence: 0.94, graphPath: [{ id: "mission-001", type: "project", label: "Mission 001" }], evidence: [] },
      { id: "rec-shared-platform", kind: "OPPORTUNITY", title: "Explore Shared AI Core", rationale: "Tenant isolation", confidence: 0.92, graphPath: [{ id: "mission-002", type: "project", label: "Mission 002" }], evidence: [] },
      { id: "rec-world-intelligence", kind: "OPPORTUNITY", title: "Explore World Intelligence", rationale: "World Model interpretation", confidence: 0.91, graphPath: [{ id: "mission-003", type: "project", label: "Mission 003" }], evidence: [] },
      { id: "rec-domain-products", kind: "OPPORTUNITY", title: "Explore RentAll + FarmPlug", rationale: "Domain products", confidence: 0.90, graphPath: [], evidence: [] },
      { id: "rec-knowledge", kind: "OPPORTUNITY", title: "Explore Knowledge & Document AI", rationale: "Document AI", confidence: 0.89, graphPath: [], evidence: [] },
    ],
    suggestions: [],
  };
}

interface Product {
  id: string;
  missionId: string;
  title: string;
  description: string;
  category: "OPERATIONS" | "SHARED PLATFORM" | "WORLD INTELLIGENCE" | "DOMAIN PRODUCTS" | "KNOWLEDGE";
  icon: React.ReactNode;
  color: string;
  features: string[];
  status: string;
}

// Product category mapping
function getProductCategory(productId: string): Product["category"] {
  switch (productId) {
    case "operations":
      return "OPERATIONS";
    case "shared-platform":
      return "SHARED PLATFORM";
    case "world-intelligence":
      return "WORLD INTELLIGENCE";
    case "domain-products":
      return "DOMAIN PRODUCTS";
    case "knowledge":
      return "KNOWLEDGE";
    default:
      return "OPERATIONS";
  }
}

function getProductCategories(): Product["category"][] {
  return ["OPERATIONS", "SHARED PLATFORM", "WORLD INTELLIGENCE", "DOMAIN PRODUCTS", "KNOWLEDGE"];
}

/** Particle effect component */
function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number }>>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = 500;
    };

    const initParticles = () => {
      particlesRef.current = Array.from({ length: 80 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
      }));
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.fill();

        particlesRef.current.forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * (1 - dist / 100)})`;
            ctx.stroke();
          }
        });
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    initParticles();
    animate();
    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" style={{ background: "transparent" }} />;
}

/** SVG Relationship Graph — showing product topology with central AI Core */
function RelationshipGraph({
  products,
  selectedProductId,
  onSelectProduct,
}: {
  products: Product[];
  selectedProductId: string | null;
  onSelectProduct: (id: string | null) => void;
}) {
  const centerX = 400;
  const centerY = 200;
  const radius = 150;

  const getPosition = (index: number) => {
    const angle = (index * 2 * Math.PI) / products.length - Math.PI / 2;
    return { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
  };

  return (
    <div
      className="relative w-full bg-black/20 rounded-2xl border border-white/20 overflow-hidden backdrop-blur-sm"
      style={{ height: 400 }}
      data-testid="relationship-graph"
    >
      <svg className="w-full h-full" viewBox="0 0 800 400">
        {/* Central AI CORE node */}
        <circle
          cx={centerX}
          cy={centerY}
          r="40"
          fill="#1a1a2e"
          stroke="#808080"
          strokeWidth="2"
        />
        <text
          x={centerX}
          y={centerY + 5}
          textAnchor="middle"
          fill="white"
          fontSize="10"
          fontFamily="monospace"
          fontWeight="600"
        >
          AI CORE
        </text>

        {/* Dashed lines from center to products */}
        {products.map((_, index) => {
          const pos = getPosition(index);
          return (
            <line
              key={`line-${index}`}
              x1={centerX}
              y1={centerY}
              x2={pos.x}
              y2={pos.y}
              stroke="#808080"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.5"
            />
          );
        })}

        {/* Product nodes */}
        {products.map((product, index) => {
          const pos = getPosition(index);
          const isSelected = selectedProductId === product.id;
          return (
            <g key={product.id}>
              {/* Product node circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="35"
                fill={product.color}
                stroke={isSelected ? "white" : "white"}
                strokeWidth={isSelected ? 2 : 1}
                opacity={isSelected ? 1 : 0.8}
                className="cursor-pointer transition-all"
                onClick={() => onSelectProduct(isSelected ? null : product.id)}
                style={{ filter: isSelected ? "drop-shadow(0 0 15px rgba(255,255,255,0.8))" : "none" }}
              />

              {/* Mission label above node */}
              <text
                x={pos.x}
                y={pos.y - 50}
                textAnchor="middle"
                fill="white"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="500"
              >
                {product.missionId}
              </text>

              {/* Product name inside node */}
              <text
                x={pos.x}
                y={pos.y + 4}
                textAnchor="middle"
                fill="white"
                fontSize="8"
                fontFamily="monospace"
              >
                {product.title.split(" ")[0]}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex gap-4" data-testid="topology-legend">
        {products.slice(0, 2).map((product) => (
          <div key={product.id} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: product.color }}
            />
            <span className="text-[10px] text-white/60 font-mono uppercase">
              {product.missionId}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Product carousel with sliding cards */
function ProductCarousel({
  products,
  selectedProductId,
}: {
  products: Product[];
  selectedProductId: string | null;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerView =
    typeof window !== "undefined" && window.innerWidth < 768 ? 1 : 3;
  const totalSlides = Math.ceil(products.length / itemsPerView);

  const nextSlide = () =>
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  const prevSlide = () =>
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  const goToSlide = (index: number) => setCurrentIndex(index);

  return (
    <div className="relative w-full">
      <div className="overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {Array.from({ length: totalSlides }).map((_, slideIndex) => (
            <div
              key={slideIndex}
              className="w-full flex-shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4 p-4"
            >
              {products
                .slice(
                  slideIndex * itemsPerView,
                  slideIndex * itemsPerView + itemsPerView
                )
                .map((product) => (
                  <article
                    key={product.id}
                    data-testid="product-card"
                    data-product-id={product.id}
                    className="group flex flex-col justify-between rounded-2xl border border-white/20 bg-black/40 p-5 backdrop-blur-xl transition-all duration-300 hover:bg-white/5 hover:border-white/50 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:-translate-y-1"
                  >
                    <div className="space-y-1">
                      <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/60">
                        {product.category}
                      </div>
                      <h3 className="text-lg font-light tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                        {product.title}
                      </h3>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                        {product.status}
                      </p>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {product.description}
                    </p>

                    <button
                      type="button"
                      className="mt-4 inline-flex items-center gap-2 self-start rounded-lg border border-white/20 bg-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/80 backdrop-blur-xs transition-all hover:bg-white/20 hover:border-white/60 hover:text-white hover:shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Inspect Product
                    </button>
                  </article>
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* Carousel controls */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-2">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-8 h-1 rounded-full transition-all duration-300",
                currentIndex === index
                  ? "bg-white/80 w-12 shadow-[0_0_15px_rgba(255,255,255,0.6)]"
                  : "bg-white/20 hover:bg-white/30"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={prevSlide}
            className="p-2 rounded-full border border-white/20 bg-black/40 text-white/70 hover:bg-white/10 hover:text-white transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextSlide}
            className="p-2 rounded-full border border-white/20 bg-black/40 text-white/70 hover:bg-white/10 hover:text-white transition-all"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

const AI_CORE_PRODUCTS: Product[] = [
  {
    id: "operations",
    missionId: "MISSION 001",
    title: "AI Operations",
    description: "Provider-neutral AI orchestration with idempotent workflow lifecycle.",
    category: "OPERATIONS",
    icon: <Activity className="h-5 w-5 text-white" />,
    color: "#a0a0a0",
    status: "60 FPS LOCKED",
    features: ["Idempotent workflows", "Tenant-scoped routing", "Deterministic fallback"],
  },
  {
    id: "shared-platform",
    missionId: "MISSION 002",
    title: "Shared Platform",
    description: "Tenant isolation with Team-based RBAC, AI gateway hardening.",
    category: "SHARED PLATFORM",
    icon: <Users className="h-5 w-5 text-white" />,
    color: "#909090",
    status: "PRODUCTION READY",
    features: ["Team RBAC", "AI gateway hardening", "Usage tracking"],
  },
  {
    id: "world-intelligence",
    missionId: "MISSION 003",
    title: "World Intelligence",
    description: "World Model interpretation layer separating canonical facts.",
    category: "WORLD INTELLIGENCE",
    icon: <Network className="h-5 w-5 text-white" />,
    color: "#808080",
    status: "BETA LAUNCH",
    features: ["Fact separation", "Evidence provenance", "Citation validation"],
  },
  {
    id: "domain-products",
    missionId: "MISSION 004",
    title: "RentAll + FarmPlug",
    description: "Domain products for property management and agriculture.",
    category: "DOMAIN PRODUCTS",
    icon: <Zap className="h-5 w-5 text-white" />,
    color: "#707070",
    status: "ACTIVE",
    features: ["Tenant-scoped APIs", "Nested ownership", "AI classification"],
  },
  {
    id: "knowledge",
    missionId: "MISSION 005",
    title: "Knowledge & Document AI",
    description: "Document AI with SHA-256 hashing and citation validation.",
    category: "KNOWLEDGE",
    icon: <FileText className="h-5 w-5 text-white" />,
    color: "#606060",
    status: "VERIFIED",
    features: ["SHA-256 hashing", "Prompt containment", "Citation validation"],
  },
];

export function CoreSystemsScene({ onSelectScene }: CoreSystemsSceneProps) {
  const [state, setState] = useState<CoreSystemsState>({
    loading: true,
    navigatorData: null,
    error: null,
    useTemplate: false,
  });
  const [category, setCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [showTopology, setShowTopology] = useState(true);

  // Fetch navigator data
  useEffect(() => {
    let isMounted = true;
    const fetchNavigatorData = async () => {
      try {
        const response = await fetch(
          "/api/marketing/navigator?q=ai%20core%20mission%20services"
        );
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const data = (await response.json()) as MarketingNavigatorAnswer;
        if (isMounted)
          setState({ loading: false, navigatorData: data, error: null, useTemplate: false });
      } catch (err) {
        if (isMounted)
          setState({
            loading: false,
            navigatorData: null,
            error: err instanceof Error ? err.message : "Unknown error",
            useTemplate: true,
          });
      }
    };
    void fetchNavigatorData();
    return () => {
      isMounted = false;
    };
  }, []);

  const displayData = state.useTemplate || !state.navigatorData
    ? getTemplateResponse()
    : state.navigatorData;

  // Filter products by category and search query
  const categories = useMemo(
    () => ["ALL", ...getProductCategories()],
    []
  );

  const filteredProducts = useMemo(() => {
    return AI_CORE_PRODUCTS.filter((product) => {
      const matchesCategory =
        category === "ALL" || product.category === category;
      const matchesQuery =
        query === "" ||
        product.title.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const totalProducts = AI_CORE_PRODUCTS.length;

  const getRecommendationSceneIndex = useCallback(
    (
      graphPath: (typeof displayData.recommendations)[0]["graphPath"]
    ): number => {
      return graphPath.some((entity) => entity.type === "project") ? 3 : 0;
    },
    []
  );

  const handleRecommendationClick = useCallback(
    (recommendation: (typeof displayData.recommendations)[0]) => {
      if (!onSelectScene) return;
      const sceneIndex = getRecommendationSceneIndex(recommendation.graphPath);
      const targetSceneId = [
        "hero",
        "galaxy",
        "systems",
        "worlds",
        "missions",
        "convergence",
        "ui-loops",
      ][sceneIndex] as SceneId;
      onSelectScene(targetSceneId, sceneIndex);
    },
    [onSelectScene, getRecommendationSceneIndex]
  );

  const getProductIcon = (productId: string | null) => {
    switch (productId) {
      case "operations":
        return (
          <Activity className="h-4 w-4 text-white/40 flex-shrink-0" />
        );
      case "shared-platform":
        return <Users className="h-4 w-4 text-white/40 flex-shrink-0" />;
      case "world-intelligence":
        return (
          <Network className="h-4 w-4 text-white/40 flex-shrink-0" />
        );
      case "domain-products":
        return <Zap className="h-4 w-4 text-white/40 flex-shrink-0" />;
      case "knowledge":
        return (
          <FileText className="h-4 w-4 text-white/40 flex-shrink-0" />
        );
      default:
        return <Cpu className="h-4 w-4 text-white/40 flex-shrink-0" />;
    }
  };

  return (
    <CinematicScene
      id="systems"
      title="CORE ARCHITECTURE"
      subtitle="Five AI Core products. Single tenancy boundary. Production-ready."
      videoSrc="/media/landing/scenes/systems.webm"
    >
      <div
        className="mt-8 w-full space-y-6"
        data-testid="core-systems-scene"
      >
        {/* Filter surface — category buttons and search */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="flex flex-wrap gap-2"
            data-testid="category-filters"
          >
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={cn(
                  "rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest transition-all duration-300 backdrop-blur-md",
                  category === item
                    ? "border-white/80 bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                    : "border-white/20 bg-black/40 text-white/60 hover:bg-white/10 hover:border-white/40 hover:text-white"
                )}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 backdrop-blur-md transition-all focus-within:border-white/50 focus-within:bg-white/10">
              <Search className="h-3.5 w-3.5 text-white/50" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter AI products"
                aria-label="Filter AI products"
                className="w-44 bg-transparent font-mono text-[10px] text-white outline-hidden placeholder:text-white/50"
              />
            </label>
            <button
              type="button"
              onClick={() => setShowTopology((value) => !value)}
              aria-pressed={showTopology}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest transition-all duration-300 backdrop-blur-md",
                showTopology
                  ? "border-white/80 bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                  : "border-white/20 bg-black/40 text-white/60 hover:bg-white/10 hover:border-white/40 hover:text-white"
              )}
            >
              <Network className="h-3.5 w-3.5" />
              {showTopology ? "Show list" : "Show topology"}
            </button>
          </div>
        </div>

        {/* SVG Topology Graph */}
        {showTopology && (
          <RelationshipGraph
            products={filteredProducts}
            selectedProductId={selectedProductId}
            onSelectProduct={setSelectedProductId}
          />
        )}

        {/* Grid of product cards */}
        <div
          data-testid="products-grid"
          data-visible-count={filteredProducts.length}
          data-total-count={totalProducts}
          className={cn(
            "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
            showTopology && "sr-only"
          )}
        >
          {filteredProducts.map((product) => (
            <article
              key={product.id}
              data-testid="product-node"
              data-product-id={product.id}
              className="group flex flex-col justify-between rounded-2xl border border-white/20 bg-black/40 p-5 backdrop-blur-xl transition-all duration-300 hover:bg-white/5 hover:border-white/50 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:-translate-y-1"
            >
              <div className="space-y-1">
                <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/60">
                  {product.category}
                </div>
                <h3 className="text-lg font-light tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  {product.title}
                </h3>
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                  {product.status}
                </p>
              </div>

              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {product.description}
              </p>

              <button
                type="button"
                onClick={() =>
                  setSelectedProductId(
                    selectedProductId === product.id ? null : product.id
                  )
                }
                className="mt-4 inline-flex items-center gap-2 self-start rounded-lg border border-white/20 bg-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/80 backdrop-blur-xs transition-all hover:bg-white/20 hover:border-white/60 hover:text-white hover:shadow-[0_0_10px_rgba(255,255,255,0.2)]"
              >
                <Eye className="h-3.5 w-3.5" />
                Inspect Product
              </button>
            </article>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <p
            data-testid="products-empty"
            className="py-10 text-center font-mono text-[10px] uppercase tracking-widest text-white/50"
          >
            No AI products match this filter.
          </p>
        )}

        {/* Carousel fallback */}
        {!showTopology && (
          <ProductCarousel
            products={filteredProducts}
            selectedProductId={selectedProductId}
          />
        )}

        {/* Answer section */}
        <article className="rounded-2xl border border-white/20 bg-black/40 p-6 backdrop-blur-xl transition-all duration-300 hover:bg-white/5 hover:border-white/50 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]">
          <div className="space-y-4">
<div className="flex items-center space-x-2 mb-3">
              <span className="text-white/90 font-mono text-[9px] uppercase tracking-widest">Grounded by:</span>
              <span className="text-white font-mono text-[9px] uppercase tracking-widest">
                {displayData.provider}{!displayData.grounded && " (template response)"}
              </span>
            </div>
            <h3 className="text-lg font-light tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {displayData.grounded ? "Grounded Answer" : "AI Core Overview"}
            </h3>
            <p className="text-sm leading-relaxed text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {displayData.answer}
            </p>
            {!displayData.grounded && (
              <p className="font-mono text-[9px] uppercase tracking-widest text-white/60">
                (template response)
              </p>
            )}
          </div>
        </article>

        {/* Claims section */}
        {displayData.claims.length > 0 && (
          <div className="space-y-3">
            <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/60">
              Supporting Claims
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {displayData.claims.map((claim) => (
                <article
                  key={claim.id}
                  className="group flex flex-col rounded-lg border border-white/20 bg-black/40 p-4 backdrop-blur-xl transition-all duration-300 hover:bg-white/5 hover:border-white/50 hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {claim.statement}
                    </p>
                    {getProductIcon(claim.productId ?? null)}
                  </div>
                  {claim.confidence !== undefined && (
                    <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-white/60">
                      Confidence:{" "}
                      <span className="text-white">
                        {(claim.confidence * 100).toFixed(0)}%
                      </span>
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations section */}
        {displayData.recommendations.length > 0 && (
          <div className="space-y-3">
            <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/60">
              Explore Products
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {displayData.recommendations.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => handleRecommendationClick(rec)}
                  disabled={!onSelectScene}
                  className={cn(
                    "group flex flex-col justify-between rounded-lg border bg-black/40 p-4 backdrop-blur-xl transition-all duration-300 text-left",
                    onSelectScene
                      ? "border-white/20 hover:bg-white/5 hover:border-white/50 hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] cursor-pointer"
                      : "border-white/20 cursor-default"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-light text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                        {rec.title}
                      </h4>
                      <Target className="h-4 w-4 text-white/40 flex-shrink-0" />
                    </div>
                    <p className="text-xs text-white/70">{rec.rationale}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-white/60">
                      {rec.kind}
                    </p>
                    <p className="font-mono text-[9px] text-white/60">
                      {(rec.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </CinematicScene>
  );
}


