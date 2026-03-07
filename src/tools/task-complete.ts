import { Effect } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";

export interface TaskCompleteParams {
    id: number;
}

export const taskComplete = (params: TaskCompleteParams) =>
    Effect.gen(function* () {
        const svc = yield* TaskwarriorService;
        yield* svc.runTask(`${params.id}`, "done", "rc.confirmation=off");

        return {
            content: [{ type: "text" as const, text: `Task ${params.id} marked as complete.` }],
        };
    }).pipe(
        Effect.catchTag("TaskwarriorError", (e) =>
            Effect.succeed({
                content: [{ type: "text" as const, text: `Error: ${e.message}` }],
                isError: true as const,
            }),
        ),
    );
