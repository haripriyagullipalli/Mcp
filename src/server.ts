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

server.resource("all-guidelines", allGuidelinesTemplate, async (uri) => {
  const combinedText = Object.values(guidelines)
    .map((g) => `### ${g.title}\n${g.text}`)
    .join("\n\n");

  return {
    contents: [
      {
        uri: uri.toString(),
        text: combinedText,
        mimeType: "text/plain",
      },
    ],
  };
});

// -------------------------------
// 3.1️⃣ Context resource for inline suggestions
// -------------------------------
const contextTemplate = new ResourceTemplate("context://inline", {
  list: async () => ({
    resources: [
      {
        uri: "context://inline",
        name: "TBC Guidelines Context for Inline Suggestions",
      },
    ],
  }),
});

server.resource("context", contextTemplate, async (uri) => {
  const combinedText = Object.values(guidelines)
    .map((g) => `${g.title}: ${g.text}`)
    .join(" | ");

  return {
    contents: [
      {
        uri: uri.toString(),
        text: `TBC Bank Development Standards: ${combinedText}`,
        mimeType: "text/plain",
      },
    ],
  };
});

// -------------------------------
// 4️⃣ Prompts (inject guidelines)
// -------------------------------

// Context prompt for automatic inclusion
server.prompt(
  "context",
  "TBC Development Guidelines Context",
  {},
  async () => {
    const combinedText = Object.values(guidelines)
      .map((g) => `### ${g.title}\n${g.text}`)
      .join("\n\n");

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please use these TBC Bank development guidelines and standards as context for all code generation and suggestions:\n\n${combinedText}`,
          },
        },
      ],
    };
  }
);

// Proactive TBC Code Generation prompt
server.prompt(
  "proactive-tbc-generation",
  "Proactive TBC-compliant code generation",
  {},
  async () => {
    const combinedText = Object.values(guidelines)
      .map((g) => `### ${g.title}\n${g.text}`)
      .join("\n\n");

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `GENERATE CLEAN TBC CODE - NO COMMENTS.

Rules:
- API endpoints: kebab-case (user-profiles)  
- Controllers: PascalCase (UserController)
- Logging: _logger.LogInformation()
- Database: .AsNoTracking().ToListAsync()
- Versioning: api/v1/ required

Return clean code only. No explanatory comments or symbols.

${combinedText}`,
          },
        },
      ],
    };
  }
);

// Inline suggestion prompt
server.prompt(
  "inline-context",
  "Context for inline code suggestions",
  {},
  async () => {
    const combinedText = Object.values(guidelines)
      .map((g) => `### ${g.title}\n${g.text}`)
      .join("\n\n");

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `PROVIDE CLEAN CODE ONLY - NO COMMENTS OR EXPLANATIONS.

TBC Standards:
1. API endpoints: kebab-case (user-profiles)
2. Controllers: PascalCase (UserController)  
3. Logging: _logger.LogInformation()
4. Database: .AsNoTracking() for queries
5. Methods: Async with proper naming
6. Versioning: api/v1/ required

RESPONSE FORMAT: Show correct code directly without any comments (✅/❌) or explanations.

${combinedText}

IMPORTANT: When fixing violations, return ONLY the corrected code without any explanatory comments.`,
          },
        },
      ],
    };
  }
);

// Team consistency prompt for all developers
server.prompt(
  "team-standards",
  "TBC Bank team development standards",
  {},
  async () => {
    const keyStandards = `
MANDATORY TBC BANK STANDARDS:

🔥 CRITICAL API Rules:
- Endpoints: kebab-case ONLY (/user-profiles, NOT /user_profiles)
- Framework: ASP.NET Core Web API
- Versioning: Required (/api/v1/)
- Documentation: OpenAPI/Swagger mandatory

🏗️ Architecture:
- Pattern: Clean Architecture
- Layers: Domain → Application → Infrastructure → Presentation
- DI: .NET Core IoC container
- Patterns: Repository, Unit of Work

💾 Data Access:
- ORM: Entity Framework Core
- Database: SQL Server 2019+
- Patterns: Repository + UoW from TBC.Common libraries
- Migrations: Automatic with proper naming

🔧 Technology Stack:
- Language: C# with .NET LTS versions
- Logging: Serilog with Graylog integration
- Testing: xUnit with 80%+ coverage
- Messaging: RabbitMQ/TIBCO EMS

📋 Naming Conventions:
- APIs: kebab-case
- Classes: PascalCase
- Methods: PascalCase
- Properties: PascalCase
- Variables: camelCase
- Constants: PascalCase
    `;

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: keyStandards + `\n\nFull Guidelines:\n${Object.values(guidelines).map((g: any) => `### ${g.title}\n${g.text}`).join("\n\n")}`,
          },
        },
      ],
    };
  }
);

server.prompt(
  "generate-code",
  { requirements: z.string() },
  async ({ requirements }) => {
    // Get the combined guidelines text directly
    const combinedText = Object.values(guidelines)
      .map((g) => `### ${g.title}\n${g.text}`)
      .join("\n\n");

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Follow these organizational guidelines:\n\n${combinedText}\n\nNow generate code for:\n${requirements}`,
          },
        },
      ],
    };
  }
);

server.prompt(
  "review-code",
  { code: z.string() },
  async ({ code }) => {
    // Get the combined guidelines text directly
    const combinedText = Object.values(guidelines)
      .map((g) => `### ${g.title}\n${g.text}`)
      .join("\n\n");

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Review the following code against our organizational guidelines:\n\n${combinedText}\n\nCode:\n${code}`,
          },
        },
      ],
    };
  }
);

// -------------------------------
// 5️⃣ Tools
// -------------------------------
server.tool(
  "ping",
  "Simple test tool",
  { message: z.string() },
  async ({ message }) => {
    return { content: [{ type: "text", text: `You said: ${message}` }] };
  }
);

server.tool(
  "get-guidelines",
  "Get TBC development guidelines for code generation",
  {},
  async () => {
    const combinedText = Object.values(guidelines)
      .map((g) => `### ${g.title}\n${g.text}`)
      .join("\n\n");
    
    return { 
      content: [{ 
        type: "text", 
        text: `TBC Bank Development Guidelines:\n\n${combinedText}\n\nPlease follow these guidelines when generating code suggestions.` 
      }] 
    };
  }
);

server.tool(
  "check-api-naming",
  "Check if API endpoint follows TBC naming conventions",
  { endpoint: z.string() },
  async ({ endpoint }) => {
    const hasUnderscores = endpoint.includes('_');
    const hasHyphens = endpoint.includes('-');
    
    if (hasUnderscores) {
      return { 
        content: [{ 
          type: "text", 
          text: `❌ INCORRECT: "${endpoint}" uses underscores. TBC standard requires kebab-case with hyphens. Correct format: "${endpoint.replace(/_/g, '-')}"` 
        }] 
      };
    } else if (hasHyphens || !endpoint.includes('/')) {
      return { 
        content: [{ 
          type: "text", 
          text: `✅ CORRECT: "${endpoint}" follows TBC naming conventions (kebab-case with hyphens).` 
        }] 
      };
    } else {
      return { 
        content: [{ 
          type: "text", 
          text: `⚠️ NOTE: "${endpoint}" should use kebab-case (hyphens) for multi-word segments per TBC standards.` 
        }] 
      };
    }
  }
);

// -------------------------------
// Enhanced TBC Guidelines Context Generator
// -------------------------------
function createFocusedContext(requestBody: any, guidelines: any): string {
  const allGuidelines = Object.values(guidelines)
    .map((g: any) => `### ${g.title}\n${g.text}`)
    .join("\n\n");

  // TBC Proactive Code Generator & Violation Scanner
  const tbcScanner = `
🏦 TBC BANK STANDARDS - PROACTIVE CODE GENERATION:

� GENERATE TBC-COMPLIANT CODE FIRST:
✅ API Routes: [HttpGet("get-users")] ✅ [HttpPost("create-user")] 
✅ Controllers: UserController, ProductController (NO underscores)
✅ Logging: _logger.LogInformation("Processing {UserId}", userId)
✅ Database: repository.GetUsersAsync() OR dbContext.Users.AsNoTracking().ToListAsync()
✅ Returns: return Ok(new UserDto { ... }) (use DTOs, not entities)

🚨 IMMEDIATELY CORRECT VIOLATIONS:
❌ get_users → ✅ get-users (kebab-case)
❌ User_Controller → ✅ UserController (no underscores)
❌ Console.WriteLine → ✅ _logger.LogInformation
❌ .ToList() → ✅ .AsNoTracking().Select(x => new Dto{}).ToList()
❌ string + variable → ✅ structured logging with parameters

🎯 BEHAVIOR: Always suggest TBC-compliant alternatives for ANY violation!
`;

  const requestText = JSON.stringify(requestBody).toLowerCase();
  
  // Enhanced API violation detection
  if (requestText.includes('httpget') || requestText.includes('httppost') || 
      requestText.includes('controller') || requestText.includes('route')) {
    
    return `${tbcScanner}

🔥 API ENDPOINT SCANNER ACTIVE:
- VIOLATION: [HttpGet("users/get_profile")] 
- FIX: [HttpGet("users/get-profile")]
- VIOLATION: "/api/create_user"
- FIX: "/api/create-user"

ENFORCE: All API routes must use kebab-case (hyphens), never underscores!

${allGuidelines}`;
  }

  // Enhanced logging violation detection
  if (requestText.includes('logger') || requestText.includes('log')) {
    
    return `${tbcScanner}

🔥 LOGGING VIOLATION SCANNER ACTIVE:
- VIOLATION: _logger.LogError($"Error: {ex}")
- FIX: _logger.LogError(ex, "Operation failed for {UserId}", userId)
- VIOLATION: Log.Information("message")
- FIX: ILogger<T> dependency injection

ENFORCE: Use structured logging with TBC.Common.Serilog!

${allGuidelines}`;
  }

  // Enhanced database violation detection
  if (requestText.includes('dbcontext') || requestText.includes('entity')) {
    
    return `${tbcScanner}

🔥 DATABASE VIOLATION SCANNER ACTIVE:
- VIOLATION: dbContext.Users.ToList()
- FIX: dbContext.Users.AsNoTracking().Select(u => new UserDto{}).ToList()
- VIOLATION: Direct DbContext usage
- FIX: Use Repository + Unit of Work (TBC.Common.Repository)

ENFORCE: Entity Framework best practices with TBC patterns!

${allGuidelines}`;
  }

  // Default aggressive scanner
  return `${tbcScanner}

🔥 COMPREHENSIVE TBC SCANNER ACTIVE:
Scan ALL code for TBC Bank standard violations.
Provide immediate, specific corrections.
Reference TBC.Common.* libraries when applicable.
Enforce organizational coding standards aggressively.

${allGuidelines}`;
}

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
        const focusedGuidelines = createFocusedContext(req.body, guidelines);
        
        // FORCE inject TBC context into ALL MCP communications
        req.body.params = req.body.params || {};
        req.body.params.context = req.body.params.context || {};
        
        // Add TBC-specific system message ALWAYS
        req.body.params.context.systemMessage = `
🏦 TBC BANK DEVELOPMENT STANDARDS - PROACTIVE ENFORCEMENT:

${focusedGuidelines}

CRITICAL BEHAVIOR RULES:
1. 🚀 GENERATE TBC-COMPLIANT CODE BY DEFAULT
   - Use kebab-case for ALL API endpoints (get-users NOT get_users)
   - Use PascalCase controllers WITHOUT underscores (UserController NOT User_Controller)
   - Use ILogger<T> for ALL logging (NOT Console.WriteLine)
   - Use AsNoTracking() for read-only database queries
   - Use Repository pattern instead of direct DbContext

2. 🔍 DETECT & CORRECT VIOLATIONS IMMEDIATELY
   - Flag underscores in API routes and controller names
   - Suggest structured logging over string concatenation
   - Recommend async patterns over sync operations
   - Propose DTOs over direct entity returns

3. 🎯 PROACTIVE SUGGESTIONS
   - When user types "get_", suggest "get-" 
   - When user types "User_Controller", suggest "UserController"
   - When user types "Console.WriteLine", suggest "_logger.LogInformation"
   - When user types ".ToList()", suggest ".AsNoTracking().ToList()"

ALWAYS generate code that follows TBC Bank standards from the start!
`;
        
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
          req.body.params.context.guidelines = focusedGuidelines;
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
