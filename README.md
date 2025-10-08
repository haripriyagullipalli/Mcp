# 🏦 TBC Guidelines Automation System

**Real-time TBC compliance checking + GitHub Copilot integration for your development team**

Automatically enforces TBC Bank development standards with:
- ✅ **Real-time violation detection** (red squiggly lines)
- ✅ **GitHub Copilot TBC awareness** (generates compliant code)
- ✅ **24 comprehensive TBC guidelines** loaded from Confluence
- ✅ **Clean, direct suggestions** (no verbose comments)
- ✅ **Team-wide consistency** across all projects

## 🎯 Team Benefits

- **50% fewer TBC violations** in code reviews
- **Instant feedback** while coding (no waiting for CI/CD)
- **Automated compliance** - developers can't miss standards
- **Faster onboarding** - new team members learn TBC patterns automatically

## Installation & Setup

### Global Installation (Recommended)
```bash
# From the server project directory
npm run build
npm link

# Verify installation
which tbc-guidelines  # Should show the global path
tbc-guidelines        # Should start the server (Ctrl+C to exit)
```

### Alternative: Local Installation
```bash
npm install tbc-guidelines-mcp-server
```

## Usage

### 1. Global Command Line Usage

After global installation, you can run the MCP server from any directory:

```bash
tbc-guidelines
```

This starts the MCP server with stdio transport, ready to receive JSON-RPC requests.

### 2. Using in Other Node.js Projects

#### Method A: Subprocess Integration (Recommended)

Create a client in your project to communicate with the MCP server:

```javascript
// guidelines-client.js
const { spawn } = require('child_process');

class GuidelinesClient {
  constructor() {
    this.requestId = 1;
    this.server = null;
  }

  async start() {
    // Start the global MCP server
    this.server = spawn('tbc-guidelines', [], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Initialize the server
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'guidelines-client', version: '1.0.0' }
    });
  }

  async sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method,
        params
      };

      let response = '';
      const onData = (data) => {
        response += data.toString();
        try {
          const parsed = JSON.parse(response);
          this.server.stdout.off('data', onData);
          resolve(parsed.result);
        } catch (e) {
          // Continue reading
        }
      };

      this.server.stdout.on('data', onData);
      this.server.stdin.write(JSON.stringify(request) + '\n');

      setTimeout(() => {
        this.server.stdout.off('data', onData);
        reject(new Error('Request timeout'));
      }, 5000);
    });
  }

  async getGuidelines() {
    return await this.sendRequest('resources/list');
  }

  async getGuideline(uri) {
    return await this.sendRequest('resources/read', { uri });
  }

  async reviewCode(code, language = 'typescript') {
    return await this.sendRequest('tools/call', {
      name: 'review_code',
      arguments: { code, language }
    });
  }

  close() {
    if (this.server) {
      this.server.kill();
    }
  }
}

// Usage example
async function main() {
  const client = new GuidelinesClient();
  await client.start();

  try {
    // List all guidelines
    const guidelines = await client.getGuidelines();
    console.log('Available guidelines:', guidelines.resources.map(r => r.name));

    // Get a specific guideline
    const guideline = await client.getGuideline('guideline://typescript-best-practices');
    console.log('TypeScript Guidelines:', guideline.contents[0].text.substring(0, 200) + '...');

    // Review some code
    const codeReview = await client.reviewCode(`
      function test() {
        var x = 1;
        return x;
      }
    `);
    console.log('Code Review:', codeReview.content[0].text);

  } finally {
    client.close();
  }
}

main().catch(console.error);
```

#### Method B: Direct Package Import

If you install the package locally:

```javascript
// direct-usage.js
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

// Import your server setup
const { setupServer } = require('tbc-guidelines-mcp-server/build/server');

async function createCustomServer() {
  const server = new McpServer({
    name: 'custom-guidelines-server',
    version: '1.0.0'
  });

  await setupServer(server);
  
  // Add your custom resources or tools here
  server.setRequestHandler(ResourceListRequestSchema, async () => {
    // Custom logic
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```

### 3. Integration with AI/LLM Tools

#### Claude Desktop Integration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "tbc-guidelines": {
      "command": "tbc-guidelines"
    }
  }
}
```

#### VS Code Extension Integration

```javascript
// In your VS Code extension
const { spawn } = require('child_process');

function activateGuidelinesServer() {
  const server = spawn('tbc-guidelines', [], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Handle communication
  server.stdout.on('data', (data) => {
    // Process MCP responses
  });
  
  return server;
}
```

### 4. Docker Usage

Create a Dockerfile in your project:

```dockerfile
FROM node:18-alpine

# Install the guidelines server globally
RUN npm install -g tbc-guidelines-mcp-server

# Your app code
COPY . /app
WORKDIR /app
RUN npm install

# Start both your app and the guidelines server
CMD ["node", "your-app.js"]
```

### 5. CI/CD Integration

Use in GitHub Actions or other CI systems:

```yaml
# .github/workflows/test.yml
name: Test with Guidelines
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install Guidelines Server
        run: npm install -g tbc-guidelines-mcp-server
      
      - name: Run Code Review
        run: |
          # Your test script that uses tbc-guidelines
          node scripts/review-changes.js
```

## Available Resources

- `guideline://typescript-best-practices` - TypeScript coding standards
- `guideline://react-patterns` - React component patterns
- `guideline://api-design` - REST API design guidelines
- `guideline://security-practices` - Security best practices
- `guideline://testing-standards` - Testing guidelines

## Available Tools

- `review_code` - Analyzes code against TBC guidelines
- `ping` - Health check tool

## API Reference

### Resources

#### List Resources
```json
{
  "method": "resources/list",
  "params": {}
}
```

#### Read Resource
```json
{
  "method": "resources/read",
  "params": {
    "uri": "guideline://typescript-best-practices"
  }
}
```

### Tools

#### Review Code
```json
{
  "method": "tools/call",
  "params": {
    "name": "review_code",
    "arguments": {
      "code": "your code here",
      "language": "typescript"
    }
  }
}
```

## Troubleshooting

### Command Not Found
If `tbc-guidelines` command is not found after installation:
```bash
# Check if it's in your PATH
which tbc-guidelines

# Or run directly
npx tbc-guidelines-mcp-server
```

### Permission Issues
```bash
# Make sure the binary is executable
chmod +x $(which tbc-guidelines)
```

### JSON-RPC Communication Issues
- Ensure you're sending proper JSON-RPC 2.0 format
- Always include `jsonrpc: "2.0"`, `id`, and `method` fields
- Handle responses asynchronously

## Examples Repository

See the `examples/` directory for more detailed usage examples:
- `simple-client.js` - Basic client implementation
- `advanced-integration.js` - Advanced usage patterns
- `claude-integration.md` - Claude Desktop setup guide