// server.ts
import express, { Request, Response } from "express";
import {
  McpServer,
  ResourceTemplate,
  PromptCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { guidelines, loadGuidelines } from "./guidelines/loader";

// -------------------------------
// 1️⃣ Create MCP server
// -------------------------------
export const server = new McpServer({
  name: "best-practices",
  version: "0.2.0",
  defaultResource: "all-guidelines",
  capabilities: {
    resources: {},
    prompts: {},
    tools: {},
  },
});

// -------------------------------
// 2️⃣ Separate guideline pages
// -------------------------------
const guidelineTemplate = new ResourceTemplate("guideline://{id}", {
  list: async () => ({
    resources: Object.keys(guidelines).map((id) => ({
      uri: `guideline://${id}`,
      name: guidelines[id].title,
    })),
  }),
});

server.resource("guideline", guidelineTemplate, async (uri, variables) => {
  const id = Array.isArray(variables.id) ? variables.id[0] : variables.id;
  const g = guidelines[id];
  return {
    contents: [
      {
        uri: uri.toString(),
        text: g?.text || "",
        mimeType: "text/plain",
      },
    ],
  };
});

// -------------------------------
// 3️⃣ Combined guidelines resource
// -------------------------------
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


// -------------------------------
// 6️⃣ Start MCP server
// -------------------------------
export async function startServer(
  useHttp = true,
  port = 8080,
  skipGuidelinesLoad = false
): Promise<void> {
  if (!skipGuidelinesLoad) {
    await loadGuidelines();
  }

  if (useHttp) {
    console.error(`🚀 Starting HTTP MCP server on port ${port}...`);

    const app = express();
    app.use(express.json());
    
    // Add CORS headers for browser compatibility
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    app.post("/mcp", async (req: Request, res: Response) => {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      
      // Enhanced logging for debugging other directories
      console.log(`🔍 MCP Request from workspace: ${req.body?.params?.workspaceUri || 'unknown'}`);
      console.log(`📋 Method: ${req.body?.method || 'no method'}`);
      console.log(`📂 Document: ${req.body?.params?.textDocument?.uri || 'no document'}`);
      
      // AGGRESSIVE CONTEXT INJECTION FOR ALL WORKSPACES
      if (req.body?.method) {
        console.log(`🔍 Processing MCP request: ${req.body.method}`);
        
        // Create focused context for ANY workspace
        
        // FORCE inject TBC context into ALL MCP communications
        req.body.params = req.body.params || {};
        req.body.params.context = req.body.params.context || {};
        
        
        // Enhanced context for specific method types
        if (req.body.method.includes('completion') || 
            req.body.method.includes('hover') || 
            req.body.method.includes('codeAction') ||
            req.body.method.includes('diagnostic') ||
            req.body.method.includes('symbol') ||
            req.body.method === 'initialize') {
          
          // Set comprehensive TBC context flags
          req.body.params.context.tbcBank = true;
          req.body.params.context.tbcServer = 'http://localhost:8080';
          req.body.params.context.instruction = 'ENFORCE TBC Bank coding standards in all responses - any workspace';
          req.body.params.context.workspaceAgnostic = true;
          
          console.log(`✅ FORCE-Enhanced request with TBC context for ${req.body.method}`);
        }
        
        // Special handling for initialization from other workspaces
        if (req.body.method === 'initialize') {
          console.log(`🚀 MCP Initialize from external workspace - injecting TBC context`);
          req.body.params.capabilities = req.body.params.capabilities || {};
          req.body.params.capabilities.tbcBank = {
            guidelinesActive: true,
            enforceStandards: true,
            serverUrl: 'http://localhost:8080/mcp'
          };
        }
        
        console.log(`✅ Enhanced request with TBC context for ${req.body.method}`);
      }
      
      res.on("close", () => transport.close());
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });

    app.listen(port, () => {
      console.error(`✅ MCP server running at http://localhost:${port}/mcp`);
    });
  } else {
    const transport = new StdioServerTransport();
    console.error("✅ MCP server running with stdio transport");
    await server.connect(transport);
  }
}

// Auto-start if run directly
if (require.main === module) {
  // Default to stdio mode for VS Code integration
  const useHttp = process.env.USE_HTTP === "true";
  startServer(useHttp);
}
