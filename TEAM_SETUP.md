# 🏦 TBC Guidelines MCP Server - Team Setup Guide

## 📋 Overview

This repository provides an MCP (Model Context Protocol) server that loads TBC Bank development guidelines and integrates them with VS Code and GitHub Copilot for real-time, compliant code suggestions.

## 🚀 Quick Team Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd tbc-guidelines-mcp-server
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create a `.env` file with your Confluence credentials:
```bash
CONFLUENCE_BASE_URL=https://your-confluence.atlassian.net
CONFLUENCE_EMAIL=your-email@tbc.ge
CONFLUENCE_API_TOKEN=your-api-token
CONFLUENCE_MAIN_PAGE_ID=your-main-page-id
```

### 4. Start the MCP Server
```bash
# Development mode (HTTP)
npm run dev:http

# Production mode
npm run build
npm run start:http
```

### 5. Setup Your Project
In your development project directory, run:
```bash
bash /path/to/tbc-guidelines-mcp-server/setup-team-project.sh
```

This will:
- Create `.vscode/` configuration for MCP integration
- Configure GitHub Copilot for TBC context
- Set up code quality tools

## 🧪 Testing the Integration

### Test 1: API Endpoint Naming Violations
Create a C# controller with these **incorrect** patterns:
```csharp
[ApiController]
[Route("api/v1/users")]
public class UsersController : ControllerBase
{
    [HttpGet("get_user_profile")]        // ❌ Uses underscores
    [HttpPost("create_new_user")]        // ❌ Uses underscores
    [HttpPut("update_user_details")]     // ❌ Uses underscores
    [HttpDelete("delete_user_account")]  // ❌ Uses underscores
    public IActionResult GetUserProfile()
    {
        return Ok();
    }
}
```

**Expected:** Copilot should suggest kebab-case alternatives:
- `get-user-profile`
- `create-new-user`
- `update-user-details`
- `delete-user-account`

### Test 2: Controller Naming Violations
```csharp
public class User_Controller : ControllerBase  // ❌ Underscore in class name
{
    // Should suggest: UserController
}

public class usercontroller : ControllerBase   // ❌ Lowercase
{
    // Should suggest: UserController (PascalCase)
}
```

### Test 3: Logging Violations
```csharp
public class OrderService
{
    public void ProcessOrder(int orderId)
    {
        Console.WriteLine("Processing order: " + orderId);           // ❌ Console output
        System.Diagnostics.Debug.WriteLine("Debug info");           // ❌ Debug output
        throw new Exception("Order failed for ID: " + orderId);     // ❌ String concatenation
    }
}
```

**Expected Suggestions:**
```csharp
public class OrderService
{
    private readonly ILogger<OrderService> _logger;

    public void ProcessOrder(int orderId)
    {
        _logger.LogInformation("Processing order: {OrderId}", orderId);     // ✅ Structured logging
        _logger.LogDebug("Debug info for order {OrderId}", orderId);       // ✅ Proper debug logging
        throw new Exception($"Order failed for ID: {orderId}");            // ✅ String interpolation
    }
}
```

### Test 4: Database Query Issues
```csharp
public class UserRepository
{
    public List<User> GetAllUsers()
    {
        var users = dbContext.Users.ToList();                    // ❌ Missing AsNoTracking()
        var activeUsers = dbContext.Users.Where(u => u.IsActive).ToList();  // ❌ Missing AsNoTracking()
        return users;
    }

    public User GetUser(int id)
    {
        return dbContext.Users.FirstOrDefault(u => u.Id == id);  // ❌ Missing AsNoTracking()
    }
}
```

**Expected Suggestions:**
```csharp
public class UserRepository
{
    public async Task<List<User>> GetAllUsersAsync()
    {
        return await dbContext.Users.AsNoTracking().ToListAsync();                    // ✅ AsNoTracking + Async
        var activeUsers = await dbContext.Users.AsNoTracking().Where(u => u.IsActive).ToListAsync();  // ✅ Optimized
    }

    public async Task<User> GetUserAsync(int id)
    {
        return await dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);  // ✅ Async + AsNoTracking
    }
}
```

### Test 5: API Versioning Violations
```csharp
[ApiController]
[Route("api/users")]              // ❌ Missing version
public class UsersController : ControllerBase
{
    [HttpGet("users")]            // ❌ No versioning
    public IActionResult GetUsers()
    {
        return Ok();
    }
}
```

**Expected:** Should suggest `[Route("api/v1/users")]` and proper versioning.

### Test 6: Error Handling Violations
```csharp
[HttpGet("{id}")]
public IActionResult GetUser(int id)
{
    try
    {
        var user = userService.GetUser(id);
        return Ok(user);
    }
    catch (Exception ex)
    {
        return BadRequest(ex.Message);  // ❌ Exposing internal error details
    }
}
```

**Expected Suggestions:**
```csharp
[HttpGet("{id}")]  
public IActionResult GetUser(int id)
{
    try
    {
        var user = userService.GetUser(id);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }
        return Ok(user);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error retrieving user {UserId}", id);
        return Problem(                     // ✅ RFC-7807 format
            detail: "An error occurred while retrieving the user",
            statusCode: 500,
            title: "Internal Server Error"
        );
    }
}
```

### Test 7: Async Pattern Violations
```csharp
public class UserService
{
    public User GetUser(int id)                    // ❌ Synchronous method
    {
        return repository.GetUser(id);
    }

    public void SaveUser(User user)                // ❌ No async, no return value
    {
        repository.Save(user);
    }
}
```

**Expected Suggestions:**
```csharp
public class UserService
{
    public async Task<User> GetUserAsync(int id)           // ✅ Async pattern
    {
        return await repository.GetUserAsync(id);
    }

    public async Task<bool> SaveUserAsync(User user)       // ✅ Async with meaningful return
    {
        return await repository.SaveAsync(user);
    }
}
```

### Test 8: Clean Architecture Violations
```csharp
[ApiController]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _dbContext;     // ❌ Direct DbContext in controller

    [HttpGet]
    public IActionResult GetUsers()
    {
        var users = _dbContext.Users.ToList();   // ❌ Direct data access in controller
        return Ok(users);                        // ❌ Returning entities, not DTOs
    }
}
```

**Expected Suggestions:**
```csharp
[ApiController]
public class UsersController : ControllerBase
{
    private readonly IMediator _mediator;         // ✅ CQRS with MediatR
    
    [HttpGet]
    public async Task<IActionResult> GetUsersAsync()
    {
        var users = await _mediator.Send(new GetUsersQuery());  // ✅ Clean Architecture
        return Ok(users);                                       // ✅ Returns DTOs from query
    }
}
```

### Test 9: Ask Copilot Chat - Comprehensive Review
In VS Code, paste any of the above code and ask:
```
"Review this code for comprehensive TBC compliance and suggest all improvements"
```

**Expected:** Detailed analysis covering:
- Naming conventions
- Architecture patterns
- Error handling
- Logging standards  
- Database optimization
- Security considerations

### Test 10: Ask for TBC-Compliant Code Generation
Ask Copilot Chat:
```
"Generate a complete user management API following all TBC Bank standards"
```

**Expected:** Complete controller with:
- Proper versioning (`api/v1/`)
- Kebab-case endpoints
- CQRS pattern
- Structured logging
- RFC-7807 error handling
- Async patterns
- Clean Architecture

## 🔧 Verification Steps

### 1. Check MCP Server is Running
```bash
curl http://localhost:8080/mcp
```
Should return MCP server response with TBC context.

### 2. Verify VS Code Integration
- Open Command Palette (`Cmd+Shift+P`)
- Look for "GitHub Copilot" commands
- Check that suggestions include TBC-specific patterns

### 3. Test Code Completions
- Start typing a controller method
- Copilot should suggest TBC-compliant patterns automatically

## 📁 Project Structure

```
tbc-guidelines-mcp-server/
├── src/
│   ├── server.ts           # Main MCP server
│   ├── index.ts            # Entry point  
│   └── guidelines/
│       ├── loader.ts       # Loads TBC guidelines
│       └── types.ts        # Type definitions
├── .vscode/                # VS Code configuration
├── setup-team-project.sh  # Team setup script
├── package.json
└── README.md
```

## 🎯 Available Scripts

```bash
npm run dev              # Start in stdio mode (VS Code integration)
npm run dev:http         # Start in HTTP mode (team access)
npm run build           # Build TypeScript to JavaScript
npm run start           # Run built server (stdio mode)
npm run start:http      # Run built server (HTTP mode)
```

## 🛠️ Troubleshooting

### MCP Server Not Starting
1. Check `.env` file exists and has correct Confluence credentials
2. Verify Node.js version (requires Node 16+)
3. Run `npm install` to ensure dependencies are installed

### No Code Suggestions
1. Verify MCP server is running: `curl http://localhost:8080/mcp`
2. Check VS Code settings include Copilot context configuration
3. Restart VS Code after setup
4. Ensure GitHub Copilot extension is installed and logged in

### Wrong Suggestions
1. Check MCP server logs for guideline loading
2. Verify TBC guidelines are being loaded from Confluence
3. Test with clear violations (underscores in API routes)

## 🔄 Updates and Maintenance

### Update Guidelines
Guidelines are loaded from Confluence automatically. To refresh:
1. Restart the MCP server
2. New guidelines will be pulled from Confluence

### Update Team Projects
When guidelines change, team members should:
1. Pull latest repository changes
2. Restart their MCP server
3. Restart VS Code

## 🌐 Network Access

The MCP server runs on `http://localhost:8080/mcp` by default. For team-wide access:
1. Configure server on a shared development machine
2. Update `.vscode/mcp.json` with the server URL
3. Ensure firewall allows access to port 8080

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review MCP server logs for errors
3. Contact the development standards team

---

**🎯 Goal:** Every team member gets real-time, TBC-compliant code suggestions automatically!