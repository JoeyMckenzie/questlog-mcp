import { Effect, Either } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";

interface BulkCompleteError {
    id: number;
    error: string;
}

export const taskBulkComplete = (params: { ids: number[] }) =>
    Effect.gen(function* () {
        const svc = yield* TaskwarriorService;
        const completedIds: number[] = [];
        const errors: BulkCompleteError[] = [];

        for (const id of params.ids) {
            const result = yield* svc
                .runTask(`${id}`, "done", "rc.confirmation=off")
                .pipe(Effect.either);

            if (Either.isRight(result)) {
                completedIds.push(id);
            } else {
                errors.push({ id, error: result.left.message });
            }
        }

        const summary = `Completed ${completedIds.length} of ${params.ids.length} tasks.`;

        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify({ completedIds, errors, summary }, null, 2),
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
