using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using CSIRReact.Logic.Interfaces;
using CSIRReact.Logic.Models;
using Microsoft.Extensions.Logging;

namespace CSIRReact.Server.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [Authorize]
    public class WeatherForecastController : ControllerBase
    {
        private readonly ILogger<WeatherForecastController> _logger;
        private readonly IWeatherService _weatherService;

        public WeatherForecastController(ILogger<WeatherForecastController> logger, IWeatherService weatherService)
        {
            _logger = logger;
            _weatherService = weatherService;
        }

        [HttpGet("grid")]
        public async Task<ActionResult<WeatherGridResponse>> GetGrid(
            [FromQuery] double? lat,
            [FromQuery] double? lon,
            [FromQuery] string? header,
            [FromQuery(Name = "isDefaultLocation")] bool? isDefaultLocation,
            [FromQuery(Name = "start_date")] string? startDate,
            [FromQuery(Name = "end_date")] string? endDate)
        {
            var resp = await _weatherService.GetGridAsync(lat, lon, header, isDefaultLocation, startDate, endDate);
            return Ok(resp);
        }

        [HttpGet("grid-multi")]
        public async Task<ActionResult<WeatherMultiGridResponse>> GetGridMulti(
            [FromQuery(Name = "start_date")] string? startDate,
            [FromQuery(Name = "end_date")] string? endDate)
        {
            var resp = await _weatherService.GetGridMultiAsync(startDate, endDate);
            return Ok(resp);
        }
    }
}
