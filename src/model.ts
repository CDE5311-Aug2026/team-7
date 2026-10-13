export type Category = "Sources" | "Renders" | "Research" | "Motion";
export type Decision = "keep" | "archive" | "trash" | "review";
export type Goal = "Free up space" | "Organize a project" | "Compare versions";
export type View =
  | "organize"
  | "browse"
  | "tasks"
  | "history"
  | "rules"
  | "settings";
export type Phase =
  | "select"
  | "analyzing"
  | "review"
  | "confirm"
  | "applying"
  | "results";
export interface FileItem {
  id: string;
  name: string;
  category: Category;
  size: number;
  modified: string;
  path: string;
  originalPath: string;
  status: "active" | "archived" | "trashed";
  tags: string[];
  preview: "orbit7" | "orbit3" | "reference" | "motion" | "generic";
  suggestion: Decision;
  nested: boolean;
}
export interface Operation {
  id: string;
  fileId: string;
  name: string;
  decision: "archive" | "trash";
  from: string;
  to: string;
  previousStatus: FileItem["status"];
  status: "queued" | "completed" | "failed";
  error?: string;
}
export interface Task {
  id: string;
  created: string;
  goal: Goal;
  analyzedCount: number;
  operations: Operation[];
}
export interface HistoryEntry extends Operation {
  taskId: string;
  at: string;
  restoredAt?: string;
}
export interface State {
  version: 1;
  files: FileItem[];
  view: View;
  phase: Phase;
  goal: Goal;
  scope: Category[];
  subfolders: boolean;
  project: "Design archive" | "Orbit project";
  decisions: Record<string, Decision>;
  analyzedIds: string[];
  tasks: Task[];
  activeTaskId: string | null;
  history: HistoryEntry[];
  rules: {
    protectSources: boolean;
    archiveOlder: boolean;
    simulateFailure: boolean;
  };
}
export const categories: Category[] = [
  "Sources",
  "Renders",
  "Research",
  "Motion",
];
export const decisionLabels: Record<Decision, string> = {
  keep: "Keep",
  archive: "Archive",
  trash: "Move to Trash",
  review: "Needs review",
};
export const STORAGE_KEY = "fileo.workspace.v1";
const names: Record<Category, string[]> = {
  Sources: [
    "orbit_v07.blend",
    "orbit_v03.blend",
    "identity_exploration.fig",
    "material_library.blend",
    "studio_scene.blend",
    "typography_system.fig",
    "packaging_master.ai",
    "brand_guidelines.indd",
    "light_study.blend",
    "poster_layout.fig",
    "sculpture_v02.blend",
    "sculpture_v05.blend",
    "logo_master.svg",
    "color_palette.ase",
  ],
  Renders: [
    "render_preview.bip",
    "orbit_final.png",
    "orbit_test_02.png",
    "orbit_export_copy.png",
    "render_02.png",
    "studio_final.jpg",
    "lighting_test.png",
    "poster_export.pdf",
    "render_01_old.png",
    "export_copy.png",
    "sculpture_final.png",
    "studio_export_copy.jpg",
  ],
  Research: [
    "reference_board.pdf",
    "interview_notes.docx",
    "material_references.pdf",
    "moodboard_v01.pdf",
    "competitor_analysis.pdf",
    "color_research.pdf",
    "archive_references.pdf",
    "research_summary.pdf",
    "usability_notes.docx",
    "old_brief_copy.pdf",
  ],
  Motion: [
    "motion_test.toe",
    "orbit_animation.mp4",
    "transition_study.aep",
    "motion_v01.toe",
    "loop_export.mp4",
    "motion_reference.mov",
  ],
};
export function createFiles(): FileItem[] {
  let index = 0;
  const archives = new Set([14, 16, 18, 20, 22, 26, 28, 29, 30, 31, 32, 39]);
  const trash = new Set([17, 23, 25, 35]);
  const review = new Set([1, 10, 11, 24, 33, 36, 38, 40, 41]);
  return categories.flatMap((category) =>
    names[category].map((name, i) => {
      const n = index++;
      const path = `Documents/Design archive/${category}/${name}`;
      return {
        id: `f${String(n + 1).padStart(2, "0")}`,
        name,
        category,
        size:
          n === 0
            ? 184
            : n === 1
              ? 142
              : n === 26
                ? 18
                : n === 36
                  ? 38
                  : 6 + ((n * 19) % 61),
        modified:
          n === 0
            ? "2026-10-12"
            : n === 1
              ? "2026-07-04"
              : `2026-${n % 3 === 0 ? "06" : "10"}-${String(1 + (n % 12)).padStart(2, "0")}`,
        path,
        originalPath: path,
        status: "active" as const,
        tags:
          name.includes("orbit") || name === "reference_board.pdf"
            ? ["orbit", "3d", "project"]
            : [category.toLowerCase(), name.split("_")[0]],
        preview:
          n === 0
            ? ("orbit7" as const)
            : n === 1
              ? ("orbit3" as const)
              : n === 26
                ? ("reference" as const)
                : n === 36
                  ? ("motion" as const)
                  : ("generic" as const),
        suggestion: archives.has(n)
          ? ("archive" as const)
          : trash.has(n)
            ? ("trash" as const)
            : review.has(n)
              ? ("review" as const)
              : ("keep" as const),
        nested: i > 1,
      };
    }),
  );
}
export function initialState(): State {
  return {
    version: 1,
    files: createFiles(),
    view: "organize",
    phase: "select",
    goal: "Organize a project",
    scope: [...categories],
    subfolders: true,
    project: "Design archive",
    decisions: {},
    analyzedIds: [],
    tasks: [],
    activeTaskId: null,
    history: [],
    rules: { protectSources: true, archiveOlder: true, simulateFailure: true },
  };
}
export function inScope(state: State) {
  return state.files.filter(
    (f) =>
      f.status === "active" &&
      state.scope.includes(f.category) &&
      (state.subfolders || !f.nested) &&
      (state.project === "Design archive" || f.tags.includes("orbit")),
  );
}
export function suggest(file: FileItem, state: State): Decision {
  if (state.goal === "Compare versions")
    return file.name === "orbit_v07.blend"
      ? "keep"
      : file.name === "orbit_v03.blend"
        ? "review"
        : "review";
  if (state.rules.protectSources && file.category === "Sources")
    return file.suggestion === "review" ? "review" : "keep";
  if (!state.rules.archiveOlder && file.suggestion === "archive")
    return "review";
  return file.suggestion;
}
export function reason(file: FileItem, decision: Decision) {
  if (file.name === "orbit_v03.blend")
    return "Earlier version of orbit_v07.blend. Names and dates suggest a relationship; compare both before deciding.";
  if (file.preview === "motion" || file.name.endsWith(".bip"))
    return "Metadata is available, but the original app is needed to verify this file’s contents.";
  if (decision === "archive")
    return "A previous study or reference. Keep it accessible in the project archive without removing its content.";
  if (decision === "trash")
    return "The filename suggests a duplicate export. This is a rule-based clue, not a verified content match. Review before moving.";
  if (decision === "keep")
    return "A source, current output or project asset. Keep it in its existing location.";
  return "There is not enough evidence for a confident action. Your judgment is needed; it will stay unchanged.";
}
export const formatSize = (mb: number) =>
  mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb} MB`;
export function targetPath(file: FileItem, decision: "archive" | "trash") {
  return decision === "archive"
    ? `Documents/Design archive/_Archive/${file.category}/${file.name}`
    : `System Trash/${file.name}`;
}
export function draftFiles(state: State) {
  return state.files.filter((f) => state.analyzedIds.includes(f.id));
}
export function plannedFiles(state: State) {
  return draftFiles(state).filter(
    (f) =>
      state.decisions[f.id] === "archive" || state.decisions[f.id] === "trash",
  );
}
export function searchFiles(files: FileItem[], query: string) {
  const aliases: Record<string, string> = {
    "3d models": "3d",
    "three dimensional": "3d",
    参考: "reference",
    轨道: "orbit",
  };
  const normalized =
    aliases[query.trim().toLowerCase()] ?? query.trim().toLowerCase();
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return files.filter((f) =>
    tokens.every((token) =>
      `${f.name} ${f.path} ${f.category} ${f.tags.join(" ")}`
        .toLowerCase()
        .includes(token),
    ),
  );
}
export type Action =
  | { type: "NAV"; view: View }
  | {
      type: "SCOPE";
      scope: Category[];
      subfolders: boolean;
      project: State["project"];
    }
  | { type: "GOAL"; goal: Goal }
  | { type: "ANALYZE"; ids?: string[] }
  | { type: "ANALYZED" }
  | { type: "PHASE"; phase: Phase }
  | { type: "DECIDE"; id: string; decision: Decision }
  | { type: "BULK"; ids: string[]; decision: Decision }
  | { type: "APPLY"; id: string; at: string }
  | { type: "STEP"; at: string }
  | { type: "RETRY"; id: string }
  | { type: "RESTORE"; id: string; at: string }
  | { type: "RULE"; key: keyof State["rules"]; value: boolean }
  | { type: "RESET" };
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "RESET":
      return initialState();
    case "NAV":
      return { ...state, view: action.view };
    case "GOAL":
      return { ...state, goal: action.goal };
    case "SCOPE":
      return {
        ...state,
        scope: action.scope,
        subfolders: action.subfolders,
        project: action.project,
      };
    case "RULE":
      return {
        ...state,
        rules: { ...state.rules, [action.key]: action.value },
      };
    case "PHASE":
      return { ...state, phase: action.phase, view: "organize" };
    case "ANALYZE": {
      const files = action.ids
        ? state.files.filter(
            (f) => action.ids!.includes(f.id) && f.status === "active",
          )
        : inScope(state);
      if (!files.length || state.phase === "applying") return state;
      return {
        ...state,
        view: "organize",
        phase: "analyzing",
        analyzedIds: files.map((f) => f.id),
        decisions: Object.fromEntries(
          files.map((f) => [f.id, suggest(f, state)]),
        ),
      };
    }
    case "ANALYZED":
      return state.phase === "analyzing"
        ? { ...state, phase: "review" }
        : state;
    case "DECIDE":
      return state.analyzedIds.includes(action.id) &&
        (state.phase === "review" || state.phase === "confirm")
        ? {
            ...state,
            decisions: { ...state.decisions, [action.id]: action.decision },
          }
        : state;
    case "BULK":
      return state.phase === "review"
        ? {
            ...state,
            decisions: {
              ...state.decisions,
              ...Object.fromEntries(
                action.ids
                  .filter((id) => state.analyzedIds.includes(id))
                  .map((id) => [id, action.decision]),
              ),
            },
          }
        : state;
    case "APPLY": {
      if (state.phase !== "confirm" || !plannedFiles(state).length)
        return state;
      const operations: Operation[] = plannedFiles(state).map((f) => {
        const decision = state.decisions[f.id] as "archive" | "trash";
        return {
          id: `${action.id}:${f.id}`,
          fileId: f.id,
          name: f.name,
          decision,
          from: f.path,
          to: targetPath(f, decision),
          previousStatus: f.status,
          status: "queued",
        };
      });
      return {
        ...state,
        phase: "applying",
        activeTaskId: action.id,
        tasks: [
          {
            id: action.id,
            created: action.at,
            goal: state.goal,
            analyzedCount: state.analyzedIds.length,
            operations,
          },
          ...state.tasks,
        ],
      };
    }
    case "STEP": {
      if (state.phase !== "applying") return state;
      const task = state.tasks.find((t) => t.id === state.activeTaskId);
      const op = task?.operations.find((o) => o.status === "queued");
      if (!task || !op) return { ...state, phase: "results" };
      const file = state.files.find((f) => f.id === op.fileId)!;
      const conflict =
        file.path !== op.from ||
        state.files.some((f) => f.id !== file.id && f.path === op.to);
      const fail =
        conflict ||
        (state.rules.simulateFailure &&
          file.name === "render_preview.bip" &&
          op.error !== "File in use. Close the original app and retry.");
      const updated: Operation = {
        ...op,
        status: fail ? "failed" : "completed",
        error: fail
          ? conflict
            ? "File location changed or the destination already exists."
            : "File in use. Close the original app and retry."
          : undefined,
      };
      const operations = task.operations.map((o) =>
        o.id === op.id ? updated : o,
      );
      return {
        ...state,
        phase: operations.some((o) => o.status === "queued")
          ? "applying"
          : "results",
        files: fail
          ? state.files
          : state.files.map((f) =>
              f.id === op.fileId
                ? {
                    ...f,
                    path: op.to,
                    status: op.decision === "archive" ? "archived" : "trashed",
                  }
                : f,
            ),
        tasks: state.tasks.map((t) =>
          t.id === task.id ? { ...t, operations } : t,
        ),
        history: fail
          ? state.history
          : [{ ...updated, taskId: task.id, at: action.at }, ...state.history],
      };
    }
    case "RETRY": {
      if (state.phase === "applying") return state;
      const task = state.tasks.find((t) => t.id === action.id);
      if (!task?.operations.some((o) => o.status === "failed")) return state;
      return {
        ...state,
        view: "organize",
        phase: "applying",
        activeTaskId: task.id,
        tasks: state.tasks.map((t) =>
          t.id === task.id
            ? {
                ...t,
                operations: t.operations.map((o) =>
                  o.status === "failed" ? { ...o, status: "queued" } : o,
                ),
              }
            : t,
        ),
      };
    }
    case "RESTORE": {
      const entry = state.history.find((h) => h.id === action.id);
      const file = state.files.find((f) => f.id === entry?.fileId);
      if (
        !entry ||
        entry.restoredAt ||
        !file ||
        file.path !== entry.to ||
        state.files.some((f) => f.id !== file.id && f.path === entry.from) ||
        state.phase === "applying"
      )
        return state;
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === entry.fileId
            ? { ...f, path: entry.from, status: entry.previousStatus }
            : f,
        ),
        history: state.history.map((h) =>
          h.id === entry.id ? { ...h, restoredAt: action.at } : h,
        ),
      };
    }
  }
}
export function loadState(): State {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (
      parsed?.version === 1 &&
      Array.isArray(parsed.files) &&
      parsed.files.length === 42 &&
      parsed.files.every(
        (f: FileItem) =>
          typeof f.id === "string" &&
          typeof f.path === "string" &&
          Array.isArray(f.tags),
      ) &&
      Array.isArray(parsed.tasks) &&
      Array.isArray(parsed.history) &&
      Array.isArray(parsed.analyzedIds) &&
      Array.isArray(parsed.scope) &&
      parsed.decisions &&
      parsed.rules &&
      [
        "select",
        "analyzing",
        "review",
        "confirm",
        "applying",
        "results",
      ].includes(parsed.phase)
    )
      return parsed as State;
  } catch {
    /* An unavailable or old storage entry starts a fresh demo. */
  }
  return initialState();
}
