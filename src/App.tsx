import { useEffect, useReducer, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  categories,
  decisionLabels,
  draftFiles,
  formatSize,
  inScope,
  loadState,
  plannedFiles,
  reason,
  reducer,
  searchFiles,
  STORAGE_KEY,
  targetPath,
} from "./model";
import type {
  Category,
  Decision,
  FileItem,
  Goal,
  HistoryEntry,
  State,
  View,
} from "./model";
import { Empty, Icon, Modal, Preview } from "./components";
import LoginPage from "./LoginPage";

const DEMO_SESSION_KEY = "fileo.demo-session.v1";

type Dialog =
  | { type: "scope" | "help" | "reset" | "privacy" | "supported" }
  | { type: "details"; id: string }
  | { type: "compare" }
  | { type: "restore"; id: string }
  | null;
const navigation: { view: View; label: string; icon: string }[] = [
  { view: "organize", label: "Start organizing", icon: "spark" },
  { view: "browse", label: "Browse files", icon: "folder" },
  { view: "tasks", label: "Organizing tasks", icon: "list" },
  { view: "history", label: "History & recovery", icon: "history" },
  { view: "rules", label: "Organizing rules", icon: "sliders" },
];
const goals: Goal[] = [
  "Free up space",
  "Organize a project",
  "Compare versions",
];
const now = () => new Date().toISOString();
const displayDate = (date: string) =>
  new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const nicePath = (path: string) =>
  path.replace("Documents/Design archive/", "");

export default function App() {
  const [entered, setEntered] = useState(() => {
    try {
      return (
        window.location.hash !== "#/welcome" &&
        sessionStorage.getItem(DEMO_SESSION_KEY) === "entered"
      );
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!entered) {
      try {
        sessionStorage.removeItem(DEMO_SESSION_KEY);
      } catch {
        /* Session storage is optional. */
      }
      if (window.location.hash !== "#/welcome")
        window.history.replaceState(null, "", "#/welcome");
    }
  }, [entered]);

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === "#/welcome") {
        try {
          sessionStorage.removeItem(DEMO_SESSION_KEY);
        } catch {
          /* Session storage is optional. */
        }
        setEntered(false);
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function enterWorkspace() {
    try {
      sessionStorage.setItem(DEMO_SESSION_KEY, "entered");
    } catch {
      /* The current visit can still continue. */
    }
    window.location.hash = "/organize";
    setEntered(true);
  }

  return entered ? <Workspace /> : <LoginPage onEnter={enterWorkspace} />;
}

function Workspace() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchScope, setSearchScope] = useState("all");
  const [category, setCategory] = useState("All");
  const [format, setFormat] = useState("All");
  const [location, setLocation] = useState("All locations");
  const [sort, setSort] = useState("recent");
  const [decisionFilter, setDecisionFilter] = useState("All");
  const [historyFilter, setHistoryFilter] = useState("All actions");
  const [listView, setListView] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [answer, setAnswer] = useState<{
    question: string;
    text: string;
    refs: string[];
  } | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [scopeDraft, setScopeDraft] = useState<Category[]>(state.scope);
  const [subDraft, setSubDraft] = useState(state.subfolders);
  const [projectDraft, setProjectDraft] = useState<State["project"]>(
    state.project,
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const searchBox = useRef<HTMLFormElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const activeTask = state.tasks.find((t) => t.id === state.activeTaskId);
  const scoped = inScope(state);
  const reviewed = draftFiles(state);
  const planned = plannedFiles(state);
  const counts = (["keep", "archive", "trash", "review"] as Decision[]).map(
    (d) => reviewed.filter((f) => state.decisions[f.id] === d).length,
  );
  const completed =
    activeTask?.operations.filter((o) => o.status === "completed").length || 0;
  const failed =
    activeTask?.operations.filter((o) => o.status === "failed").length || 0;
  const busy = state.phase === "applying" || state.phase === "analyzing";

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setMobileMenu(false);
      }
    };
    const outside = (e: MouseEvent) => {
      if (!searchBox.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("mousedown", outside);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("mousedown", outside);
    };
  }, []);
  useEffect(() => {
    const onHash = () => {
      const view = window.location.hash.replace("#/", "") as View;
      if (
        [
          "organize",
          "browse",
          "tasks",
          "history",
          "rules",
          "settings",
        ].includes(view)
      )
        dispatch({ type: "NAV", view });
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    setPage(0);
    setSelected([]);
    contentRef.current?.scrollTo({ top: 0 });
  }, [
    state.view,
    state.phase,
    query,
    category,
    format,
    location,
    decisionFilter,
    searchScope,
  ]);
  useEffect(() => {
    if (state.phase !== "analyzing") return;
    setAnalysisProgress(0);
    let p = 0;
    const t = setInterval(() => {
      p += 20;
      setAnalysisProgress(p);
      if (p >= 100) dispatch({ type: "ANALYZED" });
    }, 260);
    return () => clearInterval(t);
  }, [state.phase]);
  useEffect(() => {
    if (state.phase !== "applying") return;
    const t = setTimeout(() => dispatch({ type: "STEP", at: now() }), 200);
    return () => clearTimeout(t);
  }, [state.phase, state.tasks]);

  function nav(view: View) {
    dispatch({ type: "NAV", view });
    if (window.location.hash !== `#/${view}`) window.location.hash = `/${view}`;
    setMobileMenu(false);
    setSearchOpen(false);
  }
  function phase(value: State["phase"]) {
    dispatch({ type: "PHASE", phase: value });
    window.location.hash = "/organize";
    setConfirmed(false);
  }
  function analyze(ids?: string[]) {
    setCategory("All");
    setDecisionFilter("All");
    setQuery("");
    dispatch({ type: "ANALYZE", ids });
    window.location.hash = "/organize";
    setAnswer(null);
  }
  function searchFor(value: string) {
    setQuery(value.trim());
    setSearch(value);
    setCategory("All");
    setFormat("All");
    setLocation("All locations");
    nav("browse");
  }
  function scopeDialog() {
    setScopeDraft([...state.scope]);
    setSubDraft(state.subfolders);
    setProjectDraft(state.project);
    setDialog({ type: "scope" });
  }
  function toggleSelect(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }
  function ask(question: string) {
    if (!question.trim()) return;
    const q = question.toLowerCase();
    let text: string;
    let refs: string[] = [];
    if (/why|orbit|version|版本|为什么/.test(q)) {
      text =
        "orbit_v07.blend is newer (12 Oct) and larger (184 MB) than v03 (4 Jul, 142 MB). Their filenames suggest a version family. This does not prove v03 is redundant. Compare the illustrative previews and choose what to keep.";
      refs = ["f01", "f02"];
    } else if (/privacy|access|安全|隐私/.test(q))
      text =
        "This local demo stores only its 42 example records in this browser. It does not read your computer, upload files or contact an AI service. Reset demo clears the saved example workspace.";
    else if (/space|delete|空间|删除/.test(q)) {
      const candidates = reviewed.filter(
        (f) => state.decisions[f.id] === "trash",
      );
      text = `Your current draft contains ${candidates.length} Trash candidates (${formatSize(candidates.reduce((s, f) => s + f.size, 0))}). Archiving does not free storage. No change happens until you review destinations and confirm. These actions affect demo records only.`;
      refs = candidates.slice(0, 2).map((f) => f.id);
    } else if (/supported|format|格式/.test(q))
      text =
        "Example records include BLEND, FIG, PDF, PNG, JPG, TOE and video formats. The four preview illustrations come from your Figma design. Fileo does not open or parse these file formats in this prototype.";
    else if (/analy|scope|范围|分析/.test(q))
      text = `The selected scope contains ${scoped.length} active files in ${state.project}. The demo checks filename, category and metadata, proposes an action, then waits for your decision. Unsupported content remains Needs review.`;
    else
      text =
        "I can explain the current scope, the orbit versions, or the space-saving suggestions. Try “Why keep orbit v07?” or “What will be analyzed?”. This assistant uses predefined rules and cannot answer arbitrary questions.";
    setAnswer({ question, text, refs });
    setAssistantInput("");
    setShowAssistant(true);
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "fileo-demo-workspace.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setToast("Demo workspace exported.");
  }

  const browseBase = state.files.filter(
    (f) =>
      (searchScope !== "orbit" || f.tags.includes("orbit")) &&
      (location === "Trash"
        ? f.status === "trashed"
        : location === "_Archive"
          ? f.status === "archived"
          : location === "Source files"
            ? f.status === "active"
            : f.status !== "trashed"),
  );
  const tableBase =
    state.view === "browse" ? searchFiles(browseBase, query) : reviewed;
  const visible = tableBase
    .filter(
      (f) =>
        (category === "All" || f.category === category) &&
        (format === "All" || f.name.endsWith(`.${format}`)) &&
        (decisionFilter === "All" || state.decisions[f.id] === decisionFilter),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "size"
          ? b.size - a.size
          : b.modified.localeCompare(a.modified),
    );
  const pageFiles = visible.slice(page * 8, page * 8 + 8);
  const homePreviews = [...scoped]
    .sort((a, b) =>
      ["f01", "f02", "f27", "f37"].indexOf(a.id) >= 0
        ? ["f01", "f02", "f27", "f37"].indexOf(b.id) >= 0
          ? ["f01", "f02", "f27", "f37"].indexOf(a.id) -
            ["f01", "f02", "f27", "f37"].indexOf(b.id)
          : -1
        : ["f01", "f02", "f27", "f37"].includes(b.id)
          ? 1
          : 0,
    )
    .filter((f) => category === "All" || f.category === category)
    .slice(0, 4);
  const searchMatches = searchFiles(
    state.files.filter(
      (f) =>
        f.status !== "trashed" &&
        (searchScope !== "orbit" || f.tags.includes("orbit")),
    ),
    search,
  ).slice(0, 4);
  const currentTitle =
    state.view === "browse"
      ? query
        ? "Search results"
        : "Browse your files"
      : state.view === "history"
        ? "History & recovery"
        : state.view === "tasks"
          ? "Your organizing tasks"
          : state.view === "rules"
            ? "Organizing rules"
            : state.view === "settings"
              ? "Settings & sources"
              : {
                  select: "Organize your files",
                  analyzing: "Getting to know your files",
                  review: "Review your files",
                  confirm: "Review your changes",
                  applying: "Applying your choices",
                  results: failed
                    ? "Almost there. One more step."
                    : "Your files are organized",
                }[state.phase];

  function categoryTabs(base: FileItem[]) {
    return (
      <div className="tabs" aria-label="File categories">
        {["All", ...categories].map((c) => (
          <button
            key={c}
            className={category === c ? "active" : ""}
            onClick={() => setCategory(c)}
          >
            {c}
            <span>
              {c === "All"
                ? base.length
                : base.filter((f) => f.category === c).length}
            </span>
          </button>
        ))}
      </div>
    );
  }
  function stats() {
    return (
      <div className="stats">
        {(["keep", "archive", "trash", "review"] as Decision[]).map((d, i) => (
          <button
            className={`stat ${d}`}
            key={d}
            onClick={() => {
              setDecisionFilter(decisionFilter === d ? "All" : d);
              if (state.phase === "confirm") phase("review");
            }}
            aria-pressed={decisionFilter === d}
          >
            <strong>{counts[i]}</strong>
            <span>
              {d === "review"
                ? "Need your judgment"
                : `${state.phase === "confirm" ? "" : "Suggested "}${decisionLabels[d].toLowerCase()}`}
            </span>
            <i className={`status-dot ${d}`} />
          </button>
        ))}
      </div>
    );
  }
  function fileCard(file: FileItem, decisions = false) {
    return (
      <article
        className={`file-card ${selected.includes(file.id) ? "selected" : ""}`}
        key={file.id}
        data-file-id={file.id}
      >
        <button
          className="preview-button"
          onClick={() => setDialog({ type: "details", id: file.id })}
          aria-label={`View ${file.name}`}
        >
          <Preview file={file} />
        </button>
        <div className="card-copy">
          <button
            className="file-name"
            onClick={() => setDialog({ type: "details", id: file.id })}
          >
            {file.name}
          </button>
          <p>
            {file.name.split(".").pop()?.toUpperCase()} <span>·</span>{" "}
            {formatSize(file.size)}
          </p>
          {decisions && (
            <div className="card-decision">
              <select
                aria-label={`Decision for ${file.name}`}
                value={state.decisions[file.id] || "review"}
                onChange={(e) =>
                  dispatch({
                    type: "DECIDE",
                    id: file.id,
                    decision: e.target.value as Decision,
                  })
                }
              >
                {Object.entries(decisionLabels).map(([key, label]) => (
                  <option value={key} key={key}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="checkbox"
                aria-label={`Select ${file.name}`}
                checked={selected.includes(file.id)}
                onChange={() => toggleSelect(file.id)}
              />
            </div>
          )}
          {state.view === "browse" && (
            <span className={`badge ${file.status}`}>
              {file.status === "active" ? file.category : file.status}
            </span>
          )}
        </div>
      </article>
    );
  }
  function fileCollection(reviewMode: boolean) {
    return (
      <div className="panel collection">
        <div className="collection-toolbar">
          {reviewMode ? (
            <div>
              <strong>
                {decisionFilter === "All"
                  ? "Your file decisions"
                  : decisionLabels[decisionFilter as Decision]}
              </strong>
              <p>Suggestions are a starting point. You decide.</p>
            </div>
          ) : (
            <label className="inline-search">
              <Icon name="search" />
              <input
                aria-label="Filter files"
                placeholder="Filter by filename, project or tag…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearch(e.target.value);
                }}
              />
            </label>
          )}
          <button
            className="button small"
            onClick={() => setListView(!listView)}
          >
            <Icon name={listView ? "grid" : "list"} />
            {listView ? "Grid view" : "List view"}
          </button>
        </div>
        {categoryTabs(tableBase)}
        <div className="filter-row">
          <label>
            Format
            <select
              aria-label="Filter by format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option>All</option>
              {[...new Set(tableBase.map((f) => f.name.split(".").pop()!))]
                .sort()
                .map((ext) => (
                  <option key={ext}>{ext}</option>
                ))}
            </select>
          </label>
          {!reviewMode && (
            <label>
              Location
              <select
                aria-label="Filter by location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                {["All locations", "Source files", "_Archive", "Trash"].map(
                  (l) => (
                    <option key={l}>{l}</option>
                  ),
                )}
              </select>
            </label>
          )}
          <label className="sort-label">
            Sort
            <select
              aria-label="Sort files"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recent">Recently modified</option>
              <option value="name">Name A–Z</option>
              <option value="size">Largest first</option>
            </select>
          </label>
        </div>
        {selected.length > 0 && (
          <div className="bulk-bar">
            <span>{selected.length} selected</span>
            {reviewMode ? (
              <>
                <button
                  onClick={() =>
                    dispatch({ type: "BULK", ids: selected, decision: "keep" })
                  }
                >
                  Keep selected
                </button>
                <button
                  onClick={() =>
                    dispatch({
                      type: "BULK",
                      ids: selected,
                      decision: "archive",
                    })
                  }
                >
                  Archive selected
                </button>
              </>
            ) : (
              <button onClick={() => analyze(selected)} disabled={busy}>
                Organize selected
              </button>
            )}
            <button onClick={() => setSelected([])}>Clear</button>
          </div>
        )}
        {!visible.length ? (
          <Empty
            title="No matching files"
            text="Try a different name, or clear your filters to look across the archive."
          >
            <button
              className="button"
              onClick={() => {
                setQuery("");
                setSearch("");
                setCategory("All");
                setFormat("All");
                setLocation("All locations");
                setSearchScope("all");
                setDecisionFilter("All");
              }}
            >
              Clear filters
            </button>
          </Empty>
        ) : listView ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>
                    <span className="sr-only">Select</span>
                  </th>
                  <th>FILE NAME</th>
                  <th>LOCATION</th>
                  <th>{reviewMode ? "DECISION" : "SIZE"}</th>
                </tr>
              </thead>
              <tbody>
                {pageFiles.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${f.name}`}
                        checked={selected.includes(f.id)}
                        onChange={() => toggleSelect(f.id)}
                      />
                    </td>
                    <td>
                      <button
                        className="table-file"
                        onClick={() => setDialog({ type: "details", id: f.id })}
                      >
                        <Icon name="file" />
                        <span>
                          {f.name}
                          <small>
                            {f.name.split(".").pop()?.toUpperCase()} ·{" "}
                            {f.modified}
                          </small>
                        </span>
                      </button>
                    </td>
                    <td className="path-cell">
                      {nicePath(f.path).split("/").slice(0, -1).join("/")}
                    </td>
                    <td>
                      {reviewMode ? (
                        <select
                          aria-label={`Decision for ${f.name}`}
                          value={state.decisions[f.id]}
                          onChange={(e) =>
                            dispatch({
                              type: "DECIDE",
                              id: f.id,
                              decision: e.target.value as Decision,
                            })
                          }
                        >
                          {Object.entries(decisionLabels).map(
                            ([key, label]) => (
                              <option value={key} key={key}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      ) : (
                        formatSize(f.size)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="file-grid">
            {pageFiles.map((f) => fileCard(f, reviewMode))}
          </div>
        )}
        <div className="collection-footer">
          <span>
            {visible.length
              ? `${page * 8 + 1}–${Math.min(page * 8 + 8, visible.length)} of ${visible.length} files`
              : "0 files"}{" "}
            · Illustrative previews
          </span>
          <div className="pagination">
            <button
              aria-label="Previous page"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              ←
            </button>
            <span>
              {page + 1} / {Math.max(1, Math.ceil(visible.length / 8))}
            </span>
            <button
              aria-label="Next page"
              disabled={(page + 1) * 8 >= visible.length}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const assistant = (
    <aside
      className={`assistant glass ${showAssistant ? "mobile-visible" : ""}`}
      aria-label="Fileo assistant"
    >
      <header className="assistant-header">
        <span className="icon-tile">
          <Icon name="spark" size={22} />
        </span>
        <div>
          <strong>Fileo assistant</strong>
          <p>
            <span className="live-dot" />
            Demo · rule-based suggestions
          </p>
        </div>
        <button
          className="icon-button assistant-close"
          aria-label="Close assistant"
          onClick={() => setShowAssistant(false)}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="assistant-body">
        <div className="assistant-intro">
          <span className="eyebrow">
            {state.view === "organize" && state.phase === "select"
              ? "YOUR FOCUS"
              : "A LITTLE CLARITY"}
          </span>
          <h3>
            {state.view === "history"
              ? "Every change has a record."
              : state.phase === "review"
                ? "Your files. Your judgment."
                : state.phase === "confirm"
                  ? "You approve the exact changes."
                  : state.view === "browse"
                    ? "Find the file behind its name."
                    : state.goal}
          </h3>
          <p>
            {state.phase === "review"
              ? `${counts[3]} files need a closer look. An older date alone is never a reason to remove a file.`
              : "A calmer workspace starts with a little context."}
          </p>
        </div>
        {answer ? (
          <div className="chat-answer" aria-live="polite">
            <div className="chat-question">{answer.question}</div>
            <span className="eyebrow">FILEO · DEMO RESPONSE</span>
            <p>{answer.text}</p>
            {answer.refs.map((id) => {
              const f = state.files.find((f) => f.id === id)!;
              return (
                <button
                  className="evidence-link"
                  key={id}
                  onClick={() => setDialog({ type: "details", id })}
                >
                  <Icon name="file" />
                  {f.name}
                  <Icon name="chevron" size={14} />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="analysis-plan">
            <strong>Analysis plan</strong>
            {["Identify files", "Compare versions", "Suggest actions"].map(
              (step, i) => (
                <div key={step}>
                  <span className="step-number">0{i + 1}</span>
                  <span>{step}</span>
                  <Icon name={["file", "history", "list"][i]} size={16} />
                </div>
              ),
            )}
          </div>
        )}
        <div className="assistant-context">
          <Icon name="folder" />
          <span>{state.project}</span>
          <small>{scoped.length} files</small>
        </div>
        <div className="assistant-shortcuts">
          <button onClick={() => ask("Why keep orbit v07?")}>
            Compare the orbit versions <Icon name="arrow" size={14} />
          </button>
          <button onClick={() => ask("What will be analyzed?")}>
            What will be analyzed? <Icon name="arrow" size={14} />
          </button>
          <div>
            <button onClick={() => setDialog({ type: "supported" })}>
              Supported files
            </button>
            <button onClick={() => setDialog({ type: "privacy" })}>
              Privacy & access
            </button>
          </div>
        </div>
      </div>
      <form
        className="message-composer"
        onSubmit={(e) => {
          e.preventDefault();
          ask(assistantInput);
        }}
      >
        <label className="sr-only" htmlFor="assistant-input">
          Ask Fileo
        </label>
        <textarea
          id="assistant-input"
          placeholder="Ask Fileo about your files…"
          value={assistantInput}
          onChange={(e) => setAssistantInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(assistantInput);
            }
          }}
        />
        <small>
          <Icon name="folder" size={13} />
          {state.project}
        </small>
        <div>
          <span>↵</span>
          <button
            className="button primary small"
            disabled={!assistantInput.trim()}
          >
            Send <Icon name="arrow" size={14} />
          </button>
        </div>
      </form>
    </aside>
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to workspace
      </a>
      <aside
        className={`sidebar glass ${mobileMenu ? "mobile-visible" : ""}`}
        aria-label="Main navigation"
      >
        <button
          className="brand"
          onClick={() => {
            nav("organize");
            if (!busy) phase("select");
          }}
        >
          <span>FILEO</span>
          <small>Personal workspace</small>
        </button>
        <div className="nav-section">
          <span className="nav-heading">WORKSPACE</span>
          <nav>
            {navigation.map((n) => (
              <button
                className={state.view === n.view ? "active" : ""}
                key={n.view}
                onClick={() => nav(n.view)}
                aria-current={state.view === n.view ? "page" : undefined}
              >
                <Icon name={n.icon} />
                <span>{n.label}</span>
                {n.view === "tasks" && state.tasks.length > 0 && (
                  <small>{state.tasks.length}</small>
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="nav-section sources">
          <span className="nav-heading">FILE SOURCES</span>
          <button
            onClick={() => {
              nav("browse");
              setLocation("All locations");
            }}
          >
            <Icon name="computer" />
            This computer
            <span className="source-dot" />
          </button>
          <button
            onClick={() => {
              nav("settings");
              setToast(
                "Cloud sources are a future integration. This demo runs locally.",
              );
            }}
          >
            <Icon name="cloud" />
            Cloud drive <small>Soon</small>
          </button>
        </div>
        <button className="current-task" onClick={() => nav("tasks")}>
          <span className="eyebrow">CURRENT WORKSPACE</span>
          <strong>Design archive</strong>
          <small>
            {state.files.filter((f) => f.status !== "trashed").length} files ·{" "}
            {formatSize(
              state.files
                .filter((f) => f.status !== "trashed")
                .reduce((s, f) => s + f.size, 0),
            )}
          </small>
          <div className="mini-progress">
            <span
              style={{
                width: `${(100 * state.files.filter((f) => f.status === "archived").length) / 42}%`,
              }}
            />
          </div>
        </button>
        <footer className="sidebar-footer">
          <button
            onClick={() => nav("settings")}
            className={state.view === "settings" ? "active" : ""}
          >
            <Icon name="settings" />
            Settings
          </button>
          <button
            className="profile"
            onClick={() => setDialog({ type: "help" })}
          >
            <span className="avatar">LY</span>
            <span>
              Lin Yue<small>Personal account</small>
            </span>
            <Icon name="down" size={14} />
          </button>
        </footer>
      </aside>
      <div className="workspace-shell">
        <header className="topbar glass">
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            <Icon name="list" />
          </button>
          <form
            className="global-search"
            ref={searchBox}
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (search.trim()) searchFor(search);
            }}
          >
            <label className="search-scope">
              <Icon name="folder" size={15} />
              <select
                aria-label="Search scope"
                value={searchScope}
                onChange={(e) => setSearchScope(e.target.value)}
              >
                <option value="all">Design archive</option>
                <option value="orbit">Orbit project</option>
              </select>
            </label>
            <Icon name="search" />
            <input
              ref={searchRef}
              aria-label="Search your workspace"
              placeholder="Search files, or describe what you remember…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              autoComplete="off"
            />
            <kbd>Ctrl K</kbd>
            {search && (
              <button
                className="icon-button search-clear"
                aria-label="Clear search"
                type="button"
                onClick={() => {
                  setSearch("");
                  setQuery("");
                  searchRef.current?.focus();
                }}
              >
                <Icon name="close" size={14} />
              </button>
            )}
            <button
              className="button primary small search-submit"
              disabled={!search.trim()}
            >
              Search
            </button>
            {searchOpen && (
              <div className="search-dropdown">
                <div className="dropdown-heading">
                  <span>
                    {search ? "MATCHING FILES" : "START WITH A SEARCH"}
                  </span>
                  <kbd>Esc</kbd>
                </div>
                {search ? (
                  searchMatches.length ? (
                    searchMatches.map((f) => (
                      <button
                        type="button"
                        key={f.id}
                        onClick={() => {
                          setDialog({ type: "details", id: f.id });
                          setSearchOpen(false);
                        }}
                      >
                        <span className="mini-file">
                          <Icon name="file" />
                        </span>
                        <span>
                          {f.name}
                          <small>{nicePath(f.path)}</small>
                        </span>
                        <Icon name="chevron" size={14} />
                      </button>
                    ))
                  ) : (
                    <p className="search-no-results">
                      No files match “{search}”. Try orbit, reference or motion.
                    </p>
                  )
                ) : (
                  ["orbit", "reference", "motion"].map((q) => (
                    <button key={q} type="button" onClick={() => searchFor(q)}>
                      <Icon name="history" />
                      <span>{q}</span>
                      <Icon name="arrow" size={14} />
                    </button>
                  ))
                )}
                {search && (
                  <button
                    className="all-results"
                    type="button"
                    onClick={() => searchFor(search)}
                  >
                    View all results for “{search}”{" "}
                    <Icon name="arrow" size={16} />
                  </button>
                )}
                <small className="search-hint">
                  Searches filenames, folders and tags in the demo workspace.
                </small>
              </div>
            )}
          </form>
          <span className="demo-label">
            <span />
            Demo workspace
          </span>
          <button
            className="text-button help-button"
            onClick={() => setDialog({ type: "help" })}
          >
            Help
          </button>
          <button
            className="avatar"
            aria-label="Workspace settings"
            onClick={() => nav("settings")}
          >
            LY
          </button>
        </header>
        <div className="workspace-body">
          <main
            id="main-content"
            ref={contentRef}
            className="main-content"
            tabIndex={-1}
          >
            <div className="page-heading">
              <div>
                <div className="breadcrumb">
                  WORKSPACE <span>/</span> DESIGN ARCHIVE
                </div>
                <h1>{currentTitle}</h1>
                <p>
                  {state.view === "organize" && state.phase === "select"
                    ? "Make room for your next idea."
                    : state.view === "browse" && query
                      ? `Results for “${query}” · ${visible.length} files`
                      : state.view === "history"
                        ? "A clear record of every change you approved."
                        : "Design archive · Your choices stay in your control."}
                </p>
              </div>
              {state.view === "organize" && (
                <div className="stepper">
                  {["Select", "Review", "Apply"].map((s, i) => (
                    <span
                      className={
                        (state.phase === "select"
                          ? 0
                          : ["analyzing", "review", "confirm"].includes(
                                state.phase,
                              )
                            ? 1
                            : 2) === i
                          ? "active"
                          : ""
                      }
                      key={s}
                    >
                      <b>{i + 1}</b>
                      {s}
                      {i < 2 && <Icon name="chevron" size={12} />}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {storageError && (
              <div className="notice warning">
                Browser storage is unavailable. Your changes work in this
                session, but cannot be saved after closing.
              </div>
            )}
            {state.view === "organize" && (
              <>
                {state.phase === "select" && (
                  <>
                    <section className="panel scope-panel">
                      <div className="scope-heading">
                        <span className="icon-tile">
                          <Icon name="folder" size={26} />
                        </span>
                        <div>
                          <h2>{state.project}</h2>
                          <p>Documents / {state.project}</p>
                        </div>
                        <div className="scope-metrics">
                          <span>
                            <b>{scoped.length}</b>
                            <small>Files</small>
                          </span>
                          <span>
                            <b>
                              {formatSize(
                                scoped.reduce((s, f) => s + f.size, 0),
                              )}
                            </b>
                            <small>Total size</small>
                          </span>
                          <span>
                            <b>{state.scope.length}</b>
                            <small>Folders</small>
                          </span>
                        </div>
                        <button className="button small" onClick={scopeDialog}>
                          Change folder
                        </button>
                      </div>
                      <div className="scope-tabs">
                        <button
                          className="button small source-button"
                          onClick={scopeDialog}
                        >
                          <Icon name="computer" size={14} />
                          This computer
                          <Icon name="down" size={12} />
                        </button>
                        {categoryTabs(scoped)}
                      </div>
                      {homePreviews.length ? (
                        <div className="file-grid home-grid">
                          {homePreviews.map((f) => fileCard(f))}
                        </div>
                      ) : (
                        <Empty
                          title="No files in this scope"
                          text="Choose another category or include more folders."
                        />
                      )}
                      <div className="scope-bottom">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={state.subfolders}
                            onChange={(e) =>
                              dispatch({
                                type: "SCOPE",
                                scope: state.scope,
                                project: state.project,
                                subfolders: e.target.checked,
                              })
                            }
                          />
                          Include subfolders
                        </label>
                        <button className="subtle-button" onClick={scopeDialog}>
                          {4 - state.scope.length} folders excluded{" "}
                          <Icon name="down" size={12} />
                        </button>
                        <button
                          className="text-button view-files"
                          onClick={() => {
                            nav("browse");
                            setCategory("All");
                            setQuery("");
                          }}
                        >
                          View all{" "}
                          {
                            state.files.filter((f) => f.status !== "trashed")
                              .length
                          }{" "}
                          files <Icon name="arrow" size={16} />
                        </button>
                      </div>
                      <div className="micro-footer">
                        <span>
                          Showing {homePreviews.length} of {scoped.length} files
                        </span>
                        <span>Demo file previews</span>
                      </div>
                    </section>
                    <section className="panel goal-panel">
                      <div className="section-heading">
                        <h2>Your goal</h2>
                        <span>What would make this workspace better?</span>
                      </div>
                      <div className="goal-options">
                        {goals.map((g, i) => (
                          <button
                            className={state.goal === g ? "selected" : ""}
                            key={g}
                            onClick={() => dispatch({ type: "GOAL", goal: g })}
                            aria-pressed={state.goal === g}
                          >
                            <Icon name={["spark", "folder", "history"][i]} />
                            <span>{g}</span>
                            <i />
                          </button>
                        ))}
                      </div>
                      <div className="goal-note">
                        <span>
                          <Icon name="check" size={14} />
                          {state.rules.protectSources
                            ? "Keep sources & key versions"
                            : "Review source files individually"}
                        </span>
                        <button
                          className="text-button"
                          onClick={() => nav("rules")}
                        >
                          Edit rules
                        </button>
                      </div>
                    </section>
                    <div className="bottom-actions">
                      <span>
                        <Icon name="shield" size={17} />
                        No changes until you approve
                      </span>
                      <button
                        className="button primary"
                        disabled={!scoped.length}
                        onClick={() => analyze()}
                      >
                        Analyze {scoped.length} files{" "}
                        <Icon name="arrow" size={17} />
                      </button>
                    </div>
                  </>
                )}
                {state.phase === "analyzing" && (
                  <section className="panel progress-panel">
                    <div className="orb-loader">
                      <Icon name="spark" size={42} />
                    </div>
                    <span className="eyebrow">
                      A LITTLE ORDER, A LITTLE CLARITY
                    </span>
                    <h2>Finding the story in your files</h2>
                    <p>
                      Checking metadata for {reviewed.length} files.
                      <br />
                      Your files stay exactly where they are.
                    </p>
                    <div className="progress-track">
                      <span style={{ width: `${analysisProgress}%` }} />
                    </div>
                    <div className="progress-label">
                      <span>
                        {analysisProgress < 40
                          ? "Identifying file types"
                          : analysisProgress < 80
                            ? "Looking for version families"
                            : "Preparing your suggestions"}
                      </span>
                      <b>{analysisProgress}%</b>
                    </div>
                    <button className="button" onClick={() => phase("select")}>
                      Cancel analysis
                    </button>
                  </section>
                )}
                {state.phase === "review" && (
                  <>
                    {stats()}
                    {fileCollection(true)}
                    <div className="notice">
                      <Icon name="info" />
                      <div>
                        <strong>Suggestions need your judgment</strong>
                        <p>
                          Previews are illustrative. Unknown formats and
                          undecided files stay unchanged.
                        </p>
                      </div>
                    </div>
                    <div className="bottom-actions">
                      <span>
                        {reviewed.length - counts[3]} decisions ready ·{" "}
                        {counts[3]} undecided
                      </span>
                      <div>
                        <button
                          className="button"
                          onClick={() => setDialog({ type: "compare" })}
                        >
                          Compare orbit versions
                        </button>
                        <button
                          className="button primary"
                          onClick={() => phase("confirm")}
                        >
                          Review actions <Icon name="arrow" size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
                {state.phase === "confirm" && (
                  <>
                    {stats()}
                    <section className="panel confirmation-panel">
                      <div className="section-heading">
                        <h2>Your organization plan</h2>
                        <span>{planned.length} proposed changes</span>
                      </div>
                      {planned.length ? (
                        <div className="table-scroll plan-table">
                          <table>
                            <thead>
                              <tr>
                                <th>FILE</th>
                                <th>ACTION</th>
                                <th>DESTINATION</th>
                              </tr>
                            </thead>
                            <tbody>
                              {planned.map((f) => (
                                <tr key={f.id}>
                                  <td>
                                    <button
                                      className="table-file"
                                      onClick={() =>
                                        setDialog({ type: "details", id: f.id })
                                      }
                                    >
                                      <Icon name="file" />
                                      {f.name}
                                    </button>
                                  </td>
                                  <td>
                                    <span
                                      className={`badge ${state.decisions[f.id]}`}
                                    >
                                      {decisionLabels[state.decisions[f.id]]}
                                    </span>
                                  </td>
                                  <td className="path-cell">
                                    {nicePath(
                                      targetPath(
                                        f,
                                        state.decisions[f.id] as
                                          | "archive"
                                          | "trash",
                                      ),
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <Empty
                          icon="check"
                          title="Everything stays in place"
                          text="There are no moves to apply. You can change decisions or return to your files."
                        />
                      )}
                    </section>
                    <div className="notice">
                      <Icon name="shield" />
                      <div>
                        <strong>
                          Archiving organizes files; it does not free storage.
                        </strong>
                        <p>
                          Trash actions are reversible in this demo. Kept and
                          undecided files remain in their current locations.
                        </p>
                      </div>
                    </div>
                    <label className="checkbox-label confirm-check">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                      />
                      I have reviewed these {planned.length} operations and
                      their destinations.
                    </label>
                    <div className="bottom-actions">
                      <span>No operations run before confirmation.</span>
                      <div>
                        <button
                          className="button"
                          onClick={() => phase("review")}
                        >
                          Edit decisions
                        </button>
                        <button
                          className="button primary"
                          disabled={!confirmed || !planned.length}
                          onClick={() => {
                            dispatch({
                              type: "APPLY",
                              id: `task-${Date.now()}`,
                              at: now(),
                            });
                            setConfirmed(false);
                          }}
                        >
                          Confirm {planned.length} operations{" "}
                          <Icon name="arrow" size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
                {state.phase === "applying" && (
                  <section className="panel progress-panel">
                    <div className="orb-loader">
                      <Icon name="folder" size={40} />
                    </div>
                    <h2>A place for every file</h2>
                    <p>
                      Applying only the operations you approved.
                      <br />
                      Progress is saved in this browser.
                    </p>
                    <div className="progress-track">
                      <span
                        style={{
                          width: `${(100 * (completed + failed)) / (activeTask?.operations.length || 1)}%`,
                        }}
                      />
                    </div>
                    <div className="progress-label">
                      <span>
                        {completed + failed} of{" "}
                        {activeTask?.operations.length || 0} processed
                      </span>
                      <b>
                        {Math.round(
                          (100 * (completed + failed)) /
                            (activeTask?.operations.length || 1),
                        )}
                        %
                      </b>
                    </div>
                  </section>
                )}
                {state.phase === "results" && (
                  <>
                    <section className="panel result-hero">
                      <span
                        className={`result-icon ${failed ? "warning" : ""}`}
                      >
                        <Icon name={failed ? "info" : "check"} size={32} />
                      </span>
                      <div>
                        <span className="eyebrow">
                          {failed
                            ? "YOUR COMPLETED CHANGES ARE SAVED"
                            : "A LITTLE MORE ROOM TO CREATE"}
                        </span>
                        <h2>
                          {failed
                            ? `${completed} changes completed. ${failed} need a retry.`
                            : "Everything is in its new place."}
                        </h2>
                        <p>
                          {failed
                            ? "A demo file-in-use error stopped one move. Successful operations will not run again."
                            : "Your original locations are saved. You can undo a move from History & recovery."}
                        </p>
                      </div>
                    </section>
                    <div className="stats result-stats">
                      <div className="stat">
                        <strong>{completed}</strong>
                        <span>Completed operations</span>
                      </div>
                      <div className="stat">
                        <strong>{failed}</strong>
                        <span>Failed · unchanged</span>
                      </div>
                      <div className="stat">
                        <strong>
                          {activeTask
                            ? (activeTask.analyzedCount ?? reviewed.length) -
                              activeTask.operations.length
                            : 0}
                        </strong>
                        <span>Kept or undecided</span>
                      </div>
                    </div>
                    <section className="panel">
                      <div className="section-heading">
                        <h2>Task details</h2>
                        <span>
                          {activeTask
                            ? displayDate(activeTask.created)
                            : "No task yet"}
                        </span>
                      </div>
                      <div className="operation-list">
                        {activeTask?.operations.map((op) => (
                          <div key={op.id}>
                            <span className={`operation-icon ${op.status}`}>
                              <Icon
                                name={
                                  op.status === "failed"
                                    ? "info"
                                    : op.decision === "archive"
                                      ? "archive"
                                      : "trash"
                                }
                                size={18}
                              />
                            </span>
                            <div>
                              <strong>{op.name}</strong>
                              <small>
                                {op.status === "failed"
                                  ? op.error
                                  : nicePath(op.to)}
                              </small>
                            </div>
                            <span className={`badge ${op.status}`}>
                              {op.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                    <div className="bottom-actions">
                      <button
                        className="text-button"
                        onClick={() => phase("select")}
                      >
                        Start a new task
                      </button>
                      <div>
                        {failed > 0 && (
                          <button
                            className="button"
                            onClick={() =>
                              dispatch({ type: "RETRY", id: activeTask!.id })
                            }
                          >
                            Retry {failed} failed{" "}
                            {failed === 1 ? "file" : "files"}
                          </button>
                        )}
                        <button
                          className="button primary"
                          onClick={() => nav("history")}
                        >
                          View history & recovery{" "}
                          <Icon name="arrow" size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
            {state.view === "browse" && (
              <>
                {fileCollection(false)}
                <div className="bottom-actions">
                  <span>
                    <Icon name="shield" size={17} />
                    Files stay in the locations you choose
                  </span>
                  <div>
                    <button
                      className="button"
                      onClick={() => setDialog({ type: "compare" })}
                    >
                      Compare orbit versions
                    </button>
                    <button
                      className="button primary"
                      disabled={
                        busy ||
                        !(
                          selected.length
                            ? state.files.filter((f) => selected.includes(f.id))
                            : visible
                        ).some((f) => f.status === "active")
                      }
                      onClick={() =>
                        analyze(
                          selected.length ? selected : visible.map((f) => f.id),
                        )
                      }
                    >
                      Organize{" "}
                      {selected.length
                        ? `${selected.length} selected`
                        : "these files"}{" "}
                      <Icon name="arrow" size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
            {state.view === "history" && (
              <>
                <div className="stats result-stats">
                  <div className="stat">
                    <strong>{state.history.length}</strong>
                    <span>Completed operations</span>
                  </div>
                  <div className="stat">
                    <strong>
                      {state.history.filter((h) => h.restoredAt).length}
                    </strong>
                    <span>Restored files</span>
                  </div>
                  <div className="stat">
                    <strong>
                      {
                        state.tasks
                          .flatMap((t) => t.operations)
                          .filter((o) => o.status === "failed").length
                      }
                    </strong>
                    <span>Failed · unchanged</span>
                  </div>
                </div>
                <section className="panel">
                  <div className="tabs">
                    {["All actions", "Archive moves", "Trash", "Restored"].map(
                      (f) => (
                        <button
                          className={historyFilter === f ? "active" : ""}
                          key={f}
                          onClick={() => setHistoryFilter(f)}
                        >
                          {f}
                        </button>
                      ),
                    )}
                  </div>
                  {!state.history.filter(
                    (h) =>
                      historyFilter === "All actions" ||
                      (historyFilter === "Restored" && h.restoredAt) ||
                      (historyFilter === "Archive moves" &&
                        h.decision === "archive") ||
                      (historyFilter === "Trash" && h.decision === "trash"),
                  ).length ? (
                    <Empty
                      icon="history"
                      title="A fresh start"
                      text="Your approved changes will appear here. Every move can be traced back to its original location."
                    >
                      <button
                        className="button"
                        onClick={() => nav("organize")}
                      >
                        Start organizing
                      </button>
                    </Empty>
                  ) : (
                    <div className="history-list">
                      {state.history
                        .filter(
                          (h) =>
                            historyFilter === "All actions" ||
                            (historyFilter === "Restored" && h.restoredAt) ||
                            (historyFilter === "Archive moves" &&
                              h.decision === "archive") ||
                            (historyFilter === "Trash" &&
                              h.decision === "trash"),
                        )
                        .map((h) => (
                          <div className="history-row" key={h.id}>
                            <span className="icon-tile">
                              <Icon
                                name={
                                  h.restoredAt
                                    ? "restore"
                                    : h.decision === "archive"
                                      ? "archive"
                                      : "trash"
                                }
                              />
                            </span>
                            <div>
                              <strong>{h.name}</strong>
                              <p>
                                {h.restoredAt
                                  ? "Restored to original location"
                                  : nicePath(h.to)}
                              </p>
                              <small>
                                {displayDate(h.restoredAt || h.at)} ·{" "}
                                {h.restoredAt
                                  ? "Restored"
                                  : decisionLabels[h.decision]}
                              </small>
                            </div>
                            <button
                              className="button small"
                              disabled={
                                !!h.restoredAt ||
                                busy ||
                                state.files.find((f) => f.id === h.fileId)
                                  ?.path !== h.to
                              }
                              onClick={() =>
                                setDialog({ type: "restore", id: h.id })
                              }
                            >
                              {h.restoredAt ? "Restored" : "Restore"}
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </section>
                <div className="notice">
                  <Icon name="restore" />
                  <div>
                    <strong>Every move has a way back.</strong>
                    <p>
                      Restore returns a file to its recorded location. A
                      conflicting or newer move must be resolved first.
                    </p>
                  </div>
                </div>
              </>
            )}
            {state.view === "tasks" && (
              <section className="panel">
                {!state.tasks.length ? (
                  <Empty
                    icon="list"
                    title="Your next clear workspace starts here"
                    text="Completed and in-progress organizing tasks will appear here."
                  >
                    <button
                      className="button primary"
                      onClick={() => nav("organize")}
                    >
                      Start organizing
                    </button>
                  </Empty>
                ) : (
                  <div className="task-list">
                    {state.tasks.map((t) => {
                      const fail = t.operations.filter(
                        (o) => o.status === "failed",
                      ).length;
                      const queued = t.operations.filter(
                        (o) => o.status === "queued",
                      ).length;
                      return (
                        <article key={t.id}>
                          <span className="icon-tile">
                            <Icon name="folder" size={24} />
                          </span>
                          <div>
                            <h2>Design archive</h2>
                            <p>
                              {t.goal} · {t.operations.length} operations
                            </p>
                            <small>{displayDate(t.created)}</small>
                          </div>
                          <span
                            className={`badge ${fail ? "failed" : "completed"}`}
                          >
                            {queued
                              ? "In progress"
                              : fail
                                ? "Needs attention"
                                : "Completed"}
                          </span>
                          {fail > 0 ? (
                            <button
                              className="button small"
                              disabled={busy}
                              onClick={() =>
                                dispatch({ type: "RETRY", id: t.id })
                              }
                            >
                              Retry failed
                            </button>
                          ) : (
                            <button
                              className="button small"
                              onClick={() => nav("history")}
                            >
                              View history
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
            {state.view === "rules" && (
              <>
                <section className="panel settings-panel">
                  <span className="eyebrow">A FEW THOUGHTFUL DEFAULTS</span>
                  <h2>Organize your way</h2>
                  <p>
                    These rules guide the next analysis. You still approve every
                    change.
                  </p>
                  {(
                    [
                      {
                        key: "protectSources",
                        title: "Protect original source files",
                        text: "Suggest keeping editable project sources and key versions.",
                      },
                      {
                        key: "archiveOlder",
                        title: "Suggest an archive for earlier studies",
                        text: "Move older references and studies out of the way, while keeping them accessible.",
                      },
                    ] as const
                  ).map((r) => (
                    <label className="setting-row" key={r.key}>
                      <span>
                        <strong>{r.title}</strong>
                        <small>{r.text}</small>
                      </span>
                      <input
                        className="switch"
                        type="checkbox"
                        checked={state.rules[r.key]}
                        onChange={(e) => {
                          dispatch({
                            type: "RULE",
                            key: r.key,
                            value: e.target.checked,
                          });
                          setToast(
                            "Rule saved. It will apply to your next analysis.",
                          );
                        }}
                      />
                    </label>
                  ))}
                </section>
                <div className="notice">
                  <Icon name="shield" />
                  <div>
                    <strong>Uncertain files stay untouched.</strong>
                    <p>
                      Needs review is always an option. No rule can bypass the
                      confirmation step.
                    </p>
                  </div>
                </div>
              </>
            )}
            {state.view === "settings" && (
              <>
                <section className="panel settings-panel">
                  <span className="eyebrow">YOUR WORKSPACE</span>
                  <h2>A local space to try Fileo</h2>
                  <p>
                    This prototype runs with 42 example files. Your actual
                    computer files are never changed.
                  </p>
                  <div className="setting-row">
                    <span>
                      <strong>This computer · demo dataset</strong>
                      <small>Saved in this browser using local storage.</small>
                    </span>
                    <span className="badge completed">Connected locally</span>
                  </div>
                  <div className="setting-row">
                    <span>
                      <strong>Demo session</strong>
                      <small>
                        Return to the welcome screen. Your workspace progress
                        stays saved.
                      </small>
                    </span>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() => {
                        window.location.hash = "/welcome";
                      }}
                    >
                      Back to welcome
                    </button>
                  </div>
                  <div className="setting-row">
                    <span>
                      <strong>Cloud drive</strong>
                      <small>
                        A future integration. No cloud account is connected.
                      </small>
                    </span>
                    <span className="badge">Coming later</span>
                  </div>
                  <label className="setting-row">
                    <span>
                      <strong>Simulate a file-in-use error</strong>
                      <small>
                        render_preview.bip fails once when moved, then succeeds
                        on retry.
                      </small>
                    </span>
                    <input
                      className="switch"
                      type="checkbox"
                      checked={state.rules.simulateFailure}
                      onChange={(e) =>
                        dispatch({
                          type: "RULE",
                          key: "simulateFailure",
                          value: e.target.checked,
                        })
                      }
                    />
                  </label>
                  <div className="setting-row">
                    <span>
                      <strong>Export this demo workspace</strong>
                      <small>
                        Download your file decisions, tasks and history as JSON.
                      </small>
                    </span>
                    <button className="button" onClick={exportData}>
                      <Icon name="download" />
                      Export
                    </button>
                  </div>
                </section>
                <section className="panel reset-panel">
                  <div>
                    <h2>Start fresh</h2>
                    <p>
                      Restore the original 42 example files and clear demo
                      history.
                    </p>
                  </div>
                  <button
                    className="button danger"
                    disabled={busy}
                    onClick={() => setDialog({ type: "reset" })}
                  >
                    Reset demo
                  </button>
                </section>
              </>
            )}
            <footer className="workspace-footnote">
              <span className="live-dot" />
              {storageError ? "Session only" : "Saved locally"}
              <span>·</span>Fileo prototype
              <Icon name="spark" size={12} />
            </footer>
          </main>
          {assistant}
        </div>
      </div>
      <button
        className="assistant-fab"
        onClick={() => setShowAssistant(!showAssistant)}
      >
        <Icon name="spark" />
        Ask Fileo
      </button>
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          {toast}
          <button aria-label="Dismiss message" onClick={() => setToast("")}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
      {dialog && (
        <Modal
          title={
            dialog.type === "scope"
              ? "Choose your file scope"
              : dialog.type === "details"
                ? "File details"
                : dialog.type === "compare"
                  ? "Compare versions"
                  : dialog.type === "restore"
                    ? "Restore this file"
                    : dialog.type === "reset"
                      ? "Start with a fresh workspace?"
                      : dialog.type === "privacy"
                        ? "Privacy & access"
                        : dialog.type === "supported"
                          ? "Supported demo files"
                          : "Welcome to Fileo"
          }
          subtitle={
            dialog.type === "compare"
              ? "A shared name is a clue. Your judgment makes the decision."
              : undefined
          }
          wide={dialog.type === "compare"}
          onClose={() => setDialog(null)}
        >
          {dialog.type === "scope" && (
            <>
              <div className="modal-content">
                <label className="field-label">
                  Workspace
                  <select
                    value={projectDraft}
                    onChange={(e) =>
                      setProjectDraft(e.target.value as State["project"])
                    }
                  >
                    <option>Design archive</option>
                    <option>Orbit project</option>
                  </select>
                </label>
                <span className="eyebrow">INCLUDE FOLDERS</span>
                <div className="scope-choices">
                  {categories.map((c) => (
                    <label key={c}>
                      <Icon name="folder" />
                      <span>
                        {c}
                        <small>
                          {
                            state.files.filter(
                              (f) =>
                                f.category === c &&
                                f.status === "active" &&
                                (projectDraft === "Design archive" ||
                                  f.tags.includes("orbit")),
                            ).length
                          }{" "}
                          active files
                        </small>
                      </span>
                      <input
                        type="checkbox"
                        checked={scopeDraft.includes(c)}
                        onChange={(e) =>
                          setScopeDraft(
                            e.target.checked
                              ? [...scopeDraft, c]
                              : scopeDraft.filter((x) => x !== c),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={subDraft}
                    onChange={(e) => setSubDraft(e.target.checked)}
                  />
                  Include subfolders
                </label>
                <p className="muted">
                  {
                    inScope({
                      ...state,
                      scope: scopeDraft,
                      subfolders: subDraft,
                      project: projectDraft,
                    }).length
                  }{" "}
                  example files in this scope.
                </p>
              </div>
              <div className="modal-actions">
                <button className="button" onClick={() => setDialog(null)}>
                  Cancel
                </button>
                <button
                  className="button primary"
                  disabled={!scopeDraft.length}
                  onClick={() => {
                    dispatch({
                      type: "SCOPE",
                      scope: scopeDraft,
                      subfolders: subDraft,
                      project: projectDraft,
                    });
                    setCategory("All");
                    setDialog(null);
                  }}
                >
                  Use this scope
                </button>
              </div>
            </>
          )}
          {dialog.type === "details" &&
            (() => {
              const f = state.files.find((f) => f.id === dialog.id)!;
              const d = state.decisions[f.id] || f.suggestion;
              return (
                <>
                  <div className="modal-content detail-layout">
                    <Preview file={f} large />
                    <div>
                      <h3>{f.name}</h3>
                      <span className={`badge ${f.status}`}>{f.status}</span>
                      <dl>
                        <dt>Size</dt>
                        <dd>{formatSize(f.size)}</dd>
                        <dt>Modified</dt>
                        <dd>{f.modified}</dd>
                        <dt>Location</dt>
                        <dd>{f.path}</dd>
                        <dt>Tags</dt>
                        <dd>{f.tags.join(" · ")}</dd>
                      </dl>
                      <div className="detail-reason">
                        <span className="eyebrow">WHY THIS SUGGESTION</span>
                        <p>{reason(f, d)}</p>
                      </div>
                      <p className="fineprint">
                        Illustrative preview from the design. The original file
                        is not loaded in this demo.
                      </p>
                    </div>
                  </div>
                  <div className="modal-actions">
                    {state.analyzedIds.includes(f.id) &&
                    state.phase === "review" ? (
                      <>
                        <label className="decision-label">
                          Your decision
                          <select
                            value={d}
                            onChange={(e) =>
                              dispatch({
                                type: "DECIDE",
                                id: f.id,
                                decision: e.target.value as Decision,
                              })
                            }
                          >
                            {Object.entries(decisionLabels).map(
                              ([key, label]) => (
                                <option key={key} value={key}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                        <button
                          className="button primary"
                          onClick={() => {
                            setDialog(null);
                            setToast(
                              "Your decision is saved in the review draft.",
                            );
                          }}
                        >
                          Done
                        </button>
                      </>
                    ) : (
                      <>
                        {f.name.startsWith("orbit_v") && (
                          <button
                            className="button"
                            onClick={() => setDialog({ type: "compare" })}
                          >
                            Compare versions
                          </button>
                        )}
                        <button
                          className="button primary"
                          onClick={() => setDialog(null)}
                        >
                          Done
                        </button>
                      </>
                    )}
                  </div>
                </>
              );
            })()}
          {dialog.type === "compare" && (
            <>
              <div className="compare-grid">
                {["f02", "f01"].map((id) => {
                  const f = state.files.find((f) => f.id === id)!;
                  return (
                    <article key={id}>
                      <div className="compare-heading">
                        <span>
                          {id === "f01" ? "LATEST VERSION" : "EARLIER VERSION"}
                        </span>
                        <span
                          className={`badge ${id === "f01" ? "keep" : "review"}`}
                        >
                          {id === "f01" ? "Suggested keep" : "Your choice"}
                        </span>
                      </div>
                      <Preview file={f} large />
                      <h3>{f.name}</h3>
                      <dl>
                        <dt>Modified</dt>
                        <dd>{f.modified}</dd>
                        <dt>Size</dt>
                        <dd>{formatSize(f.size)}</dd>
                        <dt>Location</dt>
                        <dd>{nicePath(f.path)}</dd>
                      </dl>
                      {state.phase === "review" &&
                      state.analyzedIds.includes(id) ? (
                        <label className="field-label">
                          Your decision
                          <select
                            aria-label={`Compare decision for ${f.name}`}
                            value={state.decisions[id]}
                            onChange={(e) =>
                              dispatch({
                                type: "DECIDE",
                                id,
                                decision: e.target.value as Decision,
                              })
                            }
                          >
                            {Object.entries(decisionLabels).map(
                              ([key, label]) => (
                                <option value={key} key={key}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                      ) : (
                        <span className={`badge ${f.status}`}>{f.status}</span>
                      )}
                    </article>
                  );
                })}
              </div>
              <div className="notice compare-notice">
                <Icon name="info" />
                <p>
                  Names and dates suggest these files are related. The demo
                  cannot verify content differences or prove that an earlier
                  version is redundant.
                </p>
              </div>
              <div className="modal-actions">
                <button
                  className="button primary"
                  onClick={() => setDialog(null)}
                >
                  Done comparing
                </button>
              </div>
            </>
          )}
          {dialog.type === "restore" &&
            (() => {
              const h = state.history.find(
                (h) => h.id === dialog.id,
              ) as HistoryEntry;
              return (
                <>
                  <div className="modal-content">
                    <div className="restore-file">
                      <Icon name="restore" size={28} />
                      <h3>{h.name}</h3>
                    </div>
                    <div className="path-preview">
                      <span>CURRENT LOCATION</span>
                      <p>{h.to}</p>
                      <Icon name="down" />
                      <span>RESTORE TO</span>
                      <p>{h.from}</p>
                    </div>
                    <p className="muted">
                      This reverses the selected demo move. The operation
                      remains recorded in history.
                    </p>
                  </div>
                  <div className="modal-actions">
                    <button className="button" onClick={() => setDialog(null)}>
                      Cancel
                    </button>
                    <button
                      className="button primary"
                      onClick={() => {
                        dispatch({ type: "RESTORE", id: h.id, at: now() });
                        setDialog(null);
                        setToast(
                          `${h.name} restored to its original location.`,
                        );
                      }}
                    >
                      Restore file
                    </button>
                  </div>
                </>
              );
            })()}
          {dialog.type === "reset" && (
            <>
              <div className="modal-content">
                <p>
                  This will clear demo decisions, tasks and history in this
                  browser and restore the original 42 example files.
                </p>
                <p>Your actual files are unaffected.</p>
              </div>
              <div className="modal-actions">
                <button className="button" onClick={() => setDialog(null)}>
                  Keep my progress
                </button>
                <button
                  className="button primary"
                  onClick={() => {
                    dispatch({ type: "RESET" });
                    setDialog(null);
                    setQuery("");
                    setSearch("");
                    setCategory("All");
                    setFormat("All");
                    setLocation("All locations");
                    setDecisionFilter("All");
                    setSearchScope("all");
                    setAnswer(null);
                    setShowAssistant(false);
                    setMobileMenu(false);
                    window.location.hash = "/organize";
                    setToast(
                      "Fresh workspace ready. All 42 demo files restored.",
                    );
                  }}
                >
                  Reset demo
                </button>
              </div>
            </>
          )}
          {dialog.type === "help" && (
            <>
              <div className="modal-content help-content">
                <span className="eyebrow">A HOME FOR YOUR CREATIVE FILES</span>
                <p>Try one complete journey through the local prototype.</p>
                <ol>
                  <li>
                    Choose a scope and goal, then <strong>Analyze files</strong>
                    .
                  </li>
                  <li>
                    Compare orbit versions and set v03 to{" "}
                    <strong>Archive</strong>.
                  </li>
                  <li>
                    Review destinations, check the confirmation box and apply.
                  </li>
                  <li>
                    Retry the example failure, then open{" "}
                    <strong>History & recovery</strong>.
                  </li>
                  <li>
                    Restore a file and find it again using{" "}
                    <strong>Ctrl K</strong>.
                  </li>
                </ol>
                <div className="notice">
                  42 example files · Real interface state · Browser-only storage
                </div>
                <p className="muted">
                  Previews and assistant responses are demonstrations. No real
                  files are accessed, and no external AI service is connected.
                </p>
              </div>
              <div className="modal-actions">
                <button
                  className="button primary"
                  onClick={() => setDialog(null)}
                >
                  Let's explore <Icon name="arrow" />
                </button>
              </div>
            </>
          )}
          {dialog.type === "privacy" && (
            <>
              <div className="modal-content">
                <Icon name="shield" size={32} />
                <h3>Your workspace stays in this browser.</h3>
                <p>
                  All interactions use the bundled demo dataset. There are no
                  uploads, account connections, filesystem permissions or AI API
                  requests.
                </p>
                <p>
                  Decisions and history are saved in local storage. Use Settings
                  → Reset demo to clear them.
                </p>
              </div>
              <div className="modal-actions">
                <button
                  className="button primary"
                  onClick={() => setDialog(null)}
                >
                  Got it
                </button>
              </div>
            </>
          )}
          {dialog.type === "supported" && (
            <>
              <div className="modal-content">
                <h3>Creative files, in context.</h3>
                <p>
                  The example archive contains BLEND, FIG, PDF, PNG, JPG, TOE,
                  AEP and video records.
                </p>
                <p>
                  The prototype searches metadata and displays illustrative
                  previews. It does not parse or edit the original file
                  contents. Unknown contents remain available for your review.
                </p>
              </div>
              <div className="modal-actions">
                <button
                  className="button primary"
                  onClick={() => setDialog(null)}
                >
                  Got it
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
