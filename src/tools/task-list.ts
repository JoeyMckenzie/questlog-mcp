import { Effect } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";
import type { Task } from "../types.ts";

export interface TaskListParams {
    filter?: string;
}

export const taskList = (params: TaskListParams) =>
    Effect.gen(function* () {
        const svc = yield* TaskwarriorService;
        const tasks: Task[] = yield* svc.exportTasks(params.filter);

        return {
            content: [
                {
                    type: "text" as const,
                    text: tasks.length === 0 ? "No tasks found." : JSON.stringify(tasks, null, 2),
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
