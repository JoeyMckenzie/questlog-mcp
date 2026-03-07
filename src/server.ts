import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./tools/index.ts";

export function createServer() {
    const server = new McpServer({
        name: "taskwarrior-mcp",
        version: "1.0.0",
    });

    registerAllTools(server);

    return server;
}
