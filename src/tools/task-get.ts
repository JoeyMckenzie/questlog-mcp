import { Effect } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";
import { TaskNotFoundError } from "../types.ts";

export interface TaskGetParams {
    id: number;
}

export const taskGet = (params: TaskGetParams) =>
    Effect.gen(function* () {
        const svc = yield* TaskwarriorService;
        const tasks = yield* svc.exportTasks(`${params.id}`);
        const task = tasks[0];

        if (!task) {
            return yield* Effect.fail(
                new TaskNotFoundError({
                    message: `No task found with ID ${params.id}`,
                    filter: `${params.id}`,
                }),
            );
        }

        return {
            content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }],
        };
    }).pipe(
        Effect.catchTag("TaskNotFoundError", (e) =>
            Effect.succeed({
                content: [{ type: "text" as const, text: `Error: ${e.message}` }],
                isError: true as const,
            }),
        ),
        Effect.catchTag("TaskwarriorError", (e) =>
            Effect.succeed({
                content: [{ type: "text" as const, text: `Error: ${e.message}` }],
                isError: true as const,
            }),
        ),
    );
