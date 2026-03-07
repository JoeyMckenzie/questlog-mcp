import { Effect } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";

export interface TaskAddParams {
    description: string;
    project?: string;
    priority?: "H" | "M" | "L";
    tags?: string[];
    due?: string;
}

export const taskAdd = (params: TaskAddParams) =>
    Effect.gen(function* () {
        const svc = yield* TaskwarriorService;
        const args = ["add", params.description, "rc.confirmation=off", "rc.bulk=0"];

        if (params.project) args.push(`project:${params.project}`);
        if (params.priority) args.push(`priority:${params.priority}`);
        if (params.tags) {
            for (const tag of params.tags) args.push(`+${tag}`);
        }
        if (params.due) args.push(`due:${params.due}`);

        yield* svc.runTask(...args);
        const tasks = yield* svc.exportTasks("status:pending");
        const task = tasks[tasks.length - 1];

        return {
            content: [
                {
                    type: "text" as const,
                    text: task ? JSON.stringify(task, null, 2) : "Task added successfully.",
                },
            ],
        };
    }).pipe(
        Effect.catchTag("TaskwarriorError", (e) =>
            Effect.succeed({
                content: [{ type: "text" as const, text: `Error: ${e.message}` }],
                isError: true as const,
            }),
        ),
    );
