# Plan: Add `task_bulk_add` Tool

## Context

Currently, adding multiple tasks requires calling `task_add` one at a time. This is inefficient when a Claude session needs to create several tasks at once. A `task_bulk_add` tool will accept an array of task definitions and add them all, returning a structured response with successes and failures.

## Files to Change

### 1. Modify `src/tools/task-add.ts`

Extract the arg-building logic (lines 15-22) into a shared helper:

- **Export** `buildTaskAddArgs(params: TaskAddParams): string[]` — builds the `["add", description, "rc.confirmation=off", "rc.bulk=0", ...optional]` array
- Refactor `taskAdd` to call `buildTaskAddArgs` internally so behavior is unchanged

### 2. Create `src/tools/task-bulk-add.ts`

New tool following the existing `task-add.ts` pattern:

- **Params**: `{ tasks: TaskAddParams[] }` — reuse `TaskAddParams` and `buildTaskAddArgs` from `task-add.ts`
- **Logic**:
    1. Loop through each task, calling `svc.runTask(...buildTaskAddArgs(task))`
    2. Parse the new task ID from `runTask` stdout (e.g., `Created task 42.`) rather than snapshotting UUIDs before/after — simpler and avoids 2x `exportTasks` calls
    3. Catch `TaskwarriorError` per-task (accumulate into errors array, don't abort remaining tasks)
    4. Export the successfully created tasks by their parsed IDs
    5. Return MCP-formatted response: `{ content: [{ type: "text", text: JSON.stringify({ added: Task[], errors: { index, description, error }[], summary: string }, null, 2) }] }` — matches the `{ content: [{ type: "text", text }] }` shape used by all other tools
- **Outer `catchTag`**: handles fatal errors (e.g., `exportTasks` itself failing) with `isError: true`

### 3. Modify `src/tools/index.ts`

- Import `taskBulkAdd` from `./task-bulk-add.ts`
- Register with `server.tool()`:
    - Name: `"task_bulk_add"`
    - Description: `"Add multiple tasks at once"`
    - Schema: `{ tasks: z.array(z.object({ description, project?, priority?, tags?, due? })).min(1) }`
    - Handler: same `Effect.runPromise(...pipe(Effect.provide(TaskwarriorLive)))` pattern

### 4. Create `src/tools/task-bulk-add.test.ts`

Test cases using `makeTestLayer()` pattern from `task-add.test.ts`:

1. **All tasks succeed** — 3 tasks added, `runTask` returns stdout with task IDs, exportTasks returns 3 new tasks, verify summary says "3 of 3"
2. **Partial failure** — 3 tasks where middle one fails, verify 2 added + 1 error with correct index/description
3. **All tasks fail** — verify 0 added, 3 errors, appropriate summary
4. **Args built correctly** — capture `runTask` calls, verify `buildTaskAddArgs` produces correct project/priority/tags/due for each task
5. **Fatal error** — `exportTasks` fails, verify outer `catchTag` returns `isError: true`

**Optional:** Consider extracting `makeTestLayer()` into a shared `src/tools/test-utils.ts` since it's duplicated across every test file.

## Verification

1. `bun test src/tools/task-bulk-add.test.ts` — new tests pass
2. `bun test` — all existing tests still pass
3. `bun run types:check` — no type errors
4. `bun run check` — lint/format/types all pass
