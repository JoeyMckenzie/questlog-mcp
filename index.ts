import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Effect } from "effect";
import { createServer } from "./src/server.ts";
import { TaskwarriorLive } from "./src/taskwarrior-live.ts";
import { TaskwarriorService } from "./src/taskwarrior-service.ts";

const startup = Effect.gen(function* () {
    const svc = yield* TaskwarriorService;
    const version = yield* svc.validateTaskwarrior();
    console.error(`Taskwarrior ${version} detected`);
});

try {
    await Effect.runPromise(startup.pipe(Effect.provide(TaskwarriorLive)));
} catch (e) {
    console.error("Failed to start:", e);
    process.exit(1);
}

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
