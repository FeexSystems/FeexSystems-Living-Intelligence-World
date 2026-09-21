import React from "react";
import { HoloKaiVoiceModal } from "./HoloKaiVoiceModal";

interface HoloKaiInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  activeEcosystem?: string;
}

export function HoloKaiInterface(props: HoloKaiInterfaceProps) {
  return <HoloKaiVoiceModal {...props} />;
}

export default HoloKaiInterface;
