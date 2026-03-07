import { Effect } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";

export interface TaskDeleteParams {
    id: number;
}

export const taskDelete = (params: TaskDeleteParams) =>
    Effect.gen(function* () {
        const svc = yield* TaskwarriorService;
        yield* svc.runTask(`${params.id}`, "delete", "rc.confirmation=off");

        return {
            content: [{ type: "text" as const, text: `Task ${params.id} deleted.` }],
        };
    }).pipe(
        Effect.catchTag("TaskwarriorError", (e) =>
            Effect.succeed({
                content: [{ type: "text" as const, text: `Error: ${e.message}` }],
                isError: true as const,
            }),
        ),
    );
