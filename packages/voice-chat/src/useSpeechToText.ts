import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechToTextError =
  | "not_supported"
  | "permission_denied"
  | "no_speech"
  | "network"
  | "aborted"
  | "unknown";

export type UseSpeechToTextOptions = {
  /** BCP-47, default zh-CN */
  lang?: string;
  /** When true, recognition keeps running until stop() */
  continuous?: boolean;
  /** Called once when recognition ends, with full normalized text (may be empty) */
  onSessionEnd?: (text: string) => void;
};

export type UseSpeechToTextReturn = {
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  finalTranscript: string;
  error: SpeechToTextError | null;
  errorMessage: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
};

function getRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function mapError(code: string): SpeechToTextError {
  if (code === "not-allowed" || code === "service-not-allowed") return "permission_denied";
  if (code === "no-speech") return "no_speech";
  if (code === "network") return "network";
  if (code === "aborted") return "aborted";
  return "unknown";
}

function userFacingMessage(err: SpeechToTextError): string {
  switch (err) {
    case "not_supported":
      return "当前浏览器不支持语音识别。请使用谷歌浏览器，或改用文字输入。";
    case "permission_denied":
      return "麦克风权限被拒绝。请在地址栏旁允许麦克风后重试。";
    case "no_speech":
      return "未检测到语音，请靠近麦克风再试。";
    case "network":
      return "语音识别需要网络。请检查连接后重试。";
    case "aborted":
      return "识别已取消。";
    default:
      return "语音识别出错，请重试或使用文字输入。";
  }
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Web Speech API 封装：实时/准实时转写，支持 start/stop/reset。
 * 推荐 Chrome（HTTPS 或 localhost）。
 */
export function useSpeechToText(options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  const { lang = "zh-CN", continuous = true, onSessionEnd } = options;
  const onSessionEndRef = useRef(onSessionEnd);
  onSessionEndRef.current = onSessionEnd;

  const [isSupported] = useState(() => getRecognitionCtor() !== null);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<SpeechToTextError | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const sessionFinalRef = useRef("");
  const interimRef = useRef("");

  const reset = useCallback(() => {
    setInterimTranscript("");
    setFinalTranscript("");
    sessionFinalRef.current = "";
    interimRef.current = "";
    setError(null);
    setErrorMessage(null);
  }, []);

  const stop = useCallback(() => {
    const r = recognitionRef.current;
    if (r) {
      try {
        r.stop();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("not_supported");
      setErrorMessage(userFacingMessage("not_supported"));
      return;
    }

    setError(null);
    setErrorMessage(null);
    setInterimTranscript("");
    setFinalTranscript("");
    sessionFinalRef.current = "";
    interimRef.current = "";

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let finalChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalChunk += text;
        } else {
          interim += text;
        }
      }

      if (finalChunk) {
        const sep =
          sessionFinalRef.current && !/\s$/.test(sessionFinalRef.current) ? " " : "";
        sessionFinalRef.current = (sessionFinalRef.current + sep + finalChunk).replace(
          /\s+/g,
          " "
        );
        setFinalTranscript(sessionFinalRef.current.trim());
      }
      interimRef.current = interim.trim();
      setInterimTranscript(interimRef.current);
    };

    recognition.onerror = (ev: SpeechRecognitionErrorEvent) => {
      const mapped = mapError(ev.error);
      setError(mapped);
      setErrorMessage(userFacingMessage(mapped));
      setIsListening(false);
    };

    recognition.onend = () => {
      if (interimRef.current) {
        const sep =
          sessionFinalRef.current && !/\s$/.test(sessionFinalRef.current) ? " " : "";
        sessionFinalRef.current = (sessionFinalRef.current + sep + interimRef.current).replace(
          /\s+/g,
          " "
        );
        setFinalTranscript(sessionFinalRef.current.trim());
      }
      interimRef.current = "";
      setInterimTranscript("");
      setIsListening(false);
      const full = normalizeWhitespace(sessionFinalRef.current);
      onSessionEndRef.current?.(full);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setError("unknown");
      setErrorMessage(userFacingMessage("unknown"));
      setIsListening(false);
    }
  }, [lang, continuous]);

  useEffect(() => {
    return () => {
      const r = recognitionRef.current;
      if (r) {
        try {
          r.abort();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimTranscript,
    finalTranscript,
    error,
    errorMessage,
    start,
    stop,
    reset,
  };
}
