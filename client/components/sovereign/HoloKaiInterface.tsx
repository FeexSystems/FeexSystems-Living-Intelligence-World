import "react";
import { HoloKaiVoiceModal } from "./HoloKaiVoiceModal";
import type { EILAgentRuntime } from "../../lib/eil/useEILAgentRuntime";

interface HoloKaiInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  activeEcosystem?: string;
  eilRuntime?: EILAgentRuntime;
}

export function HoloKaiInterface(props: HoloKaiInterfaceProps) {
  return <HoloKaiVoiceModal {...props} />;
}

export default HoloKaiInterface;
