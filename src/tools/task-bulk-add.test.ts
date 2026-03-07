import { describe, test, expect } from "bun:test";
import { Effect, Layer } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";
import type { Task } from "../types.ts";
import { TaskwarriorError } from "../types.ts";
import { taskBulkAdd } from "./task-bulk-add.ts";

function makeTask(id: number, description: string): Task {
    return { id, uuid: `uuid-${id}`, description, status: "pending", entry: "20260306T195415Z" };
}

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

describe("task-bulk-add", () => {
    test("all tasks succeed - summary says 3 of 3", async () => {
        let callCount = 0;
        const layer = makeTestLayer({
            runTask: () => {
                callCount++;
                return Effect.succeed({
                    stdout: `Created task ${callCount}.`,
                    stderr: "",
                    exitCode: 0,
                });
            },
            exportTasks: () =>
                Effect.succeed([
                    makeTask(1, "Task one"),
                    makeTask(2, "Task two"),
                    makeTask(3, "Task three"),
                ]),
        });

        const result = await Effect.runPromise(
            taskBulkAdd({
                tasks: [
                    { description: "Task one" },
                    { description: "Task two" },
                    { description: "Task three" },
                ],
            }).pipe(Effect.provide(layer)),
        );

        const parsed = JSON.parse(result.content[0]!.text);
        expect(parsed.added).toHaveLength(3);
        expect(parsed.errors).toHaveLength(0);
        expect(parsed.summary).toBe("Added 3 of 3 tasks.");
    });

    test("partial failure - middle task fails, 2 added + 1 error", async () => {
        let callCount = 0;
        const layer = makeTestLayer({
            runTask: () => {
                callCount++;
                if (callCount === 2) {
                    return Effect.fail(
                        new TaskwarriorError({ message: "add failed", exitCode: 1, stderr: "err" }),
                    );
                }
                return Effect.succeed({
                    stdout: `Created task ${callCount === 1 ? 1 : 3}.`,
                    stderr: "",
                    exitCode: 0,
                });
            },
            exportTasks: () => Effect.succeed([makeTask(1, "Task one"), makeTask(3, "Task three")]),
        });

        const result = await Effect.runPromise(
            taskBulkAdd({
                tasks: [
                    { description: "Task one" },
                    { description: "Task two" },
                    { description: "Task three" },
                ],
            }).pipe(Effect.provide(layer)),
        );

        const parsed = JSON.parse(result.content[0]!.text);
        expect(parsed.added).toHaveLength(2);
        expect(parsed.errors).toHaveLength(1);
        expect(parsed.errors[0].index).toBe(1);
        expect(parsed.errors[0].description).toBe("Task two");
        expect(parsed.summary).toBe("Added 2 of 3 tasks.");
    });

    test("all tasks fail - 0 added, 3 errors", async () => {
        const layer = makeTestLayer({
            runTask: () =>
                Effect.fail(
                    new TaskwarriorError({ message: "add failed", exitCode: 1, stderr: "err" }),
                ),
        });

        const result = await Effect.runPromise(
            taskBulkAdd({
                tasks: [
                    { description: "Task one" },
                    { description: "Task two" },
                    { description: "Task three" },
                ],
            }).pipe(Effect.provide(layer)),
        );

        const parsed = JSON.parse(result.content[0]!.text);
        expect(parsed.added).toHaveLength(0);
        expect(parsed.errors).toHaveLength(3);
        expect(parsed.summary).toBe("Added 0 of 3 tasks.");
    });

    test("args built correctly - project, priority, tags, due passed per task", async () => {
        const capturedArgs: string[][] = [];
        const layer = makeTestLayer({
            runTask: (..._args: string[]) => {
                capturedArgs.push(_args);
                return Effect.succeed({
                    stdout: `Created task ${capturedArgs.length}.`,
                    stderr: "",
                    exitCode: 0,
                });
            },
            exportTasks: () => Effect.succeed([makeTask(1, "Task A"), makeTask(2, "Task B")]),
        });

        await Effect.runPromise(
            taskBulkAdd({
                tasks: [
                    {
                        description: "Task A",
                        project: "work",
                        priority: "H",
                        tags: ["urgent", "bug"],
                        due: "tomorrow",
                    },
                    { description: "Task B", project: "personal" },
                ],
            }).pipe(Effect.provide(layer)),
        );

        expect(capturedArgs[0]).toContain("project:work");
        expect(capturedArgs[0]).toContain("priority:H");
        expect(capturedArgs[0]).toContain("+urgent");
        expect(capturedArgs[0]).toContain("+bug");
        expect(capturedArgs[0]).toContain("due:tomorrow");
        expect(capturedArgs[1]).toContain("project:personal");
        expect(capturedArgs[1]).not.toContain("priority:H");
    });

    test("fatal error - exportTasks fails, returns isError: true", async () => {
        const layer = makeTestLayer({
            runTask: () => Effect.succeed({ stdout: "Created task 1.", stderr: "", exitCode: 0 }),
            exportTasks: () =>
                Effect.fail(
                    new TaskwarriorError({ message: "export failed", exitCode: 1, stderr: "err" }),
                ),
        });

        const result = await Effect.runPromise(
            taskBulkAdd({ tasks: [{ description: "Task one" }] }).pipe(Effect.provide(layer)),
        );

        expect(result.content[0]!.text).toContain("export failed");
        expect("isError" in result && result.isError).toBe(true);
    });
});
