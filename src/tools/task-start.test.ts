import { describe, test, expect } from "bun:test";
import { Effect, Layer } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";
import type { Task } from "../types.ts";
import { TaskwarriorError } from "../types.ts";
import { taskStart } from "./task-start.ts";

const sampleTask: Task = {
    id: 1,
    uuid: "abc-123",
    description: "Started task",
    status: "pending",
    entry: "20260306T195415Z",
    start: "20260306T200000Z",
};

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

describe("task-start", () => {
    test("starts task and returns updated task", async () => {
        let receivedArgs: string[] = [];
        const layer = makeTestLayer({
            runTask: (...args: string[]) => {
                receivedArgs = args;
                return Effect.succeed({ stdout: "", stderr: "", exitCode: 0 });
            },
            exportTasks: () => Effect.succeed([sampleTask]),
        });

        const result = await Effect.runPromise(taskStart({ id: 1 }).pipe(Effect.provide(layer)));

        expect(receivedArgs).toEqual(["1", "start", "rc.confirmation=off"]);
        expect(result.content[0]?.text).toContain("Started task");
    });

    test("returns error on failure", async () => {
        const layer = makeTestLayer({
            runTask: () =>
                Effect.fail(
                    new TaskwarriorError({ message: "start failed", exitCode: 1, stderr: "err" }),
                ),
        });

        const result = await Effect.runPromise(taskStart({ id: 1 }).pipe(Effect.provide(layer)));

        expect(result.content[0]?.text).toBe("Error: start failed");
        expect("isError" in result && result.isError).toBe(true);
    });
});
