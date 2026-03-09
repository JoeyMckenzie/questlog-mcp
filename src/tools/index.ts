import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect } from "effect";
import { z } from "zod";
import { TaskwarriorLive } from "../taskwarrior-live.ts";
import { taskAdd } from "./task-add.ts";
import { taskBulkAdd } from "./task-bulk-add.ts";
import { taskBulkComplete } from "./task-bulk-complete.ts";
import { taskAnnotate } from "./task-annotate.ts";
import { taskComplete } from "./task-complete.ts";
import { taskDelete } from "./task-delete.ts";
import { taskGet } from "./task-get.ts";
import { taskList } from "./task-list.ts";
import { taskModify } from "./task-modify.ts";
import { taskStart } from "./task-start.ts";
import { taskStop } from "./task-stop.ts";
import { taskSummary } from "./task-summary.ts";

export function registerAllTools(server: McpServer) {
    server.registerTool(
        "task_list",
        {
            description: "List tasks with an optional filter (e.g. 'project:work status:pending')",
            inputSchema: { filter: z.string().optional() },
        },
        async (params) => Effect.runPromise(taskList(params).pipe(Effect.provide(TaskwarriorLive))),
    );

    server.registerTool(
        "task_get",
        {
            description: "Get a single task by its ID",
            inputSchema: { id: z.coerce.number() },
        },
        async (params) => Effect.runPromise(taskGet(params).pipe(Effect.provide(TaskwarriorLive))),
    );

    server.registerTool(
        "task_add",
        {
            description: "Add a new task",
            inputSchema: {
                description: z.string(),
                project: z.string().optional(),
                priority: z.enum(["H", "M", "L"]).optional(),
                tags: z.array(z.string()).optional(),
                due: z.string().optional(),
            },
        },
        async (params) => Effect.runPromise(taskAdd(params).pipe(Effect.provide(TaskwarriorLive))),
    );

    server.registerTool(
        "task_complete",
        {
            description: "Mark a task as complete",
            inputSchema: { id: z.coerce.number() },
        },
        async (params) =>
            Effect.runPromise(taskComplete(params).pipe(Effect.provide(TaskwarriorLive))),
    );

    server.registerTool(
        "task_modify",
        {
            description: "Modify an existing task",
            inputSchema: {
                id: z.coerce.number(),
                description: z.string().optional(),
                project: z.string().optional(),
                priority: z.enum(["H", "M", "L", ""]).optional(),
                tags: z
                    .object({
                        add: z.array(z.string()).optional(),
                        remove: z.array(z.string()).optional(),
                    })
                    .optional(),
                due: z.string().optional(),
            },
        },
        async (params) =>
            Effect.runPromise(taskModify(params).pipe(Effect.provide(TaskwarriorLive))),
    );

    server.registerTool(
        "task_delete",
        {
            description: "Delete a task",
            inputSchema: { id: z.coerce.number() },
        },
        async (params) =>
            Effect.runPromise(taskDelete(params).pipe(Effect.provide(TaskwarriorLive))),
    );

    server.registerTool(
        "task_annotate",
        {
            description: "Add an annotation to a task",
            inputSchema: { id: z.coerce.number(), annotation: z.string() },
        },
        async (params) =>
            Effect.runPromise(taskAnnotate(params).pipe(Effect.provide(TaskwarriorLive))),
    );

    server.registerTool(
        "task_summary",
        {
            description: "Get a summary of all tasks with counts and project breakdown",
            inputSchema: {},
        },
        async () => Effect.runPromise(taskSummary().pipe(Effect.provide(TaskwarriorLive))),
    );

    server.registerTool(
        "task_start",
        {
            description: "Start tracking time on a task",
            inputSchema: { id: z.coerce.number() },
        },
        async (params) =>
            Effect.runPromise(taskStart(params).pipe(Effect.provide(TaskwarriorLive))),
    );

    server.registerTool(
        "task_stop",
        {
            description: "Stop tracking time on a task",
            inputSchema: { id: z.coerce.number() },
        },
        async (params) => Effect.runPromise(taskStop(params).pipe(Effect.provide(TaskwarriorLive))),
    );

    server.registerTool(
        "task_bulk_add",
        {
            description: "Add multiple tasks at once",
            inputSchema: {
                tasks: z
                    .array(
                        z.object({
                            description: z.string(),
                            project: z.string().optional(),
                            priority: z.enum(["H", "M", "L"]).optional(),
                            tags: z.array(z.string()).optional(),
                            due: z.string().optional(),
                        }),
                    )
                    .min(1),
            },
        },
        async (params) =>
            Effect.runPromise(taskBulkAdd(params).pipe(Effect.provide(TaskwarriorLive))),
    );

    server.registerTool(
        "task_bulk_complete",
        {
            description: "Mark multiple tasks as complete at once",
            inputSchema: {
                ids: z.array(z.coerce.number()).min(1),
            },
        },
        async (params) =>
            Effect.runPromise(taskBulkComplete(params).pipe(Effect.provide(TaskwarriorLive))),
    );
}
