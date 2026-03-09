import { describe, test, expect } from "bun:test";
import { Effect, Layer } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";
import type { Task } from "../types.ts";
import { TaskwarriorError } from "../types.ts";
import { taskBulkComplete } from "./task-bulk-complete.ts";

function makeTestLayer(
    overrides: Partial<{
        runTask: (
            ...args: string[]
        ) => Effect.Effect<{ stdout: string; stderr: string; exitCode: number }, TaskwarriorError>;
        exportTasks: (filter?: string) => Effect.Effect<Task[], TaskwarriorError>;
        validateTaskwarrior: () => Effect.Effect<string, TaskwarriorError>;
    }> = {},
) {
    return Layer.succeed(TaskwarriorService, {
        runTask: () => Effect.succeed({ stdout: "", stderr: "", exitCode: 0 }),
        exportTasks: () => Effect.succeed([]),
        validateTaskwarrior: () => Effect.succeed("3.4.2"),
        ...overrides,
    });
}

describe("task-bulk-complete", () => {
    test("all tasks succeed - summary says 3 of 3", async () => {
        const layer = makeTestLayer({
            runTask: () =>
                Effect.succeed({
                    stdout: "Completed task 1.",
                    stderr: "",
                    exitCode: 0,
                }),
        });

        const result = await Effect.runPromise(
            taskBulkComplete({ ids: [1, 2, 3] }).pipe(Effect.provide(layer)),
        );

        const parsed = JSON.parse(result.content[0]!.text);
        expect(parsed.completedIds).toEqual([1, 2, 3]);
        expect(parsed.errors).toHaveLength(0);
        expect(parsed.summary).toBe("Completed 3 of 3 tasks.");
    });

    test("partial failure - middle task fails, 2 completed + 1 error", async () => {
        let callCount = 0;
        const layer = makeTestLayer({
            runTask: () => {
                callCount++;
                if (callCount === 2) {
                    return Effect.fail(
                        new TaskwarriorError({
                            message: "task not found",
                            exitCode: 1,
                            stderr: "err",
                        }),
                    );
                }
                return Effect.succeed({
                    stdout: "Completed task.",
                    stderr: "",
                    exitCode: 0,
                });
            },
        });

        const result = await Effect.runPromise(
            taskBulkComplete({ ids: [10, 20, 30] }).pipe(Effect.provide(layer)),
        );

        const parsed = JSON.parse(result.content[0]!.text);
        expect(parsed.completedIds).toEqual([10, 30]);
        expect(parsed.errors).toHaveLength(1);
        expect(parsed.errors[0].id).toBe(20);
        expect(parsed.errors[0].error).toBe("task not found");
        expect(parsed.summary).toBe("Completed 2 of 3 tasks.");
    });

    test("all tasks fail - 0 completed, 3 errors", async () => {
        const layer = makeTestLayer({
            runTask: () =>
                Effect.fail(
                    new TaskwarriorError({ message: "done failed", exitCode: 1, stderr: "err" }),
                ),
        });

        const result = await Effect.runPromise(
            taskBulkComplete({ ids: [1, 2, 3] }).pipe(Effect.provide(layer)),
        );

        const parsed = JSON.parse(result.content[0]!.text);
        expect(parsed.completedIds).toHaveLength(0);
        expect(parsed.errors).toHaveLength(3);
        expect(parsed.summary).toBe("Completed 0 of 3 tasks.");
    });
});
