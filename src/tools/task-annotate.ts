import { Effect } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";

export interface TaskAnnotateParams {
    id: number;
    annotation: string;
}

export const taskAnnotate = (params: TaskAnnotateParams) =>
    Effect.gen(function* () {
        const svc = yield* TaskwarriorService;
        yield* svc.runTask(`${params.id}`, "annotate", params.annotation, "rc.confirmation=off");

        const tasks = yield* svc.exportTasks(`${params.id}`);
        const task = tasks[0];

        return {
            content: [
                {
                    type: "text" as const,
                    text: task
                        ? JSON.stringify(task, null, 2)
                        : `Annotation added to task ${params.id}.`,
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
