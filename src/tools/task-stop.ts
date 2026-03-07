import { Effect } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";

export interface TaskStopParams {
    id: number;
}

export const taskStop = (params: TaskStopParams) =>
    Effect.gen(function* () {
        const svc = yield* TaskwarriorService;
        yield* svc.runTask(`${params.id}`, "stop", "rc.confirmation=off");

        const tasks = yield* svc.exportTasks(`${params.id}`);
        const task = tasks[0];

        return {
            content: [
                {
                    type: "text" as const,
                    text: task ? JSON.stringify(task, null, 2) : `Task ${params.id} stopped.`,
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
