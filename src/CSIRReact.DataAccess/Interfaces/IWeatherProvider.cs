using CSIRReact.DataAccess.Models;

namespace CSIRReact.DataAccess.Interfaces
{
    public interface IWeatherProvider
    {
        Task<IpApiResponse?> FetchIpInfoAsync(CancellationToken ct = default);

        Task<OpenMeteoResponse?> FetchHourlyAsync(double latitude, double longitude, DateOnly start, DateOnly end, CancellationToken ct = default);
    }
}
