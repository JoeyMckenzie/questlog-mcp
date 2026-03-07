import { describe, test, expect } from "bun:test";
import { Effect, Layer } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";
import type { Task } from "../types.ts";
import { TaskwarriorError } from "../types.ts";
import { taskGet } from "./task-get.ts";

const sampleTask: Task = {
    id: 1,
    uuid: "abc-123",
    description: "Test task",
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

describe("task-get", () => {
    test("returns task by ID", async () => {
        const layer = makeTestLayer({
            exportTasks: () => Effect.succeed([sampleTask]),
        });

        const result = await Effect.runPromise(taskGet({ id: 1 }).pipe(Effect.provide(layer)));

        expect(result.content[0]?.text).toContain("Test task");
        expect(JSON.parse(result.content[0]!.text).id).toBe(1);
    });

    test("returns error when task not found", async () => {
        const layer = makeTestLayer();

        const result = await Effect.runPromise(taskGet({ id: 999 }).pipe(Effect.provide(layer)));

        expect(result.content[0]?.text).toBe("Error: No task found with ID 999");
        expect("isError" in result && result.isError).toBe(true);
    });

    test("returns error on TaskwarriorError", async () => {
        const layer = makeTestLayer({
            exportTasks: () =>
                Effect.fail(
                    new TaskwarriorError({ message: "export failed", exitCode: 1, stderr: "err" }),
                ),
        });

        const result = await Effect.runPromise(taskGet({ id: 1 }).pipe(Effect.provide(layer)));

        expect(result.content[0]?.text).toBe("Error: export failed");
        expect("isError" in result && result.isError).toBe(true);
    });
});
