import { useCallback, useEffect, useRef, useState } from "react";
import { sanitizeMessage } from "./utils";
import { useSpeechToText } from "./useSpeechToText";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  source?: "text" | "voice";
};

function replyForUserText(userText: string): string {
  const t = userText.slice(0, 200);
  return `（文字回复演示）已收到：「${t}」\n\n接入真实对话时，把此处替换为你的 API 或 Agent 调用即可。`;
}

export function ChatApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "你好。点击下方麦克风可说中文，转写后会填入输入框；勾选「语音结束自动发送」将直接发出并显示我的文字回复。建议 Chrome + HTTPS 或 localhost。",
    },
  ]);
  const [input, setInput] = useState("");
  const [autoSendAfterVoice, setAutoSendAfterVoice] = useState(true);
  const autoSendRef = useRef(autoSendAfterVoice);
  autoSendRef.current = autoSendAfterVoice;

  const sendUserMessage = useCallback((raw: string, source: "text" | "voice") => {
    const text = sanitizeMessage(raw);
    if (!text) return;
    const id = crypto.randomUUID();
    setMessages((m) => [...m, { id, role: "user", content: text, source }]);
    const replyId = crypto.randomUUID();
    const reply = replyForUserText(text);
    setMessages((m) => [...m, { id: replyId, role: "assistant", content: reply }]);
  }, []);

  const handleSend = useCallback(() => {
    const text = sanitizeMessage(input);
    if (!text) return;
    sendUserMessage(text, "text");
    setInput("");
  }, [input, sendUserMessage]);

  const onVoiceSessionEnd = useCallback(
    (spoken: string) => {
      const chunk = sanitizeMessage(spoken);
      if (!chunk) return;
      setInput((prev) => {
        const merged = sanitizeMessage(`${prev} ${chunk}`);
        if (!merged) return prev;
        if (autoSendRef.current) {
          queueMicrotask(() => {
            sendUserMessage(merged, "voice");
            setInput("");
          });
          return prev;
        }
        return merged;
      });
    },
    [sendUserMessage]
  );

  const speech = useSpeechToText({
    lang: "zh-CN",
    continuous: true,
    onSessionEnd: onVoiceSessionEnd,
  });

  const toggleMic = useCallback(() => {
    if (!speech.isSupported) return;
    if (speech.isListening) speech.stop();
    else speech.start();
  }, [speech]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        toggleMic();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleMic]);

  return (
    <div className="vc-shell">
      <header className="vc-header">
        <h1 className="vc-title">语音输入 · 文字回复</h1>
        <p className="vc-sub">Web Speech API · 麦克风仅用于浏览器内转写</p>
      </header>

      <div className="vc-messages" role="log" aria-live="polite">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`vc-bubble vc-bubble--${msg.role}`}
            data-source={msg.source}
          >
            <div className="vc-bubble-meta">
              {msg.role === "user" ? "你" : "助手"}
              {msg.source === "voice" ? " · 语音" : msg.source === "text" ? " · 文字" : ""}
            </div>
            <div className="vc-bubble-text">{msg.content}</div>
          </div>
        ))}
      </div>

      {speech.errorMessage ? (
        <div className="vc-banner vc-banner--error" role="alert">
          {speech.errorMessage}
        </div>
      ) : null}

      {!speech.isSupported ? (
        <div className="vc-banner">
          当前环境不支持浏览器语音识别。请换用 <strong>Google Chrome</strong>，或使用下方文字输入。
        </div>
      ) : null}

      {speech.isListening ? (
        <div className="vc-banner vc-banner--listening">
          正在聆听…（ interim：{speech.interimTranscript || "…"} ）
        </div>
      ) : null}

      <div className="vc-composer">
        <textarea
          className="vc-input"
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入文字，或点击麦克风说话…"
          aria-label="消息输入"
        />
        <div className="vc-row">
          <label className="vc-check">
            <input
              type="checkbox"
              checked={autoSendAfterVoice}
              onChange={(e) => setAutoSendAfterVoice(e.target.checked)}
            />
            语音结束自动发送
          </label>
          <span className="vc-hint">快捷键：Ctrl+M 开始/停止</span>
        </div>
        <div className="vc-actions">
          <button
            type="button"
            className={`vc-btn vc-btn--mic ${speech.isListening ? "vc-btn--active" : ""}`}
            onClick={toggleMic}
            disabled={!speech.isSupported}
            title={speech.isListening ? "停止" : "开始语音识别"}
            aria-pressed={speech.isListening}
          >
            {speech.isListening ? "停止" : "麦克风"}
          </button>
          <button type="button" className="vc-btn vc-btn--secondary" onClick={() => speech.reset()}>
            清空转写
          </button>
          <button type="button" className="vc-btn vc-btn--primary" onClick={handleSend}>
            发送
          </button>
        </div>
      </div>

      <footer className="vc-footer">
        后续可接 TTS（朗读助手回复）或云端 STT；本页为最小可用演示。
      </footer>
    </div>
  );
}
