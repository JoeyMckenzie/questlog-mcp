import { Effect, Layer } from "effect";
import { TaskwarriorService } from "./taskwarrior-service.ts";
import { TaskSchema, TaskwarriorError } from "./types.ts";
import type { TaskResult } from "./types.ts";

const runTask = (...args: string[]): Effect.Effect<TaskResult, TaskwarriorError> =>
    Effect.tryPromise({
        try: async () => {
            const proc = Bun.spawn(["task", ...args], {
                stdout: "pipe",
                stderr: "pipe",
            });

            const stdout = await new Response(proc.stdout).text();
            const stderr = await new Response(proc.stderr).text();
            const exitCode = await proc.exited;

            if (exitCode !== 0) {
                throw { exitCode, stderr };
            }

            return { stdout, stderr, exitCode };
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
                yield* Effect.fail(
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
