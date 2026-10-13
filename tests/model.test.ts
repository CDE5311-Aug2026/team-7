import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  reducer,
  inScope,
  searchFiles,
  plannedFiles,
  targetPath,
} from "../src/model.ts";
import type { State } from "../src/model.ts";
const at = "2026-10-14T10:00:00Z";
const review = () =>
  reducer(reducer(initialState(), { type: "ANALYZE" }), { type: "ANALYZED" });
function execute(state: State) {
  let s = state;
  while (s.phase === "applying") s = reducer(s, { type: "STEP", at });
  return s;
}

test("42 demo files have unique paths and the four specified categories", () => {
  const s = initialState();
  assert.equal(s.files.length, 42);
  assert.equal(new Set(s.files.map((f) => f.path)).size, 42);
  assert.deepEqual(
    ["Sources", "Renders", "Research", "Motion"].map(
      (c) => s.files.filter((f) => f.category === c).length,
    ),
    [14, 12, 10, 6],
  );
});
test("scope and subfolder choices determine analyzed records", () => {
  let s = initialState();
  s = reducer(s, {
    type: "SCOPE",
    scope: ["Sources"],
    subfolders: false,
    project: "Design archive",
  });
  assert.equal(inScope(s).length, 2);
  s = reducer(s, { type: "ANALYZE" });
  assert.deepEqual(s.analyzedIds, ["f01", "f02"]);
});
test("decisions and confirmation preview do not mutate files", () => {
  let s = review();
  const original = structuredClone(s.files);
  s = reducer(s, { type: "DECIDE", id: "f02", decision: "archive" });
  s = reducer(s, { type: "PHASE", phase: "confirm" });
  assert.deepEqual(s.files, original);
  assert.equal(plannedFiles(s).length, 17);
  assert.equal(
    reducer({ ...s, phase: "review" }, { type: "APPLY", id: "x", at }).tasks
      .length,
    0,
  );
});
test("apply, retry, search, restore and repeated restore preserve consistency", () => {
  let s = review();
  s = reducer(s, { type: "DECIDE", id: "f02", decision: "archive" });
  s = reducer(s, { type: "PHASE", phase: "confirm" });
  s = reducer(s, { type: "APPLY", id: "one", at });
  s = execute(s);
  assert.equal(
    s.tasks[0].operations.filter((o) => o.status === "completed").length,
    16,
  );
  assert.equal(
    s.tasks[0].operations.filter((o) => o.status === "failed").length,
    1,
  );
  assert.equal(s.history.length, 16);
  const file = s.files.find((f) => f.id === "f02")!;
  assert.equal(file.path, targetPath(file, "archive"));
  assert.equal(searchFiles(s.files, "orbit v03").length, 1);
  s = reducer(s, { type: "RETRY", id: "one" });
  s = execute(s);
  assert.equal(s.history.length, 17);
  assert.equal(new Set(s.history.map((h) => h.id)).size, 17);
  assert.equal(
    s.tasks[0].operations.filter((o) => o.status === "failed").length,
    0,
  );
  const entry = s.history.find((h) => h.fileId === "f02")!;
  s = reducer(s, { type: "RESTORE", id: entry.id, at });
  assert.equal(s.files.find((f) => f.id === "f02")!.path, file.originalPath);
  assert.equal(s.files.find((f) => f.id === "f02")!.status, "active");
  assert.equal(s.history.find((h) => h.id === entry.id)!.restoredAt, at);
  assert.deepEqual(reducer(s, { type: "RESTORE", id: entry.id, at }), s);
});
test("reset restores the original seed and clears all operations", () => {
  let s = review();
  s = reducer(s, { type: "PHASE", phase: "confirm" });
  s = execute(reducer(s, { type: "APPLY", id: "reset-me", at }));
  assert.deepEqual(reducer(s, { type: "RESET" }), initialState());
});
test("comparison goal leaves ambiguous files unchanged; disabling archive rules affects analysis", () => {
  let s = initialState();
  s = reducer(s, { type: "GOAL", goal: "Compare versions" });
  s = reducer(s, { type: "ANALYZE" });
  assert.equal(
    Object.values(s.decisions).filter((d) => d === "archive" || d === "trash")
      .length,
    0,
  );
  s = reducer(initialState(), {
    type: "RULE",
    key: "archiveOlder",
    value: false,
  });
  s = reducer(s, { type: "ANALYZE" });
  assert.equal(
    Object.values(s.decisions).filter((d) => d === "archive").length,
    0,
  );
});
test("search combines terms and handles no matches", () => {
  const files = initialState().files;
  assert.equal(searchFiles(files, "orbit v07")[0].id, "f01");
  assert.equal(searchFiles(files, "no_such_file").length, 0);
  assert.equal(searchFiles(files, "").length, 42);
});
test("a destination collision fails without overwriting another file", () => {
  let s = review();
  s = reducer(s, { type: "DECIDE", id: "f02", decision: "archive" });
  s = reducer(s, { type: "PHASE", phase: "confirm" });
  s = reducer(s, { type: "APPLY", id: "collision", at });
  const original = s.files.find((f) => f.id === "f02")!;
  const target = targetPath(original, "archive");
  s = {
    ...s,
    files: s.files.map((f) => (f.id === "f03" ? { ...f, path: target } : f)),
  };
  s = execute(s);
  assert.equal(
    s.tasks[0].operations.find((o) => o.fileId === "f02")!.status,
    "failed",
  );
  assert.equal(s.files.find((f) => f.id === "f02")!.path, original.path);
  assert.equal(s.files.find((f) => f.id === "f03")!.path, target);
});
