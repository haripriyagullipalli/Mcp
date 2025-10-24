import express, { Request, Response } from "express";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { guidelines, loadGuidelines } from "./guidelines/loader";
import { logger } from "./utils/logger";

/**
 * MCP Server Configuration
 */
export const server = new McpServer({
  name: "tbc-guidelines",
  version: "1.0.0",
  defaultResource: "all-guidelines",
  capabilities: {
    resources: {},
    prompts: {},
    tools: {},
  },
});

/**
 * Resource template for individual guideline pages
 */
const guidelineTemplate = new ResourceTemplate("guideline://{id}", {
  list: async () => ({
    resources: Object.keys(guidelines).map((id) => ({
      uri: `guideline://${id}`,
      name: guidelines[id].title,
    })),
  }),
});

/**
 * Handler for guideline resource requests
 */
server.resource("guideline", guidelineTemplate, async (uri, variables) => {
  const id = Array.isArray(variables.id) ? variables.id[0] : variables.id;
  const decodedId = decodeURIComponent(id).trim();
  
  logger.debug(`Guideline requested: ${decodedId}`);
  
  const guideline = guidelines[decodedId];
  
  if (!guideline) {
    logger.warn(`Guideline not found: ${decodedId}`);
  }

  return {
    contents: [
      {
        uri: uri.toString(),
        text: guideline?.text || "[No guideline text found for this resource]",
        mimeType: "text/plain",
      },
    ],
  };
});

/**
 * Resource template for combined guidelines
 */
const allGuidelinesTemplate = new ResourceTemplate("guidelines://all", {
  list: async () => ({
    resources: [
      {
        uri: "guidelines://all",
        name: "All Guidelines (for code review)",
      },
    ],
  }),
});

/**
 * Starts the HTTP server
 */
async function startHttpServer(port: number): Promise<void> {
  logger.info(`Starting HTTP MCP server on port ${port}...`);

  const app = express();
  app.use(express.json());

  // CORS middleware
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // MCP endpoint
  app.post("/mcp", async (req: Request, res: Response) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    logger.debug(`MCP Request - Method: ${req.body?.method || 'unknown'}`);

    // Inject TBC context for specific methods
    if (req.body?.method) {
      req.body.params = req.body.params || {};
      req.body.params.context = req.body.params.context || {};

      const enhanceMethods = [
        "completion",
        "hover",
        "codeAction",
        "diagnostic",
        "symbol",
        "initialize",
      ];

      if (enhanceMethods.some((method) => req.body.method.includes(method))) {
        req.body.params.context.tbcBank = true;
        req.body.params.context.tbcServer = "http://localhost:8080";
        req.body.params.context.instruction =
          "ENFORCE TBC Bank coding standards in all responses";
        req.body.params.context.workspaceAgnostic = true;

        logger.debug(`Enhanced request with TBC context for ${req.body.method}`);
      }

      // Special handling for initialization
      if (req.body.method === "initialize") {
        req.body.params.capabilities = req.body.params.capabilities || {};
        req.body.params.capabilities.tbcBank = {
          guidelinesActive: true,
          enforceStandards: true,
          serverUrl: "http://localhost:8080/mcp",
        };
      }
    }

    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  return new Promise<void>((resolve, reject) => {
    const httpServer = app.listen(port, () => {
      logger.info(`MCP server running at http://localhost:${port}/mcp`);
    });

    httpServer.on("error", (err) => {
      logger.error("Server error", err);
      reject(err);
    });

    // Graceful shutdown
    process.on("SIGINT", () => {
      logger.info("Shutting down server...");
      httpServer.close(() => {
        logger.info("Server closed");
        process.exit(0);
      });
    });
  });
}

/**
 * Starts the stdio server
 */
async function startStdioServer(): Promise<void> {
  const transport = new StdioServerTransport();
  logger.info("MCP server running with stdio transport");
  await server.connect(transport);
}

/**
 * Start the MCP server in HTTP or stdio mode
 */
export async function startServer(
  useHttp = true,
  port = 8080,
  skipGuidelinesLoad = false
): Promise<void> {
  if (!skipGuidelinesLoad) {
    await loadGuidelines();
  }

  if (useHttp) {
    await startHttpServer(port);
  } else {
    await startStdioServer();
  }
}

// Auto-start if run directly
if (require.main === module) {
  const useHttp = process.env.USE_HTTP === "true";
  startServer(useHttp).catch((error) => {
    logger.error("Failed to start server", error);
    process.exit(1);
  });
}
