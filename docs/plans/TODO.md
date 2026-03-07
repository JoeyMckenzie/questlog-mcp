# Taskwarrior MCP Server — Task List

## Phase 1: Foundation

- [ ] Create `src/types.ts` — Zod schemas for Taskwarrior JSON export format and tool input params
- [ ] Create `src/taskwarrior.ts` — CLI wrapper (`runTask`, `exportTasks`) using `Bun.spawn`
- [ ] Create `src/taskwarrior.test.ts` — mock `Bun.spawn`, test `runTask` and `exportTasks`
    - [ ] `runTask` passes args correctly to `Bun.spawn`
    - [ ] `runTask` throws on non-zero exit codes with stderr message
    - [ ] `exportTasks` parses JSON output into `Task[]`
    - [ ] `exportTasks` handles empty array `[]` response
    - [ ] `exportTasks` passes filter string through to CLI args
    - [ ] Write operations include `rc.confirmation=off` and `rc.bulk=0`
- [ ] Add startup validation logic (check `task --version`, verify 3.x)
- [ ] `bun test` — all foundation tests pass

## Phase 2: Query Tools

- [ ] Implement `task_list` tool — list/filter tasks via `task export`
- [ ] Create `src/tools/task-list.test.ts`
    - [ ] Returns tasks array on happy path
    - [ ] Applies filter string to CLI args
    - [ ] Handles empty results (no tasks)
    - [ ] Applies status filter (pending/completed/all)
- [ ] Implement `task_get` tool — get single task details by ID or UUID
- [ ] Create `src/tools/task-get.test.ts`
    - [ ] Get task by ID
    - [ ] Get task by UUID
    - [ ] Error on task not found
- [ ] `bun test` — all query tool tests pass

## Phase 3: Core CRUD Tools

- [ ] Implement `task_add` tool — create tasks with description, project, priority, tags, due
- [ ] Create `src/tools/task-add.test.ts`
    - [ ] Creates task with required description only
    - [ ] Creates task with all optional params (project, priority, tags, due)
    - [ ] Re-exports created task in response
- [ ] Implement `task_complete` tool — mark tasks done by ID or filter
- [ ] Create `src/tools/task-complete.test.ts`
    - [ ] Complete task by ID
    - [ ] Complete tasks by filter
    - [ ] Returns confirmation message
- [ ] Implement `task_modify` tool — update task attributes
- [ ] Create `src/tools/task-modify.test.ts`
    - [ ] Modify single field
    - [ ] Modify multiple fields
    - [ ] Add and remove tags
- [ ] Implement `task_delete` tool — delete tasks by ID
- [ ] Create `src/tools/task-delete.test.ts`
    - [ ] Delete task by ID
    - [ ] Returns confirmation message
    - [ ] Error on invalid ID
- [ ] `bun test` — all CRUD tests pass

## Phase 4: Session Helper Tools

- [ ] Implement `task_annotate` tool — add annotations to tasks
- [ ] Create `src/tools/task-annotate.test.ts`
    - [ ] Add annotation to task
    - [ ] Returns confirmation message
    - [ ] Error on invalid ID
- [ ] Implement `task_summary` tool — project-level aggregation and overview
- [ ] Create `src/tools/task-summary.test.ts`
    - [ ] Aggregation with multiple projects
    - [ ] Empty task list returns empty summary
    - [ ] Overdue task detection
    - [ ] Project filter narrows results
- [ ] `bun test` — all session helper tests pass

## Phase 5: Time Tracking Tools

- [ ] Implement `task_start` tool — mark task as actively being worked on
- [ ] Create `src/tools/task-start.test.ts`
    - [ ] Start task by ID
    - [ ] Returns confirmation with task details
    - [ ] Error on already-started task
- [ ] Implement `task_stop` tool — stop working on a task
- [ ] Create `src/tools/task-stop.test.ts`
    - [ ] Stop task by ID
    - [ ] Returns confirmation message
    - [ ] Error on task not currently started
- [ ] `bun test` — all time tracking tests pass

## Phase 6: Server Wiring

- [ ] Create `src/server.ts` — MCP server definition, register all 10 tools
- [ ] Create `index.ts` — entrypoint with startup validation and stdio transport
- [ ] `bun test` — full suite passes (all phases)

## Phase 7: Integration Verification

- [ ] Manual integration test — run server via stdio and verify protocol
- [ ] Client integration test — configure in Claude Code and test each tool
- [ ] Client integration test — configure in Claude for Desktop and test each tool
- [ ] Edge case testing — no tasks, invalid IDs, missing Taskwarrior, bad filters
