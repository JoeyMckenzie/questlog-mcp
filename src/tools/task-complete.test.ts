import { describe, test, expect } from "bun:test";
import { Effect, Layer } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";
import type { Task } from "../types.ts";
import { TaskwarriorError } from "../types.ts";
import { taskComplete } from "./task-complete.ts";

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

describe("task-complete", () => {
    test("completes task and returns success message", async () => {
        let receivedArgs: string[] = [];
        const layer = makeTestLayer({
            runTask: (...args: string[]) => {
                receivedArgs = args;
                return Effect.succeed({ stdout: "", stderr: "", exitCode: 0 });
            },
        });

        const result = await Effect.runPromise(taskComplete({ id: 5 }).pipe(Effect.provide(layer)));

        expect(result.content[0]?.text).toBe("Task 5 marked as complete.");
        expect(receivedArgs).toEqual(["5", "done", "rc.confirmation=off"]);
    });

    test("returns error on failure", async () => {
        const layer = makeTestLayer({
            runTask: () =>
                Effect.fail(
                    new TaskwarriorError({
                        message: "complete failed",
                        exitCode: 1,
                        stderr: "err",
                    }),
                ),
        });

        const result = await Effect.runPromise(taskComplete({ id: 1 }).pipe(Effect.provide(layer)));

        expect(result.content[0]?.text).toBe("Error: complete failed");
        expect("isError" in result && result.isError).toBe(true);
    });
});
