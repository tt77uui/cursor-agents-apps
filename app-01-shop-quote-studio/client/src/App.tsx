import { useCallback, useEffect, useMemo, useState } from "react";

type TemplateField = { id: string; label: string; placeholder?: string };
type Template = {
  id: string;
  name: string;
  description: string;
  proOnly: boolean;
  disclaimer: string;
  fields: TemplateField[];
};

type Quote = {
  id: string;
  title: string;
  templateId: string;
  payload: { templateId: string; values: Record<string, string> };
  createdAt: string;
  updatedAt: string;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export function App() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [meta, setMeta] = useState<{
    proUnlocked: boolean;
    exportCountToday: number;
    exportLimitFree: number;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [title, setTitle] = useState<string>("新报价单");
  const [values, setValues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string>("");
  const [unlockCode, setUnlockCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId),
    [templates, selectedId]
  );

  const loadAll = useCallback(async () => {
    setErr("");
    const [tRes, qRes, mRes] = await Promise.all([
      api<{ templates: Template[] }>("/api/templates"),
      api<{ quotes: Quote[] }>("/api/quotes"),
      api<{
        proUnlocked: boolean;
        exportCountToday: number;
        exportLimitFree: number;
      }>("/api/meta"),
    ]);
    setTemplates(tRes.templates);
    setQuotes(qRes.quotes);
    setMeta(mRes);
  }, []);

  useEffect(() => {
    loadAll().catch((e: Error) => setErr(e.message));
  }, [loadAll]);

  useEffect(() => {
    if (!selectedId && templates[0]) setSelectedId(templates[0].id);
  }, [templates, selectedId]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const next: Record<string, string> = {};
    for (const f of selectedTemplate.fields) next[f.id] = "";
    setValues(next);
    setPreview(`${selectedTemplate.disclaimer}\n\n（填写字段后导出可生成完整文本）`);
  }, [selectedTemplate]);

  async function onSave() {
    if (!selectedTemplate) return;
    setBusy(true);
    setErr("");
    try {
      const body = { title, templateId: selectedTemplate.id, values };
      await api("/api/quotes", { method: "POST", body: JSON.stringify(body) });
      await loadAll();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onUnlock() {
    setBusy(true);
    setErr("");
    try {
      await api("/api/unlock", { method: "POST", body: JSON.stringify({ code: unlockCode }) });
      setUnlockCode("");
      await loadAll();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onExportLast() {
    const last = quotes[0];
    if (!last) {
      setErr("还没有保存任何报价单");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/quotes/${last.id}/export`, {
        method: "POST",
        headers: { Accept: "text/plain" },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const text = await res.text();
      setPreview(text);
      await loadAll();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    setBusy(true);
    setErr("");
    try {
      await api(`/api/quotes/${id}`, { method: "DELETE" });
      await loadAll();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <div style={{ fontWeight: 700 }}>报价单工坊</div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
            小商家报价/收据模板草稿（非法律意见）
          </div>
        </div>
        <div className="row">
          <span className="badge">
            专业版：{meta?.proUnlocked ? "已解锁" : "未解锁"} · 今日导出{" "}
            {meta?.exportCountToday ?? "-"} / {meta?.proUnlocked ? "∞" : meta?.exportLimitFree}
          </span>
          <button className="primary" onClick={() => loadAll()} disabled={busy}>
            刷新
          </button>
        </div>
      </header>

      {err ? (
        <div className="banner error" style={{ borderStyle: "solid" }}>
          {err}
        </div>
      ) : null}

      <div className="grid grid-2">
        <section className="card">
          <h3 style={{ marginTop: 0 }}>新建 / 编辑模板字段</h3>
          <label>模板</label>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.proOnly ? "（专业版）" : ""}
              </option>
            ))}
          </select>

          <div style={{ height: 12 }} />

          <label>标题（列表显示）</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />

          {selectedTemplate?.fields.map((f) => (
            <div key={f.id} style={{ marginTop: 10 }}>
              <label>{f.label}</label>
              <input
                placeholder={f.placeholder}
                value={values[f.id] ?? ""}
                onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
              />
            </div>
          ))}

          <div className="row" style={{ marginTop: 12 }}>
            <button className="primary" onClick={onSave} disabled={busy}>
              保存到本地列表
            </button>
            <button onClick={onExportLast} disabled={busy}>
              导出最新一条（文本）
            </button>
          </div>

          <div className="banner">{selectedTemplate?.disclaimer}</div>
        </section>

        <section className="card">
          <h3 style={{ marginTop: 0 }}>解锁专业版 / 预览</h3>
          <label>解锁码（演示环境；上线后由已授权支付发码）</label>
          <div className="row">
            <input value={unlockCode} onChange={(e) => setUnlockCode(e.target.value)} />
            <button className="primary" onClick={onUnlock} disabled={busy}>
              解锁
            </button>
          </div>

          <label style={{ marginTop: 12 }}>预览</label>
          <textarea value={preview} readOnly />

          <div className="ad-slot">
            非侵入式横幅广告位（演示文案）：同城工具推荐位可接联盟物料；禁止弹窗。
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>已保存</h3>
        <div className="list">
          {quotes.length === 0 ? <div className="banner">暂无记录</div> : null}
          {quotes.map((q) => (
            <div key={q.id} className="item">
              <div>
                <div style={{ fontWeight: 600 }}>{q.title}</div>
                <small>
                  {q.templateId} · 更新 {new Date(q.updatedAt).toLocaleString()}
                </small>
              </div>
              <button onClick={() => onDelete(q.id)} disabled={busy}>
                删除
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
