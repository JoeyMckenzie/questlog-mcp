import { Data } from "effect";
import { z } from "zod";

export const AnnotationSchema = z.object({
    entry: z.string(),
    description: z.string(),
});

export const TaskSchema = z.object({
    id: z.number(),
    uuid: z.string(),
    description: z.string(),
    status: z.enum(["pending", "completed", "deleted", "waiting", "recurring"]),
    project: z.string().optional(),
    priority: z.enum(["H", "M", "L"]).optional(),
    tags: z.array(z.string()).optional(),
    due: z.string().optional(),
    entry: z.string(),
    modified: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    urgency: z.number().optional(),
    annotations: z.array(AnnotationSchema).optional(),
});

export type Task = z.infer<typeof TaskSchema>;
export type Annotation = z.infer<typeof AnnotationSchema>;

export interface TaskResult {
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number;
}

export class TaskwarriorError extends Data.TaggedError("TaskwarriorError")<{
    readonly message: string;
    readonly exitCode: number;
    readonly stderr: string;
}> {}

export class TaskNotFoundError extends Data.TaggedError("TaskNotFoundError")<{
    readonly message: string;
    readonly filter: string;
}> {}
