using System.Security.Claims;
using IotMonitoring.Domain.Interfaces.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IotMonitoring.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AlarmsController : ControllerBase
{
    private readonly IAlarmLogRepository _repo;

    public AlarmsController(IAlarmLogRepository repo) => _repo = repo;

    [HttpGet("active")]
    public async Task<IActionResult> GetActive()
        => Ok(await _repo.GetActiveAlarmsAsync());

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? deviceId,
        [FromQuery] bool? isResolved,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (deviceId.HasValue)
        {
            var alarms = await _repo.GetByDeviceIdAsync(deviceId.Value, from, to, page, pageSize);
            var total = await _repo.GetTotalCountAsync(deviceId, isResolved, from, to);
            return Ok(new { Items = alarms, TotalCount = total, Page = page, PageSize = pageSize });
        }

        var totalCount = await _repo.GetTotalCountAsync(null, isResolved, from, to);
        return Ok(new { TotalCount = totalCount, Page = page, PageSize = pageSize });
    }

    [HttpPost("{id}/acknowledge")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<IActionResult> Acknowledge(long id)
    {
        var user = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
        await _repo.AcknowledgeAsync(id, user);
        return Ok(new { message = "Alarm acknowledged" });
    }

    [HttpPost("{id}/resolve")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<IActionResult> Resolve(long id)
    {
        var user = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
        await _repo.ResolveAsync(id, user);
        return Ok(new { message = "Alarm resolved" });
    }
}
