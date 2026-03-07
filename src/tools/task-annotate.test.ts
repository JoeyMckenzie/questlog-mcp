import { describe, test, expect } from "bun:test";
import { Effect, Layer } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";
import type { Task } from "../types.ts";
import { TaskwarriorError } from "../types.ts";
import { taskAnnotate } from "./task-annotate.ts";

const sampleTask: Task = {
    id: 1,
    uuid: "abc-123",
    description: "Annotated task",
    status: "pending",
    entry: "20260306T195415Z",
    annotations: [{ entry: "20260306T200000Z", description: "my note" }],
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

describe("task-annotate", () => {
    test("annotates task and returns updated task", async () => {
        let receivedArgs: string[] = [];
        const layer = makeTestLayer({
            runTask: (...args: string[]) => {
                receivedArgs = args;
                return Effect.succeed({ stdout: "", stderr: "", exitCode: 0 });
            },
            exportTasks: () => Effect.succeed([sampleTask]),
        });

        const result = await Effect.runPromise(
            taskAnnotate({ id: 1, annotation: "my note" }).pipe(Effect.provide(layer)),
        );

        expect(receivedArgs).toEqual(["1", "annotate", "my note", "rc.confirmation=off"]);
        expect(result.content[0]?.text).toContain("my note");
    });

    test("returns error on failure", async () => {
        const layer = makeTestLayer({
            runTask: () =>
                Effect.fail(
                    new TaskwarriorError({
                        message: "annotate failed",
                        exitCode: 1,
                        stderr: "err",
                    }),
                ),
        });

        const result = await Effect.runPromise(
            taskAnnotate({ id: 1, annotation: "note" }).pipe(Effect.provide(layer)),
        );

        expect(result.content[0]?.text).toBe("Error: annotate failed");
        expect("isError" in result && result.isError).toBe(true);
    });
});
