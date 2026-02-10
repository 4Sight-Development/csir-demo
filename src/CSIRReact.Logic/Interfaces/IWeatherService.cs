using CSIRReact.Logic.Models;

namespace CSIRReact.Logic.Interfaces
{
    public interface IWeatherService
    {
        Task<WeatherGridResponse> GetGridAsync(double? lat, double? lon, string? header, bool? isDefaultLocation, string? startDate, string? endDate, CancellationToken ct = default);

        Task<WeatherMultiGridResponse> GetGridMultiAsync(string? startDate, string? endDate, CancellationToken ct = default);
    }
}
