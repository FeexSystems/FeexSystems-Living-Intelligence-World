/**
 * Browser voice navigation for Omni-Command.
 * Uses the Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 * No server round-trip — transcript is filled into the command bar.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { isPermissionRevoked, type PermissionState } from "../../packages/feex-eil/contracts/perception-event";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as SpeechRecognitionCtor | null;
}

export type VoiceStatus =
  | "idle"
  | "listening"
  | "processing"
  | "unsupported"
  | "denied"
  | "error";

export type SpeechPermissionState = "unknown" | "prompt" | "granted" | "denied" | "revoked" | "error" | "unsupported";

export interface UseSpeechNavigationOptions {
  lang?: string;
  /** When true, call onFinalTranscript when recognition ends with a final result */
  autoSubmit?: boolean;
  onFinalTranscript?: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
}

export function useSpeechNavigation(options: UseSpeechNavigationOptions = {}) {
  const {
    lang = "en-US",
    autoSubmit = true,
    onFinalTranscript,
    onInterimTranscript,
  } = options;

  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<SpeechPermissionState>("unknown");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  const intentionalStop = useRef(false);

  // Stable callbacks
  const onFinalRef = useRef(onFinalTranscript);
  const onInterimRef = useRef(onInterimTranscript);
  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
    onInterimRef.current = onInterimTranscript;
  }, [onFinalTranscript, onInterimTranscript]);

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      setStatus("unsupported");
      return;
    }
    setSupported(true);
    setPermissionState("unknown");

    let permissionStatus: PermissionStatus | null = null;
    let previousPermission: PermissionState | null = null;
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((status) => {
          permissionStatus = status;
          const next = status.state.toUpperCase() as PermissionState;
          previousPermission = next;
          setPermissionState(next === "GRANTED" ? "granted" : next === "PROMPT" ? "prompt" : "denied");
          status.onchange = () => {
            const current = status.state.toUpperCase() as PermissionState;
            if (current === "DENIED" && previousPermission === "GRANTED") {
              setPermissionState("revoked");
              setStatus("denied");
              setErrorMessage("Microphone permission was revoked");
            } else {
              setPermissionState(current === "GRANTED" ? "granted" : current === "PROMPT" ? "prompt" : "denied");
            }
            previousPermission = current;
          };
        })
        .catch(() => setPermissionState("unknown"));
    }

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (permissionState === "revoked" || permissionState === "denied") {
        setStatus("denied");
        setErrorMessage("Microphone permission is not granted");
        return;
      }
      setPermissionState("granted");
      setStatus("listening");
      setErrorMessage(null);
      finalRef.current = "";
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript || "";
        if (result.isFinal) final += text;
        else interim += text;
      }
      if (final) {
        finalRef.current = (finalRef.current + " " + final).trim();
        setTranscript(finalRef.current);
        onInterimRef.current?.(finalRef.current);
      } else if (interim) {
        const display = (finalRef.current + " " + interim).trim();
        setTranscript(display);
        onInterimRef.current?.(display);
      }
    };

    recognition.onerror = (event: any) => {
      const code = event?.error || "unknown";
      if (code === "not-allowed" || code === "service-not-allowed") {
        setPermissionState("denied");
        setStatus("denied");
        setErrorMessage("Microphone permission denied");
      } else if (code === "audio-capture") {
        setPermissionState("error");
        setStatus("error");
        setErrorMessage("Microphone device is unavailable");
      } else if (code === "no-speech") {
        setStatus("idle");
        setErrorMessage("No speech detected");
      } else if (code === "aborted") {
        setStatus("idle");
      } else {
        setStatus("error");
        setErrorMessage(`Speech error: ${code}`);
      }
    };

    recognition.onend = () => {
      const text = finalRef.current.trim();
      if (text && autoSubmit && !intentionalStop.current) {
        setStatus("processing");
        onFinalRef.current?.(text);
      }
      intentionalStop.current = false;
      setStatus((s) => (s === "denied" || s === "unsupported" || s === "error" ? s : "idle"));
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, [lang, autoSubmit]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setTranscript("");
    finalRef.current = "";
    setErrorMessage(null);
    if (status === "listening") return;
    try {
      recognition.start();
    } catch (e) {
      setStatus("error");
      setErrorMessage(e instanceof Error ? e.message : "Could not start recognition");
    }
  }, [status]);

  const stop = useCallback(() => {
    intentionalStop.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    if (status === "listening") stop();
    else start();
  }, [status, start, stop]);

  return {
    supported,
    status,
    isListening: status === "listening",
    transcript,
    errorMessage,
    permissionState,
    permissionDenied: isPermissionRevoked(
      permissionState === "denied" || permissionState === "revoked" || permissionState === "error"
        ? permissionState === "revoked" ? "REVOKED" : permissionState === "error" ? "ERROR" : "DENIED"
        : permissionState === "granted" ? "GRANTED" : "PROMPT",
    ),
    start,
    stop,
    toggle,
  };
}
