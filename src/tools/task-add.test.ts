import { describe, test, expect } from "bun:test";
import { Effect, Layer } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";
import type { Task } from "../types.ts";
import { TaskwarriorError } from "../types.ts";
import { taskAdd } from "./task-add.ts";

const sampleTask: Task = {
    id: 1,
    uuid: "abc-123",
    description: "New task",
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

describe("task-add", () => {
    test("adds task and returns it", async () => {
        const layer = makeTestLayer({
            exportTasks: () => Effect.succeed([sampleTask]),
        });

        const result = await Effect.runPromise(
            taskAdd({ description: "New task" }).pipe(Effect.provide(layer)),
        );

        expect(result.content[0]?.text).toContain("New task");
    });

    test("passes project, priority, tags, and due to runTask", async () => {
        let receivedArgs: string[] = [];
        const layer = makeTestLayer({
            runTask: (...args: string[]) => {
                receivedArgs = args;
                return Effect.succeed({ stdout: "", stderr: "", exitCode: 0 });
            },
        });

        await Effect.runPromise(
            taskAdd({
                description: "Tagged task",
                project: "work",
                priority: "H",
                tags: ["urgent", "bug"],
                due: "tomorrow",
            }).pipe(Effect.provide(layer)),
        );

        expect(receivedArgs).toContain("project:work");
        expect(receivedArgs).toContain("priority:H");
        expect(receivedArgs).toContain("+urgent");
        expect(receivedArgs).toContain("+bug");
        expect(receivedArgs).toContain("due:tomorrow");
    });

    test("returns error on failure", async () => {
        const layer = makeTestLayer({
            runTask: () =>
                Effect.fail(
                    new TaskwarriorError({ message: "add failed", exitCode: 1, stderr: "err" }),
                ),
        });

        const result = await Effect.runPromise(
            taskAdd({ description: "fail" }).pipe(Effect.provide(layer)),
        );

        expect(result.content[0]?.text).toBe("Error: add failed");
        expect("isError" in result && result.isError).toBe(true);
    });
});
