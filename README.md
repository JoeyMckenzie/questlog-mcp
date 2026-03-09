# questlog-mcp

[![CI](https://github.com/joeymckenzie/taskwarrior-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/joeymckenzie/taskwarrior-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/questlog-mcp)](https://www.npmjs.com/package/questlog-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An MCP server that exposes [Taskwarrior](https://taskwarrior.org/) task management to AI assistants and agentic coding tools. It wraps the `task` CLI and surfaces a set of structured tools for creating, querying, modifying, and managing tasks directly from your AI coding environment.

## Requirements

- [Taskwarrior](https://taskwarrior.org/download/) v3.x (v2 is not supported)
- Node.js v18 or later

### Install Taskwarrior

**macOS (Homebrew):**

```sh
brew install task
```

**Linux (apt):**

```sh
sudo apt install taskwarrior
```

Verify the installation and confirm you are on version 3:

```sh
task --version
```

## Tools

| Tool            | Description                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| `task_list`     | List tasks with an optional Taskwarrior filter string                       |
| `task_get`      | Get a single task by its numeric ID                                         |
| `task_add`      | Add a new task with optional project, priority, tags, and due date          |
| `task_bulk_add` | Add multiple tasks at once                                                  |
| `task_complete` | Mark a task as complete by ID                                               |
| `task_modify`   | Modify an existing task's description, project, priority, tags, or due date |
| `task_delete`   | Delete a task by ID                                                         |
| `task_annotate` | Add an annotation (note) to a task                                          |
| `task_summary`  | Get a high-level summary of all tasks with counts and a project breakdown   |
| `task_start`    | Start time tracking on a task                                               |
| `task_stop`     | Stop time tracking on a task                                                |

### Tool Details

**`task_list`**

Lists tasks. Accepts an optional `filter` string using standard Taskwarrior filter syntax.

```
filter: "project:work status:pending"
filter: "priority:H due:today"
filter: "+home"
```

**`task_get`**

Returns a single task by its numeric ID.

```
id: 42
```

**`task_add`**

Creates a new task. Only `description` is required.

```
description: "Write release notes"
project: "work"
priority: "H"   // H, M, or L
tags: ["docs", "release"]
due: "2024-12-31"
```

**`task_bulk_add`**

Creates multiple tasks in a single call. Accepts an array of task objects with the same fields as `task_add`. Requires at least one task.

```
tasks: [
  { description: "Set up CI", project: "infra", priority: "H" },
  { description: "Write tests", project: "infra", tags: ["testing"] },
  { description: "Update docs", due: "2024-12-31" }
]
```

**`task_complete`**

Marks a task done by ID.

```
id: 7
```

**`task_modify`**

Updates fields on an existing task. All fields except `id` are optional. Tags can be added or removed independently.

```
id: 7
description: "Updated description"
project: "personal"
priority: "L"
tags: { add: ["urgent"], remove: ["waiting"] }
due: "2025-01-15"
```

**`task_delete`**

Deletes a task by ID.

```
id: 7
```

**`task_annotate`**

Attaches a note to an existing task.

```
id: 7
annotation: "Blocked on review from Alice"
```

**`task_summary`**

Takes no arguments. Returns task counts by status and a breakdown by project.

**`task_start`** / **`task_stop`**

Start or stop active time tracking on a task by ID.

```
id: 7
```

## MCP Configuration

The server communicates over stdio using the MCP protocol and can be run directly via `npx` — no installation or cloning required.

### Claude Desktop

Add the following to your Claude Desktop config file.

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
    "mcpServers": {
        "questlog": {
            "command": "npx",
            "args": ["-y", "questlog-mcp"]
        }
    }
}
```

### Claude Code (CLI)

```sh
claude mcp add questlog -- npx -y questlog-mcp
```

### Cursor

Open Cursor settings, navigate to the MCP section, and add a new server entry:

```json
{
    "questlog": {
        "command": "npx",
        "args": ["-y", "questlog-mcp"]
    }
}
```

### Windsurf

Add the server to your Windsurf MCP config at `~/.codeium/windsurf/mcp_config.json`:

```json
{
    "mcpServers": {
        "questlog": {
            "command": "npx",
            "args": ["-y", "questlog-mcp"]
        }
    }
}
```

### VS Code (Continue)

Add the server to your Continue `config.json`:

```json
{
    "mcpServers": [
        {
            "name": "questlog",
            "command": "npx",
            "args": ["-y", "questlog-mcp"]
        }
    ]
}
```

## Development

Clone the repository and install dependencies:

```sh
git clone https://github.com/joeymckenzie/taskwarrior-mcp.git
cd taskwarrior-mcp
bun install
```

Run the type checker and linter:

```sh
bun run types:check
bun run lint
```

Run the test suite:

```sh
bun test
```

Build the distributable:

```sh
bun run build
```

> **Note:** [Bun](https://bun.sh/) v1.0 or later is required for development. End users running via `npx` only need Node.js.

## License

MIT
