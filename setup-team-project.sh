#!/bin/bash

echo "🚀 Setting up TBC Guidelines System for your project..."

# Check if in VS Code workspace
if [ ! -d ".vscode" ]; then
    mkdir .vscode
    echo "📁 Created .vscode directory"
fi

# Configure VS Code to connect to HTTP MCP server
cat > .vscode/mcp.json << 'EOF'
{
  "mcpServers": {
    "tbc-guidelines": {
      "url": "http://localhost:8080/mcp",
      "transport": "http"
    }
  }
}
EOF

cat > .vscode/settings.json << 'EOF'
{
  "github.copilot.enable": {
    "*": true,
    "csharp": true,
    "javascript": true,
    "typescript": true
  },
  "github.copilot.chat.systemMessage": "Always reference TBC Bank MCP server context for comprehensive development standards. Apply all TBC rules.",
  "github.copilot.chat.useContext": "always",
  "github.copilot.editor.useContext": "always",
  "github.copilot.inlineSuggest.enable": true,
  "github.copilot.editor.enableAutoCompletions": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": "explicit"
  },
  "problems.decorations.enabled": true,
  "files.associations": {
    "*.cs": "csharp",
    "*.md": "markdown"
  }
}
EOF

cat > .eslintrc.json << 'EOF'
{
  "extends": ["eslint:recommended"],
  "env": {
    "node": true,
    "es6": true
  },
  "rules": {
    "camelcase": ["error", { "properties": "always" }],
    "no-console": "warn",
    "no-magic-numbers": ["warn", { "ignore": [0, 1, -1, 200, 404, 500] }],
    "prefer-const": "error",
    "no-var": "error"
  }
}
EOF

echo "✅ TBC Guidelines configuration installed!"
echo ""
echo "✅ Project configured to use TBC MCP server via HTTP!"
echo ""
echo "🎯 Prerequisites:"
echo "1. Ensure TBC MCP server is running at http://localhost:8080/mcp"
echo "   (Ask your team lead to start the shared MCP server)"
echo ""
echo "🎯 Next steps:"
echo "1. Restart VS Code in your project"
echo ""
echo "2. Test TBC compliance:"
echo "   - Type incorrect endpoint: [HttpGet(\"get_user\")] (should suggest get-user)"
echo "   - Use Console.WriteLine (should suggest _logger.LogInformation)"  
echo "   - Ask Copilot Chat: 'Review this code for TBC violations'"
echo ""
echo "🚀 Your project now connects to the team's TBC compliance server!"
echo "📖 See TEAM_SETUP.md for detailed testing examples"