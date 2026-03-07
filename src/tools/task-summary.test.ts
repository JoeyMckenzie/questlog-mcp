import { describe, test, expect } from "bun:test";
import { Effect, Layer } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";
import type { Task } from "../types.ts";
import { TaskwarriorError } from "../types.ts";
import { taskSummary } from "./task-summary.ts";

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

describe("task-summary", () => {
    test("returns summary with counts and project breakdown", async () => {
        const tasks: Task[] = [
            {
                id: 1,
                uuid: "a",
                description: "A",
                status: "pending",
                entry: "20260306T195415Z",
                project: "work",
            },
            {
                id: 2,
                uuid: "b",
                description: "B",
                status: "pending",
                entry: "20260306T195415Z",
                project: "work",
            },
            {
                id: 3,
                uuid: "c",
                description: "C",
                status: "pending",
                entry: "20260306T195415Z",
                project: "home",
            },
            { id: 0, uuid: "d", description: "D", status: "completed", entry: "20260306T195415Z" },
        ];

        const layer = makeTestLayer({
            exportTasks: () => Effect.succeed(tasks),
        });

        const result = await Effect.runPromise(taskSummary().pipe(Effect.provide(layer)));
        const text = result.content[0]?.text ?? "";

        expect(text).toContain("Pending: 3");
        expect(text).toContain("Completed: 1");
        expect(text).toContain("Total: 4");
        expect(text).toContain("work: 2");
        expect(text).toContain("home: 1");
    });

    test("handles empty task list", async () => {
        const layer = makeTestLayer();

        const result = await Effect.runPromise(taskSummary().pipe(Effect.provide(layer)));
        const text = result.content[0]?.text ?? "";

        expect(text).toContain("Pending: 0");
        expect(text).toContain("(no pending tasks)");
    });

    test("returns error on failure", async () => {
        const layer = makeTestLayer({
            exportTasks: () =>
                Effect.fail(
                    new TaskwarriorError({ message: "summary failed", exitCode: 1, stderr: "err" }),
                ),
        });

        const result = await Effect.runPromise(taskSummary().pipe(Effect.provide(layer)));

        expect(result.content[0]?.text).toBe("Error: summary failed");
        expect("isError" in result && result.isError).toBe(true);
    });
});
