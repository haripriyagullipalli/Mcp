import { startServer } from "./server";
import { logger } from "./utils/logger";

/**
 * Entry point for the MCP server
 * Reads configuration from environment variables:
 * - USE_HTTP: Set to "false" for stdio mode (default: true for HTTP mode)
 * - PORT: HTTP server port (default: 8080)
 * - LOG_LEVEL: Logging verbosity - ERROR, WARN, INFO, DEBUG (default: INFO)
 */
(async () => {
  try {
    const useHttp = process.env.USE_HTTP !== "false";
    const port = parseInt(process.env.PORT || "8080", 10);

    if (useHttp) {
      logger.info(`Starting in HTTP mode on port ${port}`);
      logger.info(`Access MCP server at: http://localhost:${port}/mcp`);
    } else {
      logger.info("Starting in stdio mode for VS Code");
    }

    await startServer(useHttp, port, false);
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
})();

