import { Effect } from "effect";
import { TaskwarriorService } from "../taskwarrior-service.ts";

export interface TaskModifyParams {
    id: number;
    description?: string;
    project?: string;
    priority?: "H" | "M" | "L" | "";
    tags?: { add?: string[]; remove?: string[] };
    due?: string;
}

export const taskModify = (params: TaskModifyParams) =>
    Effect.gen(function* () {
        const svc = yield* TaskwarriorService;
        const args = [`${params.id}`, "modify", "rc.confirmation=off", "rc.bulk=0"];

        if (params.description) args.push(params.description);
        if (params.project !== undefined) args.push(`project:${params.project}`);
        if (params.priority !== undefined) args.push(`priority:${params.priority}`);
        if (params.tags?.add) {
            for (const tag of params.tags.add) args.push(`+${tag}`);
        }
        if (params.tags?.remove) {
            for (const tag of params.tags.remove) args.push(`-${tag}`);
        }
        if (params.due !== undefined) args.push(`due:${params.due}`);

        yield* svc.runTask(...args);
        const tasks = yield* svc.exportTasks(`${params.id}`);
        const task = tasks[0];

        return {
            content: [
                {
                    type: "text" as const,
                    text: task
                        ? JSON.stringify(task, null, 2)
                        : `Task ${params.id} modified successfully.`,
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
