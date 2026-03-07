import { describe, test, expect } from "bun:test";
import { Effect, Layer } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";
import type { Task } from "../types.ts";
import { TaskwarriorError } from "../types.ts";
import { taskModify } from "./task-modify.ts";

const sampleTask: Task = {
    id: 1,
    uuid: "abc-123",
    description: "Modified task",
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

describe("task-modify", () => {
    test("modifies task and returns updated task", async () => {
        const layer = makeTestLayer({
            exportTasks: () => Effect.succeed([sampleTask]),
        });

        const result = await Effect.runPromise(
            taskModify({ id: 1, description: "Modified task" }).pipe(Effect.provide(layer)),
        );

        expect(result.content[0]?.text).toContain("Modified task");
    });

    test("passes all modification args to runTask", async () => {
        let receivedArgs: string[] = [];
        const layer = makeTestLayer({
            runTask: (...args: string[]) => {
                receivedArgs = args;
                return Effect.succeed({ stdout: "", stderr: "", exitCode: 0 });
            },
        });

        await Effect.runPromise(
            taskModify({
                id: 3,
                description: "Updated",
                project: "home",
                priority: "L",
                tags: { add: ["new"], remove: ["old"] },
                due: "friday",
            }).pipe(Effect.provide(layer)),
        );

        expect(receivedArgs).toContain("3");
        expect(receivedArgs).toContain("modify");
        expect(receivedArgs).toContain("Updated");
        expect(receivedArgs).toContain("project:home");
        expect(receivedArgs).toContain("priority:L");
        expect(receivedArgs).toContain("+new");
        expect(receivedArgs).toContain("-old");
        expect(receivedArgs).toContain("due:friday");
    });

    test("returns error on failure", async () => {
        const layer = makeTestLayer({
            runTask: () =>
                Effect.fail(
                    new TaskwarriorError({ message: "modify failed", exitCode: 1, stderr: "err" }),
                ),
        });

        const result = await Effect.runPromise(taskModify({ id: 1 }).pipe(Effect.provide(layer)));

        expect(result.content[0]?.text).toBe("Error: modify failed");
        expect("isError" in result && result.isError).toBe(true);
    });
});
