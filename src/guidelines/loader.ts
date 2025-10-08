import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { Guideline, GuidelinesMap } from "./types";
import fs from "fs";
import path from "path";

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

console.error("🔧 Environment loaded - Base URL:", process.env.CONFLUENCE_BASE_URL);

const BASE_URL = process.env.CONFLUENCE_BASE_URL;
const EMAIL = process.env.CONFLUENCE_EMAIL!;
const API_TOKEN = process.env.CONFLUENCE_API_TOKEN!;
const MAIN_PAGE_ID = process.env.CONFLUENCE_MAIN_PAGE_ID!;
// if (!MAIN_PAGE_ID) throw new Error("Environment variable MAIN_PAGE_ID is not set.");

// Helper: returns the authorization header
function getAuthHeader() {
  const creds = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");
  return { Authorization: `Basic ${creds}` };
}

// Fetch a Confluence page by ID
async function fetchPageContent(pageId: string): Promise<string> {
  const url = `${BASE_URL}/rest/api/content/${pageId}?expand=body.view`;
  const res = await fetch(url, { headers: getAuthHeader() });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch page ${pageId}: ${res.status} ${res.statusText} - ${errorText}`);
  }
  const data = (await res.json()) as { body: { view: { value: string } } };
  return data.body.view.value; // HTML string
}

// Object to store all guidelines
export const guidelines: GuidelinesMap = {};

// Helper: fetch child page IDs for a given page
async function fetchChildPageIds(pageId: string): Promise<string[]> {
  const url = `${BASE_URL}/rest/api/content/${pageId}/child/page`;
  const res = await fetch(url, { headers: getAuthHeader() });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch child pages for ${pageId}: ${res.status} ${res.statusText} - ${errorText}`);
  }
  const data: any = await res.json();
  if (!data.results) return [];
  return data.results.map((page: any) => page.id);
}

// Load comprehensive TBC guidelines from documentation
function loadComprehensiveTBCGuidelines(): GuidelinesMap {
  const comprehensive: GuidelinesMap = {};

  // 1. Backend Development Guidelines
  comprehensive["backend-comprehensive"] = {
    title: "Backend Development - Comprehensive Rules",
    text: `
PROGRAMMING LANGUAGE: C#/.NET with LTS versions only
FRAMEWORK: ASP.NET Core Web API exclusively
ARCHITECTURE: Clean Architecture (Domain → Application → Infrastructure → Presentation)

PROJECT STRUCTURE:
✅ Use .NET project templates
✅ Implement Clean Architecture layers
✅ Follow Domain-Driven Design principles

AUTHENTICATION & AUTHORIZATION:
✅ Use JWT tokens for API authentication  
✅ Implement role-based authorization
✅ Use Azure AD/Identity Server integration

DATABASE ACCESS:
✅ SQL Server as primary database
✅ Entity Framework Core for data access
✅ Use Repository + Unit of Work patterns
✅ Implement database migrations
✅ Use AsNoTracking() for read-only queries

TESTING:
✅ Unit testing with xUnit framework
✅ 80%+ code coverage requirement
✅ Integration testing for APIs
✅ SonarQube integration for quality gates

SECURITY:
✅ Follow OWASP security guidelines
✅ Implement input validation
✅ Use parameterized queries
✅ Sanitize all user inputs
✅ Regular NuGet vulnerability checks
`,
    url: "internal://backend-comprehensive"
  };

  // 2. API Design - Complete Rules
  comprehensive["api-design-complete"] = {
    title: "API Design - Complete Rules",
    text: `
URI NAMING CONVENTIONS:
✅ Use lowercase letters only
✅ Use hyphens (-) instead of underscores (_)  
✅ Use plural nouns for collections
✅ Use hierarchical structure: /api/v1/users/{id}/orders

HTTP METHODS:
✅ GET: Retrieve data (idempotent)
✅ POST: Create new resources
✅ PUT: Update entire resource (idempotent)  
✅ PATCH: Partial updates
✅ DELETE: Remove resources (idempotent)

PAYLOAD MODELING:
✅ Use consistent JSON formats
✅ camelCase for property names
✅ Include proper validation
✅ Use DTOs, never return entities directly

ERROR HANDLING:
✅ Use appropriate HTTP status codes
✅ Provide meaningful error messages
✅ Include error codes for programmatic handling
✅ Consistent error format across APIs

API VERSIONING:
✅ Use versioned endpoints: /api/v1/, /api/v2/
✅ Maintain backward compatibility
✅ Proper deprecation strategies

HTTP STATUS CODES:
✅ 200: OK (successful GET, PUT, PATCH)
✅ 201: Created (successful POST)
✅ 204: No Content (successful DELETE)
✅ 400: Bad Request (validation errors)
✅ 401: Unauthorized (authentication required)
✅ 403: Forbidden (insufficient permissions)
✅ 404: Not Found (resource doesn't exist)
✅ 500: Internal Server Error (server issues)
`,
    url: "internal://api-design-complete"
  };

  // 3. Logging - Comprehensive Rules  
  comprehensive["logging-comprehensive"] = {
    title: "Logging - Comprehensive Standards",
    text: `
LOGGING FRAMEWORK: Serilog preferred, NLog acceptable
DEPENDENCY INJECTION: Use ILogger<T> interface always

STRUCTURED LOGGING:
✅ Use structured logging with parameters
✅ Example: _logger.LogInformation("Processing {UserId} for {ActionType}", userId, actionType)
❌ Avoid: _logger.LogInformation("Processing " + userId + " for " + actionType)

LOG LEVELS:
✅ Trace: Detailed diagnostic information
✅ Debug: Development-time diagnostic information  
✅ Information: General application flow
✅ Warning: Unexpected situations that don't stop execution
✅ Error: Error events that allow application to continue
✅ Critical: Fatal errors that may cause application termination

SENSITIVE DATA:
✅ Use TBC.Common.Serilog for automatic masking
✅ Never log passwords, tokens, or PII directly
✅ Implement log sanitization for sensitive fields

CONSOLE OUTPUT:
❌ Never use Console.WriteLine() in production code
✅ Always use ILogger<T> interface for all logging needs

PERFORMANCE:
✅ Use conditional logging for expensive operations
✅ Implement proper log levels to control verbosity
`,
    url: "internal://logging-comprehensive"
  };

  // 4. Entity Framework - Complete Guidelines
  comprehensive["ef-comprehensive"] = {
    title: "Entity Framework - Complete Guidelines", 
    text: `
ORM: Entity Framework Core exclusively
DATABASE: SQL Server 2019+ as primary database

PERFORMANCE OPTIMIZATION:
✅ Use AsNoTracking() for read-only queries
✅ Use Select() projections to fetch specific fields
✅ Implement proper indexing strategies
✅ Use async methods: ToListAsync(), SaveChangesAsync()

REPOSITORY PATTERN:
✅ Use Repository + Unit of Work patterns
✅ Use TBC.Common.Repository libraries
❌ Avoid direct DbContext usage in controllers
✅ Implement generic repository interfaces

MIGRATIONS:
✅ Use code-first migrations
✅ Proper migration naming conventions
✅ Test migrations on staging before production

QUERY OPTIMIZATION:
✅ Use Include() for eager loading when needed
✅ Avoid N+1 query problems
✅ Use Split Queries for complex includes
✅ Implement query result caching where appropriate

DATA VALIDATION:
✅ Use Data Annotations for basic validation
✅ Implement Fluent Validation for complex rules
✅ Server-side validation always required
`,
    url: "internal://ef-comprehensive"
  };

  // 5. Security - Complete Guidelines
  comprehensive["security-comprehensive"] = {
    title: "Security - Complete Guidelines",
    text: `
OWASP COMPLIANCE:
✅ Follow OWASP Top 10 security risks
✅ Implement proper input validation
✅ Use parameterized queries (prevent SQL injection)
✅ Implement proper authentication and authorization

INPUT VALIDATION:
✅ Validate all user inputs server-side
✅ Use whitelist approach for validation
✅ Sanitize inputs before processing
✅ Implement proper error messages without revealing system details

AUTHENTICATION:
✅ Use JWT tokens for API authentication
✅ Implement proper token expiration
✅ Use secure token storage mechanisms
✅ Implement refresh token patterns

AUTHORIZATION:
✅ Use role-based access control (RBAC)
✅ Implement claim-based authorization
✅ Apply principle of least privilege
✅ Validate permissions at multiple layers

DATA PROTECTION:
✅ Use HTTPS for all communications
✅ Encrypt sensitive data at rest
✅ Implement proper key management
✅ Use secure configuration management
`,
    url: "internal://security-comprehensive"
  };

  // 6. Testing - Complete Standards
  comprehensive["testing-comprehensive"] = {
    title: "Testing - Complete TBC Standards",
    text: `
TESTING FRAMEWORK: xUnit for .NET exclusively
CODE COVERAGE: Minimum 80% coverage required
TESTING STRATEGY: Unit → Integration → E2E testing pyramid

UNIT TESTING:
✅ Test all business logic methods
✅ Use AAA pattern (Arrange, Act, Assert)
✅ Mock external dependencies (IRepository, ILogger, etc.)
✅ Test both positive and negative scenarios
✅ Use meaningful test names: Should_ReturnError_When_UserNotFound()

INTEGRATION TESTING:
✅ Test API endpoints with TestServer
✅ Test database operations with test database
✅ Test external service integrations
✅ Use WebApplicationFactory for API testing

MOCKING:
✅ Use Moq library for mocking
✅ Mock ILogger<T>, IRepository, external services
✅ Verify method calls and parameters
✅ Setup return values for different scenarios

SONARQUBE INTEGRATION:
✅ Quality gates must pass before merge
✅ No code smells, bugs, or vulnerabilities
✅ Maintain code coverage thresholds
`,
    url: "internal://testing-comprehensive"
  };

  // 7. Project Structure & Architecture
  comprehensive["architecture-comprehensive"] = {
    title: "Clean Architecture & Project Structure",
    text: `
ARCHITECTURE PATTERN: Clean Architecture mandatory
LAYERS: Domain → Application → Infrastructure → Presentation

PROJECT STRUCTURE:
✅ Domain Layer: Entities, Value Objects, Domain Services
✅ Application Layer: Use Cases, DTOs, Interfaces
✅ Infrastructure Layer: Data Access, External Services
✅ Presentation Layer: Controllers, ViewModels

DEPENDENCY INJECTION:
✅ Use .NET Core built-in IoC container
✅ Register services with appropriate lifetimes
✅ Use interfaces for all dependencies
✅ Constructor injection preferred

DOMAIN-DRIVEN DESIGN:
✅ Rich domain models with behavior
✅ Aggregate roots for consistency boundaries
✅ Domain events for cross-cutting concerns
✅ Value objects for primitive obsession

CQRS PATTERN:
✅ Separate read and write models
✅ Use MediatR for command/query handling
✅ Implement command and query handlers
✅ Read models optimized for queries
`,
    url: "internal://architecture-comprehensive"
  };

  // 8. Background Tasks & Jobs
  comprehensive["background-tasks"] = {
    title: "Background Tasks & Job Processing",
    text: `
BACKGROUND SERVICE: Use TBC.Common.BackgroundTasks
JOB SCHEDULING: Hangfire or Quartz.NET integration
ASYNC PROCESSING: For long-running operations

IMPLEMENTATION:
✅ Use IHostedService for background services
✅ Implement proper cancellation token handling
✅ Use TBC.Common.BackgroundTasks library
✅ Queue jobs for async processing

ERROR HANDLING:
✅ Implement retry mechanisms
✅ Dead letter queue for failed jobs
✅ Proper logging of job execution
✅ Monitor job performance and health

PATTERNS:
✅ Fire-and-forget for non-critical tasks
✅ Delayed jobs for scheduled operations
✅ Recurring jobs for maintenance tasks
✅ Batch jobs for bulk operations
`,
    url: "internal://background-tasks"
  };

  // 9. File Storage & Management
  comprehensive["file-storage"] = {
    title: "File Storage & Management Guidelines",
    text: `
CLOUD STORAGE: Azure Blob Storage preferred
FILE VALIDATION: Mandatory for all uploads
VIRUS SCANNING: Required for uploaded files

FILE UPLOAD:
✅ Validate file types and sizes
✅ Generate unique file names
✅ Use secure file storage paths
✅ Implement virus scanning

SECURITY:
✅ Validate file extensions against whitelist
✅ Check file content, not just extension
✅ Limit file sizes per upload
✅ Scan for malware before storage

PERFORMANCE:
✅ Use streaming for large files
✅ Implement progress tracking
✅ Compress files when appropriate
✅ Use CDN for file distribution
`,
    url: "internal://file-storage"
  };

  // 10. Messaging & Integration
  comprehensive["messaging-comprehensive"] = {
    title: "Messaging & Integration Patterns",
    text: `
MESSAGE BROKERS: RabbitMQ or TIBCO EMS
INTEGRATION PATTERNS: Event-driven architecture
ASYNC MESSAGING: For microservice communication

IMPLEMENTATION:
✅ Use message queues for decoupling
✅ Implement event sourcing patterns
✅ Use publish-subscribe for events
✅ Implement saga patterns for distributed transactions

MESSAGE DESIGN:
✅ Include correlation IDs
✅ Use versioned message schemas
✅ Include timestamp and source information
✅ Implement idempotent message handlers

ERROR HANDLING:
✅ Dead letter queues for failed messages
✅ Retry mechanisms with exponential backoff
✅ Circuit breaker patterns
✅ Message deduplication
`,
    url: "internal://messaging-comprehensive"
  };

  // 11. API Documentation & Contracts
  comprehensive["api-documentation"] = {
    title: "API Documentation & Contract Standards",
    text: `
DOCUMENTATION: OpenAPI/Swagger mandatory
CONTRACT-FIRST: Define API contracts before implementation
VERSIONING: Document all API versions

SWAGGER/OPENAPI:
✅ Complete API documentation required
✅ Include request/response examples
✅ Document all HTTP status codes
✅ Include authentication requirements

API CONTRACTS:
✅ Define clear request/response DTOs
✅ Include validation rules in documentation
✅ Specify required vs optional fields
✅ Document error response formats

EXAMPLES:
✅ Provide realistic request examples
✅ Include common error scenarios
✅ Document authentication flows
✅ Include rate limiting information
`,
    url: "internal://api-documentation"
  };

  // 12. Performance & Optimization
  comprehensive["performance-optimization"] = {
    title: "Performance & Optimization Guidelines",
    text: `
DATABASE OPTIMIZATION: Query performance critical
CACHING: Redis for distributed caching
ASYNC PATTERNS: Use async/await throughout

DATABASE PERFORMANCE:
✅ Use AsNoTracking() for read-only queries
✅ Implement proper indexing strategies
✅ Use Select() projections to limit data
✅ Batch operations when possible

CACHING STRATEGIES:
✅ Cache frequently accessed data
✅ Use Redis for distributed caching
✅ Implement cache-aside pattern
✅ Set appropriate expiration times

API PERFORMANCE:
✅ Implement pagination for large datasets
✅ Use compression for responses
✅ Implement rate limiting
✅ Monitor response times and optimize
`,
    url: "internal://performance-optimization"
  };

  // 13. Monitoring & Observability
  comprehensive["monitoring-observability"] = {
    title: "Monitoring & Observability Standards",
    text: `
TELEMETRY: Application Insights integration
HEALTH CHECKS: Mandatory for all services
METRICS: Custom metrics for business operations

MONITORING:
✅ Implement health check endpoints
✅ Use Application Insights for telemetry
✅ Monitor application performance
✅ Set up alerts for critical issues

LOGGING INTEGRATION:
✅ Structured logging with Serilog
✅ Log correlation IDs for tracing
✅ Use Graylog for centralized logging
✅ Include performance metrics in logs

METRICS:
✅ Track business-relevant metrics
✅ Monitor API response times
✅ Track error rates and patterns
✅ Implement custom counters and gauges
`,
    url: "internal://monitoring-observability"
  };

  // 14. Deployment & DevOps
  comprehensive["deployment-devops"] = {
    title: "Deployment & DevOps Standards",
    text: `
CI/CD: Azure DevOps pipelines mandatory
DEPLOYMENT: Blue-green deployment strategy
CONFIGURATION: Environment-specific configs

BUILD PIPELINE:
✅ Automated builds on code commit
✅ Run all tests in pipeline
✅ SonarQube quality gates
✅ Security vulnerability scanning

DEPLOYMENT STRATEGY:
✅ Blue-green deployments for zero downtime
✅ Database migration automation
✅ Rollback procedures documented
✅ Environment-specific configurations

INFRASTRUCTURE:
✅ Infrastructure as Code (Terraform/ARM)
✅ Container deployment with Docker
✅ Kubernetes orchestration where applicable
✅ Load balancer configuration
`,
    url: "internal://deployment-devops"
  };

  return comprehensive;
}

// Load only guideline pages linked from the main page
export async function loadGuidelines(): Promise<GuidelinesMap> {
  console.error(`🔄 Loading guidelines from page ID: ${MAIN_PAGE_ID}`);
  const html = await fetchPageContent(MAIN_PAGE_ID!);
  const $ = cheerio.load(html);

  const urls: string[] = [];
  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.includes("/pages/")) urls.push(href);
  });
  
  console.error(`🔗 Found ${urls.length} guideline page links`);

  for (const url of urls) {
    const match = url.match(/\/pages\/(\d+)/);
    if (!match) continue;

    const pageId = match[1];
    try {
      const contentHtml = await fetchPageContent(pageId);
      const $$ = cheerio.load(contentHtml);
      const title = $$("h1").first().text() || url;
      let text = $$.text().replace(/\s+/g, " ").trim();

      // Find and fetch content of any linked guideline pages within this page
      const subUrls: string[] = [];
      $$('a').each((_, el) => {
        const href = $$(el).attr('href');
        if (href && href.includes('/pages/')) subUrls.push(href);
      });

      // Fetch all sub guideline pages in parallel
      const subPagePromises = subUrls.map(async (subUrl) => {
        const subMatch = subUrl.match(/\/pages\/(\d+)/);
        if (!subMatch) return '';
        const subPageId = subMatch[1];
        try {
          const subContentHtml = await fetchPageContent(subPageId);
          const $$$ = cheerio.load(subContentHtml);
          const subTitle = $$$('h1').first().text() || subUrl;
          const subText = $$$.text().replace(/\s+/g, ' ').trim();
          return `\n\n---\nIncluded from: ${subTitle}\n${subText}\nURL: ${subUrl}`;
        } catch (err) {
          console.error(`❌ Failed to load included page ${subUrl}:`, err);
          return '';
        }
      }); 
      const subPageContents = await Promise.all(subPagePromises);
      text += subPageContents.join('');

      guidelines[pageId] = { title, text: `${text}\nURL: ${url}`, url };
      console.error(`✅ Loaded guideline: ${title}`);
    } catch (err) {
      console.error(`❌ Failed to load ${url}:`, err);
    }
  }

  // Add comprehensive TBC guidelines from documentation
  
  // Load comprehensive TBC rules from local documentation
  const comprehensiveGuidelines = loadComprehensiveTBCGuidelines();
  Object.assign(guidelines, comprehensiveGuidelines);

  // Add critical API naming guideline
  guidelines["api-naming-critical"] = {
    title: "CRITICAL: API Endpoint Naming Standard",
    text: `MANDATORY TBC BANK STANDARD: API endpoints MUST use kebab-case (hyphens), NOT underscores.

✅ CORRECT EXAMPLES:
- /api/v1/user-profiles
- /api/v1/account-transactions  
- /api/v1/payment-methods
- /api/v1/loan-applications

❌ WRONG EXAMPLES:
- /api/v1/user_profiles (underscores not allowed)
- /api/v1/account_transactions (underscores not allowed)
- /api/v1/payment_methods (underscores not allowed)

This is a mandatory organizational standard that must be followed in ALL API endpoints.`,
    url: "internal://api-naming-standard"
  };

  console.error(`📋 Total guidelines loaded: ${Object.keys(guidelines).length}`);
  return guidelines;
}

