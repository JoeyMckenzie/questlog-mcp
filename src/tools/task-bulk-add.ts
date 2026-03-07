import { Effect } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";
import type { Task } from "../types.ts";
import { type TaskAddParams, buildTaskAddArgs } from "./task-add.ts";

interface BulkAddError {
    index: number;
    description: string;
    error: string;
}

export const taskBulkAdd = (params: { tasks: TaskAddParams[] }) =>
    Effect.gen(function* () {
        const svc = yield* TaskwarriorService;
        const addedIds: number[] = [];
        const errors: BulkAddError[] = [];

        for (let i = 0; i < params.tasks.length; i++) {
            const task = params.tasks[i]!;
            const result = yield* svc.runTask(...buildTaskAddArgs(task)).pipe(
                Effect.map((r) => ({ ok: true as const, stdout: r.stdout })),
                Effect.catchTag("TaskwarriorError", (e) =>
                    Effect.succeed({ ok: false as const, error: e.message }),
                ),
            );

            if (result.ok) {
                const match = result.stdout.match(/Created task (\d+)\./);
                if (match?.[1]) {
                    addedIds.push(Number(match[1]));
                }
            } else {
                errors.push({
                    index: i,
                    description: task.description,
                    error: result.error,
                });
            }
        }

        const added: Task[] = addedIds.length > 0 ? yield* svc.exportTasks(addedIds.join(" ")) : [];
        const summary = `Added ${added.length} of ${params.tasks.length} tasks.`;

        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify({ added, errors, summary }, null, 2),
                },
            ],
        };
    }).pipe(
        Effect.catchTag("TaskwarriorError", (e) =>
            Effect.succeed({
                content: [{ type: "text" as const, text: `Error: ${e.message}` }],
                isError: true as const,
            }),
        ),
    );
