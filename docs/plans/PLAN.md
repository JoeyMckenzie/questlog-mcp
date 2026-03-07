# Taskwarrior MCP Server — Implementation Plan

## Context

Taskwarrior is a powerful CLI task manager, but managing tasks requires constant context switching between Claude Code sessions and the terminal. This MCP server lets Claude manage Taskwarrior tasks directly within a session — creating tasks, marking things done, checking what's next, and tracking active work — eliminating that friction.

The server works with any MCP-compatible client (Claude Code, Claude for Desktop) via stdio transport.

## Architecture

**Single-process stdio MCP server** built with `@modelcontextprotocol/sdk` and Bun.

- **Transport**: stdio (client spawns the server as a subprocess)
- **CLI integration**: All Taskwarrior interaction via `Bun.spawn("task", [...args])`
- **Reads**: `task export [filter]` for structured JSON output
- **Writes**: `task <subcommand>` with `rc.confirmation=off rc.bulk=0` to suppress interactive prompts
- **Startup validation**: Check `task --version` exists and is 3.x before accepting connections

## Project Structure

```
index.ts              — entrypoint, stdio transport setup, startup validation
src/
  server.ts           — MCP server definition, tool registration
  taskwarrior.ts      — thin wrapper around Bun.spawn for `task` CLI calls
  taskwarrior.test.ts — tests for CLI wrapper (mocked Bun.spawn)
  types.ts            — shared Zod schemas and TypeScript types
  tools/
    task-add.ts            task-add.test.ts
    task-complete.ts       task-complete.test.ts
    task-modify.ts         task-modify.test.ts
    task-delete.ts         task-delete.test.ts
    task-list.ts           task-list.test.ts
    task-get.ts            task-get.test.ts
    task-annotate.ts       task-annotate.test.ts
    task-summary.ts        task-summary.test.ts
    task-start.ts          task-start.test.ts
    task-stop.ts           task-stop.test.ts
```

## Tools (10 total)

### Core CRUD

1. **task_add** — Create a new task
    - Params: `description` (required), `project?`, `priority?` (H/M/L), `tags?` (string[]), `due?` (string)
    - Runs: `task add <description> [project:X] [priority:X] [+tag1 +tag2] [due:X]`
    - Returns: created task JSON (via re-export of newest task)

2. **task_complete** — Mark task(s) as done
    - Params: `id` (number) or `filter?` (string)
    - Runs: `task <id|filter> done rc.confirmation=off`
    - Returns: confirmation message

3. **task_modify** — Update task attributes
    - Params: `id` (number), plus optional `description?`, `project?`, `priority?`, `tags_add?` (string[]), `tags_remove?` (string[]), `due?`
    - Runs: `task <id> modify <mods> rc.confirmation=off`
    - Returns: updated task JSON

4. **task_delete** — Delete a task
    - Params: `id` (number)
    - Runs: `task <id> delete rc.confirmation=off`
    - Returns: confirmation message

### Query

5. **task_list** — List tasks with optional filtering
    - Params: `filter?` (string — raw Taskwarrior filter syntax), `project?`, `tags?` (string[]), `status?` (pending/completed/all)
    - Runs: `task export [filter]`
    - Returns: array of task objects (JSON)

6. **task_get** — Get full details of a single task
    - Params: `id` (number) or `uuid` (string)
    - Runs: `task <id|uuid> export`
    - Returns: single task object (JSON)

### Session Helpers

7. **task_annotate** — Add annotation to a task
    - Params: `id` (number), `annotation` (string)
    - Runs: `task <id> annotate <annotation>`
    - Returns: confirmation message

8. **task_summary** — Get project-level summary
    - Params: none (or optional `project?` filter)
    - Runs: `task export` then aggregates: counts by project, overdue tasks, highest urgency items
    - Returns: structured summary object

### Time Tracking

9. **task_start** — Mark a task as actively being worked on
    - Params: `id` (number)
    - Runs: `task <id> start`
    - Returns: confirmation with task details

10. **task_stop** — Stop working on a task
    - Params: `id` (number)
    - Runs: `task <id> stop`
    - Returns: confirmation message

## Key Implementation Details

### `src/taskwarrior.ts` — CLI Wrapper

- `runTask(...args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }>` using `Bun.spawn`
- `exportTasks(filter?: string): Promise<Task[]>` convenience wrapper that parses JSON
- Always pass `rc.confirmation=off` and `rc.bulk=0` for write operations
- Throw typed errors on non-zero exit codes with stderr message

### `src/types.ts` — Schemas

- `TaskSchema` — Zod schema matching Taskwarrior's JSON export format (id, uuid, description, status, project, priority, tags, due, entry, modified, urgency, annotations, start, end)
- Input schemas for each tool's parameters
- Export TypeScript types inferred from Zod schemas

### `src/server.ts` — Server Setup

- Create `McpServer` instance with name `"taskwarrior"` and version from package.json
- Register all 10 tools with Zod input schemas and handler functions
- Each tool handler: validate input -> build args -> call taskwarrior wrapper -> format response

### `index.ts` — Entrypoint

- Validate Taskwarrior is installed (`task --version`, check for 3.x)
- Log server info to stderr (stdio transport uses stdout for MCP protocol)
- Create server, connect stdio transport

## Client Configuration

### Claude Code (`.claude/settings.json`)

```json
{
    "mcpServers": {
        "taskwarrior": {
            "command": "bun",
            "args": ["run", "/path/to/taskwarrior-mcp/index.ts"]
        }
    }
}
```

### Claude for Desktop (`claude_desktop_config.json`)

```json
{
    "mcpServers": {
        "taskwarrior": {
            "command": "bun",
            "args": ["run", "/path/to/taskwarrior-mcp/index.ts"]
        }
    }
}
```

## Testing Strategy

**Runner**: `bun test` (Bun's built-in, Jest-compatible API)
**Layout**: Colocated `.test.ts` files next to source
**Mocking**: Mock `runTask`/`exportTasks` from `src/taskwarrior.ts` via `bun:test`'s `mock` module — no real Taskwarrior needed for unit tests

### Mock pattern

Each tool handler calls `runTask()` or `exportTasks()` from `src/taskwarrior.ts`. Tests mock these functions to return controlled output, keeping tests fast and deterministic.

```ts
import { mock } from "bun:test";

mock.module("../taskwarrior", () => ({
    runTask: mock(() => Promise.resolve({ stdout: "", stderr: "", exitCode: 0 })),
    exportTasks: mock(() => Promise.resolve([])),
}));
```

### What to test per tool

Each tool test file covers:

1. **Happy path** — correct args passed to `runTask`/`exportTasks`, correct response shape
2. **Optional params** — verify optional fields are omitted when not provided, included when they are
3. **Error handling** — non-zero exit code from CLI produces proper MCP error response
4. **Edge cases** — tool-specific (e.g., `task_list` with no results returns empty array, `task_get` with invalid ID)

### CLI wrapper tests (`taskwarrior.test.ts`)

1. `runTask` passes args correctly to `Bun.spawn`
2. `runTask` throws on non-zero exit codes with stderr message
3. `exportTasks` parses JSON output into `Task[]`
4. `exportTasks` handles empty array `[]` response
5. `exportTasks` passes filter string through to CLI args
6. Write operations include `rc.confirmation=off` and `rc.bulk=0`

### Phase gate

`bun test` must pass at each phase boundary before moving to the next phase.

## Verification

1. **Full test suite**: `bun test` — all unit tests green
2. **Manual integration**: Run `bun index.ts` and verify stdio MCP protocol works
3. **Client integration**: Configure in Claude Code and/or Claude for Desktop, test each tool interactively
4. **Edge cases**: no tasks, invalid IDs, Taskwarrior not installed, malformed filters
