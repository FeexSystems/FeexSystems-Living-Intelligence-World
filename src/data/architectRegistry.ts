export interface ArchitectProfile {
  id: string;
  alias: string;
  role: string;
  epithet: string;
  bio: string;
  resumeRepoUrl: string;
  pinnedCommitSha: string;
  observingVideoUrl: string;
  holokaiLinkVideoUrl: string;
  coreDomains: string[];
  authoredWorldsCount: number;
}

export const EMAR_THE_SCIENTIST: ArchitectProfile = {
  id: 'architect-emar',
  alias: 'EMAR THE SCIENTIST',
  role: 'FOUNDER · CHIEF SYSTEMS ARCHITECT · CREATOR OF FEEXSYSTEMS',
  epithet: 'ARCHITECT OF THE NINE CANONICAL WORLDS & HOLOKAI PLANETARY CORE',
  bio: 'Principal systems architect and AI researcher behind the FeexSystems Living Engineering Intelligence ecosystem, HoloKai cognitive uplink, and the nine sovereign domain worlds.',
  resumeRepoUrl: 'https://feexsystems.github.io/FEEXSYSTEMS-Persona-Digital-Portfolio/',
  pinnedCommitSha: '45c4ee03bfc61e7fdd0f2b50f0ab67da3a0ea4a2',
  observingVideoUrl: '/media/architect/scientist-observing-universe.mp4',
  holokaiLinkVideoUrl: '/media/architect/scientist-robot-eyes.mp4',
  coreDomains: [
    'Planetary World Model Architecture',
    'Provider-Neutral AI Orchestration',
    'Cryptographic Evidence & Provenance Ledgers',
    'Spatial WebGL & Cognitive Robotics (HoloKai)',
  ],
  authoredWorldsCount: 9,
};
