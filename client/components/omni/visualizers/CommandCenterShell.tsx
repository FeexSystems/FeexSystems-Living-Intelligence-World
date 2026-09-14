import React from "react";
import { CommandCenterShellProps } from "@shared/orchestration";
import { GraphVisualizer } from "./GraphVisualizer";
import { Link } from "react-router-dom";
import { ArrowRight, Activity, Target, Zap, Globe, Compass, BarChart, Box } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { MarketingDigitalTwin } from "../../webgl/MarketingDigitalTwin";
import { OrbitControls } from "@react-three/drei";
import { CampaignsShell } from "./shells/CampaignsShell";
import { SignalsShell } from "./shells/SignalsShell";
import { ContentShell } from "./shells/ContentShell";
import { AnalyticsShell } from "./shells/AnalyticsShell";
import { SyndicationShell } from "./shells/SyndicationShell";
import { Send } from "lucide-react";

export function CommandCenterShell({ shell, metadata, focusId }: CommandCenterShellProps) {
  
  // Shell configurations and headers
  const getShellDetails = () => {
    switch(shell) {
      case "CAMPAIGNS": return { title: "Campaign Intelligence", icon: Target, desc: "Active marketing campaigns and experiments" };
      case "CONTENT": return { title: "Content Asset Fabric", icon: Globe, desc: "Global content assets and evidence links" };
      case "SIGNALS": return { title: "Market Signals", icon: Activity, desc: "Ingested GitHub events and community signals" };
      case "ANALYTICS": return { title: "Performance Analytics", icon: BarChart, desc: "QIE, Clicks, and telemetry metrics" };
      case "NAVIGATOR": return { title: "Marketing Navigator", icon: Compass, desc: "Deep knowledge search across the World Model" };
      case "DIGITAL_TWIN": return { title: "Spatial Digital Twin", icon: Box, desc: "Real-time 3D topology of campaigns, assets, and products" };
      case "SYNDICATION": return { title: "Agentic Syndication", icon: Send, desc: "Automated content distribution across platforms" };
      default: return { title: `${shell} Command Center`, icon: Zap, desc: "Marketing operations overview" };
    }
  };

  const { title, icon: Icon, desc } = getShellDetails();

  // If the backend provided graph data in metadata, we render the GraphVisualizer
  const nodes = (metadata?.nodes as any[]) || [];
  const edges = (metadata?.edges as any[]) || [];

  return (
    <div className="w-full h-full flex flex-col bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden p-6 text-white shadow-2xl">
      {/* Shell Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-emerald-400">
            <Icon size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
            <p className="text-sm text-gray-400">{desc}</p>
          </div>
        </div>
        
        {/* Deep link into Navigator if applicable */}
        {focusId && (
          <Link 
            to={`/navigator?q=focus:${focusId}`}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm transition-all"
          >
            Inspect in Navigator
            <ArrowRight size={16} />
          </Link>
        )}
      </div>

      {/* Shell Content (Graph, 3D Twin, or Fallback) */}
      <div className="flex-1 relative min-h-0 bg-black/40 rounded-xl overflow-hidden border border-white/5">
        {shell === "DIGITAL_TWIN" ? (
          <div className="absolute inset-0">
            <Canvas camera={{ position: [0, 0, 30], fov: 60 }}>
              <MarketingDigitalTwin />
              <OrbitControls makeDefault />
            </Canvas>
          </div>
        ) : shell === "CAMPAIGNS" ? (
          <CampaignsShell nodes={nodes} />
        ) : shell === "SIGNALS" ? (
          <SignalsShell />
        ) : shell === "CONTENT" ? (
          <ContentShell nodes={nodes} />
        ) : shell === "ANALYTICS" ? (
          <AnalyticsShell />
        ) : shell === "SYNDICATION" ? (
          <SyndicationShell nodes={nodes} />
        ) : nodes.length > 0 ? (
          <GraphVisualizer 
            nodes={nodes} 
            edges={edges} 
            focusNodeId={focusId}
            layout="hierarchical"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Awaiting structural data from World Model...</p>
          </div>
        )}
      </div>
    </div>
  );
}
