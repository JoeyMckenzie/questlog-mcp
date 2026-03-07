import { describe, test, expect } from "bun:test";
import { Effect, Layer } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";
import type { Task } from "../types.ts";
import { TaskwarriorError } from "../types.ts";
import { taskList } from "./task-list.ts";

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

describe("task-list", () => {
    test("returns tasks as JSON", async () => {
        const layer = makeTestLayer({
            exportTasks: () => Effect.succeed([sampleTask]),
        });

        const result = await Effect.runPromise(taskList({}).pipe(Effect.provide(layer)));

        expect(result.content[0]?.text).toContain("Test task");
        expect(JSON.parse(result.content[0]!.text)).toHaveLength(1);
    });

    test("returns message when no tasks found", async () => {
        const layer = makeTestLayer();

        const result = await Effect.runPromise(taskList({}).pipe(Effect.provide(layer)));

        expect(result.content[0]?.text).toBe("No tasks found.");
    });

    test("passes filter to exportTasks", async () => {
        let receivedFilter: string | undefined;
        const layer = makeTestLayer({
            exportTasks: (filter?: string) => {
                receivedFilter = filter;
                return Effect.succeed([]);
            },
        });

        await Effect.runPromise(taskList({ filter: "project:work" }).pipe(Effect.provide(layer)));

        expect(receivedFilter).toBe("project:work");
    });

    test("returns error on TaskwarriorError", async () => {
        const layer = makeTestLayer({
            exportTasks: () =>
                Effect.fail(
                    new TaskwarriorError({ message: "export failed", exitCode: 1, stderr: "err" }),
                ),
        });

        const result = await Effect.runPromise(taskList({}).pipe(Effect.provide(layer)));

        expect(result.content[0]?.text).toBe("Error: export failed");
        expect("isError" in result && result.isError).toBe(true);
    });
});
