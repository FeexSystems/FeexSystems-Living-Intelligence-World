import { useState } from 'react';
import { GlobestudioGlobe } from '@/components/GlobestudioGlobe';
import { Globe, Network } from 'lucide-react';

export interface GlobeViewProps {
  /** Whether to show the globe view */
  isActive: boolean;
  /** Callback when view changes */
  onViewChange?: (view: 'galaxy' | 'globe') => void;
}

/**
 * GlobeView - A Globestudio-powered globe visualization that can be used
 * as an alternative view to the 3D galaxy in SpatialWorld.
 *
 * Features:
 * - Dotted world map with 21 different looks
 * - Configurable regions and colors
 * - Can be used as background or overlay
 */
export function GlobeView({ isActive, onViewChange }: GlobeViewProps) {
  const [selectedLook, setSelectedLook] = useState<'default' | 'crt' | 'topographic' | 'vapor'>('default');
  const [selectedRegion, setSelectedRegion] = useState<'world' | 'continent:Europe' | 'continent:Asia' | 'country:USA' | 'country:JPN'>('world');

  const looks = [
    { id: 'default', name: 'Default', description: 'Clean cartography' },
    { id: 'crt', name: 'CRT', description: 'Phosphor glow' },
    { id: 'topographic', name: 'Topographic', description: 'Sonar rings' },
    { id: 'vapor', name: 'Vapor', description: 'Synthwave horizon' },
  ] as const;

  const regions = [
    { id: 'world', name: 'World' },
    { id: 'continent:Europe', name: 'Europe' },
    { id: 'continent:Asia', name: 'Asia' },
    { id: 'country:USA', name: 'USA' },
    { id: 'country:JPN', name: 'Japan' },
  ] as const;

  const getConfig = () => {
    const configs = {
      default: {
        v: 3,
        selection: selectedRegion,
        dotColor: '#00ff66',
        backgroundStyle: 'transparent',
        autoSpin: true,
      },
      crt: {
        v: 3,
        selection: selectedRegion,
        dotColor: '#00ff00',
        backgroundStyle: 'transparent',
        autoSpin: true,
      },
      topographic: {
        v: 3,
        selection: selectedRegion,
        dotColor: '#ff6b6b',
        backgroundStyle: 'transparent',
        autoSpin: true,
      },
      vapor: {
        v: 3,
        selection: selectedRegion,
        dotColor: '#a855f7',
        backgroundStyle: 'transparent',
        autoSpin: true,
      },
    };
    return JSON.stringify(configs[selectedLook]);
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-10 bg-black/90 backdrop-blur-sm">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-20">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Globe className="w-6 h-6 text-[#00ff66]" />
            <h2 className="text-xl font-bold text-white font-mono">GLOBE VIEW</h2>
          </div>
          <button
            onClick={() => onViewChange?.('galaxy')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-mono text-sm transition-colors"
          >
            <Network className="w-4 h-4 inline mr-2" />
            GALAXY VIEW
          </button>
        </div>
      </div>

      {/* Globe Display */}
      <div className="absolute inset-0 flex items-center justify-center p-8 pt-20">
        <div className="w-full max-w-4xl h-[60vh]">
          <GlobestudioGlobe
            look={selectedLook}
            config={getConfig()}
            height="100%"
            width="100%"
            title={`World Model Globe - ${selectedLook} look`}
            className="rounded-lg overflow-hidden border border-white/10"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Look Selection */}
          <div>
            <label className="text-white/70 text-xs font-mono mb-2 block">SELECT LOOK</label>
            <div className="flex gap-2 flex-wrap">
              {looks.map((look) => (
                <button
                  key={look.id}
                  onClick={() => setSelectedLook(look.id)}
                  className={`px-3 py-2 rounded-lg font-mono text-xs transition-colors ${
                    selectedLook === look.id
                      ? 'bg-[#00ff66] text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={look.description}
                >
                  {look.name}
                </button>
              ))}
            </div>
          </div>

          {/* Region Selection */}
          <div>
            <label className="text-white/70 text-xs font-mono mb-2 block">SELECT REGION</label>
            <div className="flex gap-2 flex-wrap">
              {regions.map((region) => (
                <button
                  key={region.id}
                  onClick={() => setSelectedRegion(region.id)}
                  className={`px-3 py-2 rounded-lg font-mono text-xs transition-colors ${
                    selectedRegion === region.id
                      ? 'bg-[#00ff66] text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {region.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GlobeView;
