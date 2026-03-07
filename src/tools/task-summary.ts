import { Effect } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";
import type { Task } from "../types.ts";

export const taskSummary = () =>
    Effect.gen(function* () {
        const svc = yield* TaskwarriorService;
        const tasks: Task[] = yield* svc.exportTasks();

        const pending = tasks.filter((t) => t.status === "pending");
        const completed = tasks.filter((t) => t.status === "completed");

        const projectCounts = new Map<string, number>();
        for (const task of pending) {
            const project = task.project ?? "(none)";
            projectCounts.set(project, (projectCounts.get(project) ?? 0) + 1);
        }

        const projectSummary = [...projectCounts.entries()]
            .map(([project, count]) => `  ${project}: ${count}`)
            .join("\n");

        const summary = [
            `Pending: ${pending.length}`,
            `Completed: ${completed.length}`,
            `Total: ${tasks.length}`,
            "",
            "By project:",
            projectSummary || "  (no pending tasks)",
        ].join("\n");

        return {
            content: [{ type: "text" as const, text: summary }],
        };
    }).pipe(
        Effect.catchTag("TaskwarriorError", (e) =>
            Effect.succeed({
                content: [{ type: "text" as const, text: `Error: ${e.message}` }],
                isError: true as const,
            }),
        ),
    );
