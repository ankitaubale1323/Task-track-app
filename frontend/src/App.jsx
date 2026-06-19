import { useState, useEffect, useCallback } from "react";
const API = "http://54.235.12.155:8000";
const PRIORITY_CONFIG = {
  critical: { color: "#ff2d55", bg: "#1a0008", badge: "#ff2d55", label: "🔴 CRITICAL", alert: true },
  high:     { color: "#ff9500", bg: "#1a0d00", badge: "#ff9500", label: "🟠 HIGH",     alert: true },
  medium:   { color: "#ffd60a", bg: "#1a1500", badge: "#ffd60a", label: "🟡 MEDIUM",   alert: false },
  low:      { color: "#30d158", bg: "#001a08", badge: "#30d158", label: "🟢 LOW",       alert: false },
};

function Toast({ toasts, remove }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => remove(t.id)} style={{
          background: PRIORITY_CONFIG[t.priority]?.color || "#fff",
          color: "#000",
          padding: "14px 20px",
          borderRadius: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 700,
          fontSize: 13,
          maxWidth: 320,
          cursor: "pointer",
          boxShadow: `0 0 30px ${PRIORITY_CONFIG[t.priority]?.color}88`,
          animation: "slideIn 0.3s ease",
          borderLeft: `4px solid #000`,
        }}>
          ⚠️ {t.priority.toUpperCase()} PRIORITY TASK ADDED!
          <div style={{ fontWeight: 400, fontSize: 12, marginTop: 4, opacity: 0.85 }}>"{t.title}"</div>
          <div style={{ fontSize: 10, marginTop: 6, opacity: 0.6 }}>Click to dismiss</div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", due_date: "" });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  const addToast = useCallback((task) => {
    const id = Date.now();
    setToasts(p => [...p, { id, ...task }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
  }, []);

  const removeToast = (id) => setToasts(p => p.filter(t => t.id !== id));

  const fetchTasks = useCallback(async () => {
    const res = await fetch(`${API}/tasks`);
    setTasks(await res.json());
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const task = await res.json();
      setTasks(p => {
        const updated = [...p, task];
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return updated.sort((a, b) => (a.completed - b.completed) || (order[a.priority] - order[b.priority]));
      });
      if (PRIORITY_CONFIG[form.priority]?.alert) addToast(task);
      setForm({ title: "", description: "", priority: "medium", due_date: "" });
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async (task) => {
    await fetch(`${API}/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    fetchTasks();
  };

  const deleteTask = async (id) => {
    await fetch(`${API}/tasks/${id}`, { method: "DELETE" });
    setTasks(p => p.filter(t => t.id !== id));
  };

  const filtered = tasks.filter(t => {
    if (filter === "active") return !t.completed;
    if (filter === "done") return t.completed;
    if (filter === "critical") return t.priority === "critical" && !t.completed;
    return true;
  });

  const counts = {
    critical: tasks.filter(t => t.priority === "critical" && !t.completed).length,
    high: tasks.filter(t => t.priority === "high" && !t.completed).length,
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080808",
      fontFamily: "'IBM Plex Mono', monospace",
      color: "#e0e0e0",
      padding: "0 0 60px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=Bebas+Neue&display=swap');
        @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,45,85,0.4); } 50% { box-shadow: 0 0 0 8px rgba(255,45,85,0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #111; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        input, textarea, select { background: #111 !important; border: 1px solid #2a2a2a !important; color: #e0e0e0 !important; border-radius: 8px !important; font-family: 'IBM Plex Mono', monospace !important; font-size: 13px !important; padding: 10px 14px !important; outline: none !important; transition: border-color 0.2s !important; }
        input:focus, textarea:focus, select:focus { border-color: #555 !important; }
        button { cursor: pointer; font-family: 'IBM Plex Mono', monospace; border: none; transition: all 0.15s; }
      `}</style>

      <Toast toasts={toasts} remove={removeToast} />

      {/* Header */}
      <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: 3, color: "#fff" }}>TASK COMMAND</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Priority-based alert system</div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {counts.critical > 0 && (
            <div style={{ background: "#ff2d5515", border: "1px solid #ff2d55", borderRadius: 8, padding: "8px 16px", color: "#ff2d55", fontSize: 12, fontWeight: 700, animation: "pulse 2s infinite" }}>
              ⚠️ {counts.critical} CRITICAL
            </div>
          )}
          {counts.high > 0 && (
            <div style={{ background: "#ff950015", border: "1px solid #ff9500", borderRadius: 8, padding: "8px 16px", color: "#ff9500", fontSize: 12, fontWeight: 700 }}>
              🔥 {counts.high} HIGH
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "30px 20px" }}>

        {/* Add Task Form */}
        <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 14, padding: 24, marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: "#555", marginBottom: 16, letterSpacing: 2 }}>// NEW TASK</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 12, marginBottom: 12 }}>
            <input
              placeholder="Task title..."
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
            />
            <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
              <option value="critical">🔴 Critical</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: 12 }}>
            <textarea
              placeholder="Description (optional)..."
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2}
              style={{ resize: "none" }}
            />
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !form.title.trim()}
              style={{
                background: loading ? "#222" : "#fff",
                color: loading ? "#555" : "#000",
                borderRadius: 8,
                padding: "0 24px",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 1,
              }}
            >
              {loading ? "..." : "ADD →"}
            </button>
          </div>
          {(form.priority === "critical" || form.priority === "high") && form.title && (
            <div style={{ marginTop: 12, padding: "8px 14px", background: PRIORITY_CONFIG[form.priority].bg, border: `1px solid ${PRIORITY_CONFIG[form.priority].color}44`, borderRadius: 8, fontSize: 11, color: PRIORITY_CONFIG[form.priority].color }}>
              ⚡ Alert will trigger when this {form.priority} priority task is added!
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["all", "active", "done", "critical"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? "#fff" : "#111",
              color: filter === f ? "#000" : "#555",
              border: `1px solid ${filter === f ? "#fff" : "#222"}`,
              borderRadius: 20,
              padding: "6px 16px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}>
              {f === "critical" ? "🔴 " : ""}{f}
              {f === "critical" && counts.critical > 0 ? ` (${counts.critical})` : ""}
            </button>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 11, color: "#444", alignSelf: "center" }}>
            {filtered.length} task{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Task List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#333", fontSize: 13 }}>
              No tasks found. Add one above ↑
            </div>
          )}
          {filtered.map(task => {
            const cfg = PRIORITY_CONFIG[task.priority];
            return (
              <div key={task.id} style={{
                background: task.completed ? "#0a0a0a" : "#0d0d0d",
                border: `1px solid ${task.completed ? "#1a1a1a" : cfg.color + "44"}`,
                borderLeft: `3px solid ${task.completed ? "#2a2a2a" : cfg.color}`,
                borderRadius: 10,
                padding: "14px 18px",
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                opacity: task.completed ? 0.5 : 1,
                transition: "all 0.2s",
              }}>
                {/* Checkbox */}
                <button onClick={() => toggleComplete(task)} style={{
                  width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 2,
                  background: task.completed ? cfg.color : "transparent",
                  border: `2px solid ${task.completed ? cfg.color : "#333"}`,
                  color: "#000", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {task.completed ? "✓" : ""}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 14, fontWeight: 700, color: task.completed ? "#444" : "#e0e0e0",
                      textDecoration: task.completed ? "line-through" : "none",
                    }}>{task.title}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: cfg.color,
                      background: cfg.bg, border: `1px solid ${cfg.color}44`,
                      borderRadius: 4, padding: "2px 8px", letterSpacing: 1,
                    }}>{cfg.label}</span>
                    {task.due_date && (
                      <span style={{ fontSize: 10, color: "#444" }}>📅 {task.due_date}</span>
                    )}
                  </div>
                  {task.description && (
                    <div style={{ fontSize: 12, color: "#555", marginTop: 5 }}>{task.description}</div>
                  )}
                  <div style={{ fontSize: 10, color: "#333", marginTop: 6 }}>
                    {new Date(task.created_at).toLocaleString()}
                  </div>
                </div>

                {/* Delete */}
                <button onClick={() => deleteTask(task.id)} style={{
                  background: "transparent", color: "#333", fontSize: 16, padding: "2px 6px", borderRadius: 4,
                  flexShrink: 0,
                }} onMouseOver={e => e.target.style.color = "#ff2d55"}
                   onMouseOut={e => e.target.style.color = "#333"}>
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
