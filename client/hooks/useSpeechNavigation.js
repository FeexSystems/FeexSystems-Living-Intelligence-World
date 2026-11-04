 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Browser voice navigation for Omni-Command.
 * Uses the Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 * No server round-trip — transcript is filled into the command bar.
 */

import { useCallback, useEffect, useRef, useState } from "react";

















function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  const w = window ;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) ;
}

 















export function useSpeechNavigation(options = {}) {
  const {
    lang = "en-US",
    autoSubmit = true,
    onFinalTranscript,
    onInterimTranscript,
  } = options;

  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);

  const recognitionRef = useRef(null);
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

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("listening");
      setErrorMessage(null);
      finalRef.current = "";
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = _optionalChain([result, 'access', _ => _[0], 'optionalAccess', _2 => _2.transcript]) || "";
        if (result.isFinal) final += text;
        else interim += text;
      }
      if (final) {
        finalRef.current = (finalRef.current + " " + final).trim();
        setTranscript(finalRef.current);
        _optionalChain([onInterimRef, 'access', _3 => _3.current, 'optionalCall', _4 => _4(finalRef.current)]);
      } else if (interim) {
        const display = (finalRef.current + " " + interim).trim();
        setTranscript(display);
        _optionalChain([onInterimRef, 'access', _5 => _5.current, 'optionalCall', _6 => _6(display)]);
      }
    };

    recognition.onerror = (event) => {
      const code = _optionalChain([event, 'optionalAccess', _7 => _7.error]) || "unknown";
      if (code === "not-allowed" || code === "service-not-allowed") {
        setStatus("denied");
        setErrorMessage("Microphone permission denied");
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
        _optionalChain([onFinalRef, 'access', _8 => _8.current, 'optionalCall', _9 => _9(text)]);
      }
      intentionalStop.current = false;
      setStatus((s) => (s === "denied" || s === "unsupported" ? s : "idle"));
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch (e2) {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, [lang, autoSubmit]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setTranscript("");
    finalRef.current = "";
    setErrorMessage(null);
    try {
      recognition.start();
    } catch (e3) {
      // Already started
      try {
        recognition.stop();
        recognition.start();
      } catch (e) {
        setStatus("error");
        setErrorMessage(e instanceof Error ? e.message : "Could not start recognition");
      }
    }
  }, []);

  const stop = useCallback(() => {
    intentionalStop.current = true;
    try {
      _optionalChain([recognitionRef, 'access', _10 => _10.current, 'optionalAccess', _11 => _11.stop, 'call', _12 => _12()]);
    } catch (e4) {
      /* ignore */
    }
    setStatus("idle");
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
    start,
    stop,
    toggle,
  };
}
