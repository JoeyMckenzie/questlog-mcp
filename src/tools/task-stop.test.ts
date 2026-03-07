import { describe, test, expect } from "bun:test";
import { Effect, Layer } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";
import type { Task } from "../types.ts";
import { TaskwarriorError } from "../types.ts";
import { taskStop } from "./task-stop.ts";

const sampleTask: Task = {
    id: 1,
    uuid: "abc-123",
    description: "Stopped task",
    status: "pending",
    entry: "20260306T195415Z",
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

describe("task-stop", () => {
    test("stops task and returns updated task", async () => {
        let receivedArgs: string[] = [];
        const layer = makeTestLayer({
            runTask: (...args: string[]) => {
                receivedArgs = args;
                return Effect.succeed({ stdout: "", stderr: "", exitCode: 0 });
            },
            exportTasks: () => Effect.succeed([sampleTask]),
        });

        const result = await Effect.runPromise(taskStop({ id: 1 }).pipe(Effect.provide(layer)));

        expect(receivedArgs).toEqual(["1", "stop", "rc.confirmation=off"]);
        expect(result.content[0]?.text).toContain("Stopped task");
    });

    test("returns error on failure", async () => {
        const layer = makeTestLayer({
            runTask: () =>
                Effect.fail(
                    new TaskwarriorError({ message: "stop failed", exitCode: 1, stderr: "err" }),
                ),
        });

        const result = await Effect.runPromise(taskStop({ id: 1 }).pipe(Effect.provide(layer)));

        expect(result.content[0]?.text).toBe("Error: stop failed");
        expect("isError" in result && result.isError).toBe(true);
    });
});
