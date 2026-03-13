using IotMonitoring.Domain.Entities;
using IotMonitoring.Domain.Interfaces.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IotMonitoring.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProvincesController : ControllerBase
{
    private readonly IProvinceRepository _repo;

    public ProvincesController(IProvinceRepository repo) => _repo = repo;

    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _repo.GetAllAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var province = await _repo.GetByIdAsync(id);
        return province == null ? NotFound() : Ok(province);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] ProvinceRequest request)
    {
        var province = new Province { Name = request.Name, Code = request.Code, SortOrder = request.SortOrder };
        await _repo.AddAsync(province);
        return CreatedAtAction(nameof(GetById), new { id = province.Id }, province);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] ProvinceRequest request)
    {
        var province = await _repo.GetByIdAsync(id);
        if (province == null) return NotFound();

        province.Name = request.Name;
        province.Code = request.Code;
        province.SortOrder = request.SortOrder;
        await _repo.UpdateAsync(province);
        return Ok(province);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _repo.DeleteAsync(id);
        return NoContent();
    }
}

public record ProvinceRequest(string Name, string? Code, int SortOrder = 0);
