import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Effect, Layer } from "effect";
import { TaskwarriorService } from "./taskwarrior-service.ts";
import { TaskSchema, TaskwarriorError } from "./types.ts";
import type { TaskResult } from "./types.ts";

const execFileAsync = promisify(execFile);

const runTask = (...args: string[]): Effect.Effect<TaskResult, TaskwarriorError> =>
    Effect.tryPromise({
        try: async () => {
            const { stdout, stderr } = await execFileAsync("task", args);
            return { stdout, stderr, exitCode: 0 };
        },
        catch: (e) => {
            const err = e as { exitCode?: number; stderr?: string };
            return new TaskwarriorError({
                message: `task ${args.join(" ")} failed: ${(err.stderr ?? "unknown error").trim()}`,
                exitCode: err.exitCode ?? 1,
                stderr: err.stderr ?? "unknown error",
            });
        },
    });

export const TaskwarriorLive = Layer.succeed(TaskwarriorService, {
    runTask,
    exportTasks: (filter?: string) =>
        Effect.gen(function* () {
            const args = filter ? [...filter.split(" "), "export"] : ["export"];
            const { stdout } = yield* runTask(...args);
            const parsed: unknown = JSON.parse(stdout);

            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed.map((item) => TaskSchema.parse(item));
        }),
    validateTaskwarrior: () =>
        Effect.gen(function* () {
            const { stdout } = yield* runTask("--version");
            const version = stdout.trim();

            if (!version.startsWith("3.")) {
                return yield* Effect.fail(
                    new TaskwarriorError({
                        message: `Taskwarrior 3.x required, found ${version}`,
                        exitCode: 1,
                        stderr: `Unsupported version: ${version}`,
                    }),
                );
            }

            return version;
        }),
});
