import { describe, test, expect } from "bun:test";
import { Effect, Exit, Layer } from "effect";
import { TaskwarriorService } from "./taskwarrior-service.ts";
import type { Task } from "./types.ts";
import { TaskwarriorError } from "./types.ts";

const sampleTask: Task = {
    id: 1,
    uuid: "abc-123",
    description: "Test task",
    status: "pending",
    project: "test",
    priority: "H",
    tags: ["sample"],
    due: "20260307T080000Z",
    entry: "20260306T195415Z",
    modified: "20260306T195415Z",
    urgency: 16.37,
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
        runTask: (..._args: string[]) => Effect.succeed({ stdout: "", stderr: "", exitCode: 0 }),
        exportTasks: (_filter?: string) => Effect.succeed([]),
        validateTaskwarrior: () => Effect.succeed("3.4.2"),
        ...overrides,
    });
}

describe("runTask", () => {
    test("returns stdout, stderr, and exitCode on success", async () => {
        const layer = makeTestLayer({
            runTask: () =>
                Effect.succeed({
                    stdout: "output",
                    stderr: "warning",
                    exitCode: 0,
                }),
        });

        const program = Effect.gen(function* () {
            const svc = yield* TaskwarriorService;
            return yield* svc.runTask("--version");
        });

        const result = await Effect.runPromise(program.pipe(Effect.provide(layer)));

        expect(result.stdout).toBe("output");
        expect(result.stderr).toBe("warning");
        expect(result.exitCode).toBe(0);
    });

    test("fails with TaskwarriorError on error", async () => {
        const layer = makeTestLayer({
            runTask: () =>
                Effect.fail(
                    new TaskwarriorError({
                        message: "task bad command failed",
                        exitCode: 1,
                        stderr: "Command failed",
                    }),
                ),
        });

        const program = Effect.gen(function* () {
            const svc = yield* TaskwarriorService;
            return yield* svc.runTask("bad", "command");
        });

        const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(layer)));

        expect(Exit.isFailure(exit)).toBe(true);

        if (Exit.isFailure(exit)) {
            Exit.match(exit, {
                onFailure: (cause) => {
                    const failures = [
                        ...Effect.runSync(
                            Effect.sync(() => {
                                const fails: TaskwarriorError[] = [];
                                if (cause._tag === "Fail") {
                                    fails.push(cause.error);
                                }
                                return fails;
                            }),
                        ),
                    ];
                    expect(failures[0]).toBeInstanceOf(TaskwarriorError);
                    expect(failures[0]?.exitCode).toBe(1);
                    expect(failures[0]?.stderr).toBe("Command failed");
                },
                onSuccess: () => {
                    expect.unreachable("Should have failed");
                },
            });
        }
    });
});

describe("exportTasks", () => {
    test("returns parsed tasks", async () => {
        const layer = makeTestLayer({
            exportTasks: () => Effect.succeed([sampleTask]),
        });

        const program = Effect.gen(function* () {
            const svc = yield* TaskwarriorService;
            return yield* svc.exportTasks();
        });

        const tasks = await Effect.runPromise(program.pipe(Effect.provide(layer)));

        expect(tasks).toHaveLength(1);
        expect(tasks[0]?.description).toBe("Test task");
        expect(tasks[0]?.priority).toBe("H");
        expect(tasks[0]?.tags).toEqual(["sample"]);
    });

    test("returns empty array when no tasks", async () => {
        const layer = makeTestLayer();

        const program = Effect.gen(function* () {
            const svc = yield* TaskwarriorService;
            return yield* svc.exportTasks();
        });

        const tasks = await Effect.runPromise(program.pipe(Effect.provide(layer)));

        expect(tasks).toEqual([]);
    });

    test("passes filter to exportTasks", async () => {
        let receivedFilter: string | undefined;
        const layer = makeTestLayer({
            exportTasks: (filter?: string) => {
                receivedFilter = filter;
                return Effect.succeed([sampleTask]);
            },
        });

        const program = Effect.gen(function* () {
            const svc = yield* TaskwarriorService;
            return yield* svc.exportTasks("project:test status:pending");
        });

        await Effect.runPromise(program.pipe(Effect.provide(layer)));

        expect(receivedFilter).toBe("project:test status:pending");
    });
});

describe("validateTaskwarrior", () => {
    test("returns version string for 3.x", async () => {
        const layer = makeTestLayer({
            validateTaskwarrior: () => Effect.succeed("3.4.2"),
        });

        const program = Effect.gen(function* () {
            const svc = yield* TaskwarriorService;
            return yield* svc.validateTaskwarrior();
        });

        const version = await Effect.runPromise(program.pipe(Effect.provide(layer)));

        expect(version).toBe("3.4.2");
    });

    test("fails for non-3.x version", async () => {
        const layer = makeTestLayer({
            validateTaskwarrior: () =>
                Effect.fail(
                    new TaskwarriorError({
                        message: "Taskwarrior 3.x required, found 2.6.2",
                        exitCode: 1,
                        stderr: "Unsupported version: 2.6.2",
                    }),
                ),
        });

        const program = Effect.gen(function* () {
            const svc = yield* TaskwarriorService;
            return yield* svc.validateTaskwarrior();
        });

        const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(layer)));

        expect(Exit.isFailure(exit)).toBe(true);
    });
});
