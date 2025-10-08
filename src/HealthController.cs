[ApiController]
[Route("api/v1/[controller]")]
public class HealthController : ControllerBase
{
    /// <summary>
    /// GET /api/v1/health
    /// Returns the health status of the service.
    /// </summary>
    [HttpGet]
    public IActionResult GetHealth()
    {
        return Ok(new
        {
            status = "OK",
            timestamp = System.DateTime.UtcNow.ToString("o")
        });
    }

    [HttpGet("status")]
    public IActionResult GetStatus([FromQuery] HealthStatusRequest request)
    {
        _logger.LogInformation("Health status requested");
        return Ok(new
        {
            service = "HealthService",
            version = "1.0.0",
            uptime = "72 hours"
        });
    }

    [HttpPost("checkStatus")]
    public IActionResult CheckStatus([FromBody] HealthCheckRequest request)
    {
        _logger.LogInformation("Health check requested");
        return Ok(new
        {
            service = "HealthService",
            status = "Healthy"
        });
    }

    [HttpGet("get-custom-status")]
    public IActionResult GetCustomStatus()
    {
        _logger.LogInformation("Custom health status requested");
        return Ok(new
        {
            service = "HealthService",
            status = "Custom Status"
        });
    }

    [HttpGet("detailed-status")]
    public IActionResult GetDetailedStatus()
    {
        _logger.LogInformation("Detailed health status requested");
        return Ok(new
        {
            service = "HealthService",
            status = "Healthy",
            details = new
            {
                cpuUsage = "15%",
                memoryUsage = "256MB",
                diskSpace = "20GB"
            }
        });
    }

}