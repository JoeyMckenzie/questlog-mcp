import type { Effect } from "effect";
import { Context } from "effect";
import type { Task, TaskResult, TaskwarriorError } from "./types.ts";

export interface TaskwarriorServiceShape {
    readonly runTask: (...args: string[]) => Effect.Effect<TaskResult, TaskwarriorError>;
    readonly exportTasks: (filter?: string) => Effect.Effect<Task[], TaskwarriorError>;
    readonly validateTaskwarrior: () => Effect.Effect<string, TaskwarriorError>;
}

// GenericTag avoids the self-referential class pattern (class X extends Tag<X, ...>)
// that causes TypeScript's type serializer to recurse infinitely.
export const TaskwarriorService = Context.GenericTag<TaskwarriorServiceShape>("TaskwarriorService");

export type TaskwarriorService = typeof TaskwarriorService;
