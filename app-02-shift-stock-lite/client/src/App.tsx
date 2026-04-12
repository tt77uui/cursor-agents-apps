import { useCallback, useEffect, useMemo, useState } from "react";

type Employee = { id: string; name: string; createdAt: string };
type Shift = {
  id: string;
  employeeId: string;
  employeeName: string;
  shiftDate: string;
  slot: string;
  note: string | null;
  createdAt: string;
};
type StockItem = {
  id: string;
  name: string;
  qty: number;
  threshold: number;
  unit: string;
  updatedAt: string;
};
type Alert = { id: string; name: string; qty: number; threshold: number; unit: string };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

function weekRange(anchor: string) {
  const d0 = new Date(`${anchor}T00:00:00`);
  const from = new Date(d0);
  from.setDate(from.getDate() - from.getDay());
  const to = new Date(from);
  to.setDate(to.getDate() + 6);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function App() {
  const [anchor, setAnchor] = useState(() => new Date().toISOString().slice(0, 10));
  const range = useMemo(() => weekRange(anchor), [anchor]);

  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const [empName, setEmpName] = useState("");
  const [shiftEmp, setShiftEmp] = useState("");
  const [shiftDate, setShiftDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState<"早班" | "中班" | "晚班" | "休息">("早班");
  const [stockName, setStockName] = useState("");
  const [stockQty, setStockQty] = useState("0");
  const [stockTh, setStockTh] = useState("0");
  const [unlock, setUnlock] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    const [m, e, s, st, a] = await Promise.all([
      api<Record<string, unknown>>("/api/meta"),
      api<{ employees: Employee[] }>("/api/employees"),
      api<{ shifts: Shift[] }>(`/api/shifts?from=${range.from}&to=${range.to}`),
      api<{ items: StockItem[] }>("/api/stock"),
      api<{ alerts: Alert[] }>("/api/alerts/low-stock"),
    ]);
    setMeta(m);
    setEmployees(e.employees);
    setShifts(s.shifts);
    setStock(st.items);
    setAlerts(a.alerts);
    if (e.employees.length > 0 && !e.employees.some((x) => x.id === shiftEmp)) {
      setShiftEmp(e.employees[0].id);
    }
    if (e.employees.length === 0) {
      setShiftEmp("");
    }
  }, [range.from, range.to, shiftEmp]);

  useEffect(() => {
    load().catch((e: Error) => setErr(e.message));
  }, [load]);

  async function addEmployee() {
    setBusy(true);
    try {
      await api("/api/employees", { method: "POST", body: JSON.stringify({ name: empName }) });
      setEmpName("");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addShift() {
    setBusy(true);
    try {
      await api("/api/shifts", {
        method: "POST",
        body: JSON.stringify({ employeeId: shiftEmp, shiftDate, slot }),
      });
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addStock() {
    setBusy(true);
    try {
      await api("/api/stock", {
        method: "POST",
        body: JSON.stringify({
          name: stockName,
          qty: Number(stockQty),
          threshold: Number(stockTh),
          unit: "件",
        }),
      });
      setStockName("");
      setStockQty("0");
      setStockTh("0");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function doUnlock() {
    setBusy(true);
    try {
      await api("/api/unlock", { method: "POST", body: JSON.stringify({ code: unlock }) });
      setUnlock("");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv() {
    setBusy(true);
    try {
      const res = await fetch(`/api/report/week.csv?anchor=${encodeURIComponent(anchor)}`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `week-${anchor}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const sh of shifts) {
      const arr = map.get(sh.shiftDate) ?? [];
      arr.push(sh);
      map.set(sh.shiftDate, arr);
    }
    return map;
  }, [shifts]);

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <div style={{ fontWeight: 800 }}>排班库存轻助手</div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
            小团队排班 + 低库存提醒（不上 HR 全套）
          </div>
        </div>
        <div className="row">
          <span className="badge">
            Pro：{meta?.proUnlocked ? "已解锁" : "未解锁"} · 员工 {String(meta?.employees ?? "-")}/
            {String(meta?.employeeCap ?? "-")} · 库存 SKU {String(meta?.stockItems ?? "-")}/
            {String(meta?.stockCap ?? "-")} · 低库存 {String(meta?.lowStockAlerts ?? "-")}
          </span>
          <button className="primary" onClick={() => load()} disabled={busy}>
            刷新
          </button>
        </div>
      </header>

      {err ? (
        <div className="banner error" style={{ borderStyle: "solid" }}>
          {err}
        </div>
      ) : null}

      <div className="grid grid-3">
        <section className="card">
          <h3 style={{ marginTop: 0 }}>员工</h3>
          <label>新增员工</label>
          <div className="row">
            <input value={empName} onChange={(e) => setEmpName(e.target.value)} />
            <button className="primary" onClick={addEmployee} disabled={busy || !empName}>
              添加
            </button>
          </div>
          <div style={{ height: 10 }} />
          {employees.map((e) => (
            <div key={e.id} className="row" style={{ justifyContent: "space-between" }}>
              <div>{e.name}</div>
              <button
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api(`/api/employees/${e.id}`, { method: "DELETE" });
                    await load();
                  } catch (ex) {
                    setErr((ex as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
              >
                删
              </button>
            </div>
          ))}
        </section>

        <section className="card">
          <h3 style={{ marginTop: 0 }}>排班（本周）</h3>
          <label>周锚点（任意一天）</label>
          <input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
          <div className="banner">
            当前视图：{range.from} ~ {range.to}
          </div>

          <label>员工</label>
          <select value={shiftEmp} onChange={(e) => setShiftEmp(e.target.value)}>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <label>日期</label>
          <input type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} />

          <label>班次</label>
          <select value={slot} onChange={(e) => setSlot(e.target.value as typeof slot)}>
            <option>早班</option>
            <option>中班</option>
            <option>晚班</option>
            <option>休息</option>
          </select>

          <div style={{ height: 10 }} />
          <button className="primary" onClick={addShift} disabled={busy || employees.length === 0}>
            添加排班
          </button>
        </section>

        <section className="card">
          <h3 style={{ marginTop: 0 }}>库存</h3>
          <label>品名</label>
          <input value={stockName} onChange={(e) => setStockName(e.target.value)} />
          <div className="row">
            <div style={{ flex: 1 }}>
              <label>数量</label>
              <input value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label>阈值</label>
              <input value={stockTh} onChange={(e) => setStockTh(e.target.value)} />
            </div>
          </div>
          <div style={{ height: 10 }} />
          <button className="primary" onClick={addStock} disabled={busy || !stockName}>
            添加 SKU
          </button>

          <div style={{ height: 12 }} />
          <div style={{ fontWeight: 700 }}>低库存</div>
          {alerts.length === 0 ? <div className="banner">暂无</div> : null}
          {alerts.map((a) => (
            <div key={a.id} className="banner" style={{ marginTop: 8 }}>
              {a.name}：{a.qty}
              {a.unit}（阈值 {a.threshold}
              {a.unit}）
            </div>
          ))}
        </section>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>周视图</h3>
          <div className="row">
            <button onClick={exportCsv} disabled={busy}>
              导出 CSV（周）
            </button>
          </div>
        </div>
        <div className="banner">
          免费版限制：员工/库存数量与导出次数；Pro 解锁更高上限。演示解锁码见 README。
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>排班</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 7 }).map((_, i) => {
                const d = new Date(`${range.from}T00:00:00`);
                d.setDate(d.getDate() + i);
                const key = d.toISOString().slice(0, 10);
                const list = shiftsByDate.get(key) ?? [];
                return (
                  <tr key={key}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {key}
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>
                        {["日", "一", "二", "三", "四", "五", "六"][d.getDay()]}
                      </div>
                    </td>
                    <td>
                      {list.length === 0 ? (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          {list.map((s) => (
                            <div key={s.id} className="row" style={{ justifyContent: "space-between" }}>
                              <div>
                                <strong>{s.employeeName}</strong> · {s.slot}
                              </div>
                              <button
                                onClick={async () => {
                                  setBusy(true);
                                  try {
                                    await api(`/api/shifts/${s.id}`, { method: "DELETE" });
                                    await load();
                                  } catch (ex) {
                                    setErr((ex as Error).message);
                                  } finally {
                                    setBusy(false);
                                  }
                                }}
                                disabled={busy}
                              >
                                删
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>库存列表</h3>
        <table>
          <thead>
            <tr>
              <th>品名</th>
              <th>数量</th>
              <th>阈值</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {stock.map((it) => (
              <tr key={it.id}>
                <td>{it.name}</td>
                <td>
                  <input
                    defaultValue={String(it.qty)}
                    style={{ maxWidth: 110 }}
                    id={`q-${it.id}`}
                  />
                </td>
                <td>
                  <input
                    defaultValue={String(it.threshold)}
                    style={{ maxWidth: 110 }}
                    id={`t-${it.id}`}
                  />
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={async () => {
                      const q = Number((document.getElementById(`q-${it.id}`) as HTMLInputElement).value);
                      const t = Number((document.getElementById(`t-${it.id}`) as HTMLInputElement).value);
                      setBusy(true);
                      try {
                        await api(`/api/stock/${it.id}`, {
                          method: "PUT",
                          body: JSON.stringify({
                            name: it.name,
                            qty: q,
                            threshold: t,
                            unit: it.unit,
                          }),
                        });
                        await load();
                      } catch (ex) {
                        setErr((ex as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    保存
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>解锁 Pro</h3>
        <div className="row">
          <input value={unlock} onChange={(e) => setUnlock(e.target.value)} placeholder="解锁码" />
          <button className="primary" onClick={doUnlock} disabled={busy}>
            解锁
          </button>
        </div>
        <div className="ad-slot">
          横幅广告位（演示）：可放本地异业合作；禁止弹窗与追踪像素（上线时请遵守当地法规）。
        </div>
      </section>
    </div>
  );
}
