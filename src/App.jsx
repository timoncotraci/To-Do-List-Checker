import React, { useEffect, useMemo, useState } from "react";

// Minimalist, modern To‑Do App — auth flow updated: register -> login -> app
// Paste into src/App.jsx (replace existing). Uses localStorage for simple auth and persists theme/tasks.

const STORAGE = {
  USER: "todo_user_v1",
  TASKS: "todo_tasks_v1",
  THEME: "todo_theme_v1",
  HISTORY: "todo_history_v1",
  ORDER: "todo_order_v1",
};

export default function App() {
  // --- auth stages: 'register' -> 'login' -> 'app' ---
  const stored = JSON.parse(localStorage.getItem(STORAGE.USER) || "null");
  const initialStage = stored ? "login" : "register";
  const [authStage, setAuthStage] = useState(initialStage);
  const [storedUser, setStoredUser] = useState(stored);
  const [sessionUser, setSessionUser] = useState(null);
  const [form, setForm] = useState({ u: "", p: "" });

  // --- app state ---
  const [tasks, setTasks] = useState(() => JSON.parse(localStorage.getItem(STORAGE.TASKS)) || []);
  const [query, setQuery] = useState("");
  const [inText, setInText] = useState("");
  const [panel, setPanel] = useState("tasks"); // tasks | account | settings
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE.THEME) || "light");
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem(STORAGE.HISTORY)) || []);
  const [order, setOrder] = useState(() => localStorage.getItem(STORAGE.ORDER) || "newest");

  // --- persistence effects ---
  useEffect(() => localStorage.setItem(STORAGE.TASKS, JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem(STORAGE.HISTORY, JSON.stringify(history)), [history]);
  useEffect(() => localStorage.setItem(STORAGE.ORDER, order), [order]);
  useEffect(() => localStorage.setItem(STORAGE.THEME, theme), [theme]);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
  }, [theme]);

  // --- helpers ---
  const pushHistory = (text) => setHistory((h) => [text, ...h].slice(0, 200));

  // --- auth handlers ---
  const handleRegister = () => {
    const username = form.u.trim();
    const password = form.p;
    if (!username || !password) return alert("Please enter username and password to register.");
    const user = { name: username, pass: password, createdAt: Date.now() };
    localStorage.setItem(STORAGE.USER, JSON.stringify(user));
    setStoredUser(user);
    setAuthStage("login");
    setForm({ u: "", p: "" });
    pushHistory(`Registered ${username}`);
    alert("Registration successful — please log in.");
  };

  const handleLogin = () => {
    if (!storedUser) return alert("No registered account found — please register first.");
    if (form.u === storedUser.name && form.p === storedUser.pass) {
      setSessionUser({ name: storedUser.name });
      setAuthStage("app");
      setForm({ u: "", p: "" });
      pushHistory(`User ${storedUser.name} logged in.`);
    } else {
      alert("Incorrect username or password.");
    }
  };

  const handleLogout = () => {
    if (sessionUser) pushHistory(`User ${sessionUser.name} logged out.`);
    setSessionUser(null);
    setAuthStage("login");
  };

  // --- tasks ---
  const add = () => {
    const t = inText.trim();
    if (!t) return;
    const item = { id: Date.now(), text: t, done: false, createdAt: Date.now() };
    setTasks((s) => [item, ...s]);
    setInText("");
    pushHistory(`Added: ${t}`);
  };
  const toggle = (id) => setTasks((s) => s.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const remove = (id) => {
    setTasks((s) => s.filter((x) => x.id !== id));
    pushHistory(`Deleted task`);
  };
  const clearAll = () => {
    if (!confirm("Clear all tasks?")) return;
    setTasks([]);
    pushHistory("Cleared all tasks");
  };
  const move = (id, dir) => {
    setTasks((s) => {
      const a = [...s];
      const ix = a.findIndex((x) => x.id === id);
      if (ix === -1) return s;
      const swap = dir === "up" ? ix - 1 : ix + 1;
      if (swap < 0 || swap >= a.length) return s;
      [a[ix], a[swap]] = [a[swap], a[ix]];
      return a;
    });
  };

  // --- backup/import ---
  const exportBackup = () => {
    const payload = { tasks, history, theme, order };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `todo-backup-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importBackup = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const p = JSON.parse(e.target.result);
        if (p.tasks) setTasks(p.tasks);
        if (p.history) setHistory(p.history);
        if (p.theme) setTheme(p.theme);
        if (p.order) setOrder(p.order);
        alert("Backup imported");
      } catch {
        alert("Invalid file");
      }
    };
    r.readAsText(file);
  };

  // --- list ---
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = tasks.slice();
    out.sort((a, b) => (order === "newest" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt));
    if (q) out = out.filter((t) => t.text.toLowerCase().includes(q));
    return out;
  }, [tasks, query, order]);

  // --- styles ---
  const styles = {
    app: { fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial", minHeight: "100vh", display: "flex", background: "var(--bg)", color: "var(--fg)" },
    sidebar: { width: 260, padding: 20, borderRight: "1px solid var(--muted)", display: "flex", flexDirection: "column", gap: 12, boxSizing: "border-box" },
    main: { flex: 1, padding: 24 },
    logo: { fontWeight: 700, fontSize: 18, letterSpacing: 0.2 },
    btn: { padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: "var(--accent)", color: "var(--accent-contrast)" },
    ghost: { background: "transparent", border: "1px solid var(--muted)", padding: "8px 12px", borderRadius: 10, cursor: "pointer" },
    input: { padding: "10px 12px", borderRadius: 10, border: "1px solid var(--muted)", width: "100%", boxSizing: "border-box", background: "var(--surface)", color: "var(--fg)" },
    taskCard: { background: "var(--card)", padding: 12, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, boxShadow: "var(--shadow)" },
    small: { fontSize: 13, color: "var(--muted)" },
  };

  // --- AUTH UI FLOW ---
  if (authStage !== "app") {
    // Register -> Login flow
    return (
      <div style={styles.app}>
        <style>{`
          :root{ --bg:#f6f8fb; --fg:#0b1220; --muted:#c9d2dd; --accent:#3366ff; --accent-contrast:#fff; --surface:#fff; --card:#ffffff; --shadow: 0 6px 18px rgba(12,17,28,0.06);} 
          [data-theme='dark']{ --bg:#071026; --fg:#e6eef8; --muted:#113249; --accent:#6ea8fe; --accent-contrast:#062240; --surface:#07162a; --card:#021029; --shadow: 0 6px 28px rgba(0,0,0,0.6);} 
          *{box-sizing:border-box} 
        `}</style>
        <main style={{ margin: "auto", width: 420, padding: 24, background: "var(--card)", borderRadius: 12, boxShadow: "var(--shadow)" }}>
          <h1 style={{ marginTop: 0, fontSize: 20 }}>Minimal To‑Do</h1>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>{authStage === "register" ? "Create an account to start." : "Welcome back — please log in."}</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            <input placeholder="Username" value={form.u} onChange={(e) => setForm((f) => ({ ...f, u: e.target.value }))} style={styles.input} />
            <input placeholder="Password" type="password" value={form.p} onChange={(e) => setForm((f) => ({ ...f, p: e.target.value }))} style={styles.input} />

            {authStage === "register" ? (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleRegister} style={styles.btn}>Register</button>
                  {storedUser && <button onClick={() => setAuthStage("login")} style={styles.ghost}>Go to Login</button>}
                </div>
                <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>After registering you will be returned to the login screen.</div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleLogin} style={styles.btn}>Log In</button>
                  <button onClick={() => setAuthStage("register")} style={styles.ghost}>New? Register</button>
                </div>
                <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>If you forgot your password, refresh the page to re-register (simple local demo).</div>
              </>
            )}
          </div>

          {storedUser && authStage === "login" && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "var(--surface)" }}>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Registered user</div>
              <div style={{ fontWeight: 700 }}>{storedUser.name}</div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- main app UI (authStage === 'app') ---
  return (
    <div style={styles.app}>
      <style>{`
        :root{ --bg:#f6f8fb; --fg:#0b1220; --muted:#c9d2dd; --accent:#3366ff; --accent-contrast:#fff; --surface:#fff; --card:#ffffff; --shadow: 0 6px 18px rgba(12,17,28,0.06);} 
        [data-theme='dark']{ --bg:#071026; --fg:#e6eef8; --muted:#113249; --accent:#6ea8fe; --accent-contrast:#062240; --surface:#07162a; --card:#021029; --shadow: 0 6px 28px rgba(0,0,0,0.6);} 
        *{box-sizing:border-box} 
      `}</style>

      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={styles.logo}>Minimal To‑Do</div>
            <div style={styles.small}>Simple • Fast • Focused</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} style={{ ...styles.btn, padding: 8, background: "transparent", color: "var(--fg)", border: "1px solid var(--muted)" }}>{theme === "dark" ? "🌙" : "☀️"}</button>
            {sessionUser && <div style={{ fontSize: 12, textAlign: "right" }}>{sessionUser.name}</div>}
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="nav-btn" onClick={() => setPanel("tasks")} style={panel === "tasks" ? { ...styles.btn, background: "var(--accent)" } : styles.ghost}>Tasks</button>
          <button onClick={() => setPanel("account")} style={panel === "account" ? { ...styles.btn, background: "var(--accent)" } : styles.ghost}>Account</button>
          <button onClick={() => setPanel("settings")} style={panel === "settings" ? { ...styles.btn, background: "var(--accent)" } : styles.ghost}>Settings</button>
        </nav>

        <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
          <button onClick={handleLogout} style={{ ...styles.ghost, width: "100%" }}>Log out</button>
        </div>
      </aside>

      {/* Main area */}
      <main style={styles.main}>
        {panel === "tasks" && (
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 22 }}>Tasks</h1>
                <div style={styles.small}>{tasks.length} total • {list.filter((t) => !t.done).length} open</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ ...styles.input, width: 240 }} />
                <select value={order} onChange={(e) => setOrder(e.target.value)} style={styles.input}>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
              {/* left: task list */}
              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input value={inText} onChange={(e) => setInText(e.target.value)} placeholder="Add a task and press Add" style={styles.input} />
                  <button onClick={add} style={styles.btn}>Add</button>
                  <button onClick={clearAll} style={styles.ghost}>Clear</button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {list.length === 0 && <div style={{ ...styles.taskCard, justifyContent: "center", color: "var(--muted)" }}>No tasks — add your first one.</div>}
                  {list.map((t) => (
                    <div key={t.id} style={styles.taskCard}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</div>
                          <div style={styles.small}>{new Date(t.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => move(t.id, "up")} style={styles.ghost}>▲</button>
                        <button onClick={() => move(t.id, "down")} style={styles.ghost}>▼</button>
                        <button onClick={() => remove(t.id)} style={{ ...styles.ghost, color: "#ef4444" }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* right: small panel */}
              <aside style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ ...styles.taskCard, flexDirection: "column", alignItems: "stretch" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>Quick actions</strong>
                    <span style={styles.small}>v1</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={exportBackup} style={styles.btn}>Export</button>
                    <label style={{ ...styles.ghost, padding: "8px 12px", cursor: "pointer" }}>
                      Import
                      <input type="file" accept="application/json" onChange={(e) => importBackup(e.target.files[0])} style={{ display: "none" }} />
                    </label>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div style={styles.small}>History preview</div>
                    <div style={{ maxHeight: 140, overflow: "auto", marginTop: 8 }}>
                      {history.slice(0, 6).map((h, i) => (
                        <div key={i} style={{ fontSize: 13, padding: "6px 0", borderBottom: "1px dashed var(--muted)" }}>{h}</div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ ...styles.taskCard }}>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>Account</div>
                    <div style={{ fontWeight: 700 }}>{sessionUser ? sessionUser.name : "—"}</div>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        )}

        {panel === "account" && (
          <section>
            <h2>Account</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
              <div style={{ padding: 12, borderRadius: 10, background: "var(--card)", boxShadow: "var(--shadow)" }}>
                <p style={styles.small}>Logged in as:</p>
                <h3>{sessionUser?.name || "—"}</h3>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={exportBackup} style={styles.btn}>Backup</button>
                  <label style={{ ...styles.ghost, cursor: "pointer" }}>
                    Import
                    <input type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => importBackup(e.target.files[0])} />
                  </label>
                </div>
              </div>

              <aside style={{ padding: 12, borderRadius: 10, background: "var(--card)", boxShadow: "var(--shadow)" }}>
                <div style={styles.small}>App</div>
                <div style={{ fontWeight: 700 }}>Minimal To‑Do</div>
                <div style={{ marginTop: 8 }} className="muted">Version 1.0.0 — manual update check not implemented</div>
              </aside>
            </div>
          </section>
        )}

        {panel === "settings" && (
          <section>
            <h2>Settings</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 10, background: "var(--card)", boxShadow: "var(--shadow)" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ minWidth: 120 }}>Theme</div>
                  <select value={theme} onChange={(e) => setTheme(e.target.value)} style={styles.input}>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                  <div style={{ minWidth: 120 }}>List order</div>
                  <select value={order} onChange={(e) => setOrder(e.target.value)} style={styles.input}>
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                  </select>
                </div>
              </div>

              <div style={{ padding: 12, borderRadius: 10, background: "var(--card)", boxShadow: "var(--shadow)" }}>
                <div style={styles.small}>History (latest first)</div>
                <div style={{ maxHeight: 260, overflow: "auto", marginTop: 8 }}>
                  {history.length === 0 && <div style={styles.small}>No actions logged yet.</div>}
                  {history.map((h, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px dashed var(--muted)" }}>{h}</div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
