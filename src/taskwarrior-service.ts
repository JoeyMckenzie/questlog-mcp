import type { Effect } from "effect";
import { Context } from "effect";
import type { Task, TaskResult, TaskwarriorError } from "./types.ts";

export class TaskwarriorService extends Context.Tag("TaskwarriorService")<
    TaskwarriorService,
    {
        readonly runTask: (...args: string[]) => Effect.Effect<TaskResult, TaskwarriorError>;
        readonly exportTasks: (filter?: string) => Effect.Effect<Task[], TaskwarriorError>;
        readonly validateTaskwarrior: () => Effect.Effect<string, TaskwarriorError>;
    }
>() {}
