import { startServer } from "./server";

(async () => {
  // Default to HTTP mode for better accessibility
  const useHttp = process.env.USE_HTTP !== "false";
  const port = parseInt(process.env.PORT || "8080", 10);
  
  if (useHttp) {
    console.error(`🚀 Starting in HTTP mode on port ${port}`);
    console.error(`🌐 Access MCP server at: http://localhost:${port}/mcp`);
    await startServer(true, port, false); // Load guidelines in startServer
  } else {
    console.error("🚀 Starting in stdio mode for VS Code");
    await startServer(false, port, false); // Load guidelines in startServer
  }
})();
