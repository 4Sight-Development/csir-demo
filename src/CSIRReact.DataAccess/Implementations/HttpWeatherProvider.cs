using System.Net.Http;
using System.Net.Http.Json;
using CSIRReact.DataAccess.Interfaces;
using CSIRReact.DataAccess.Models;

namespace CSIRReact.DataAccess.Implementations
{
    public class HttpWeatherProvider : IWeatherProvider
    {
        private readonly IHttpClientFactory _httpFactory;

        public HttpWeatherProvider(IHttpClientFactory httpFactory)
        {
            _httpFactory = httpFactory;
        }

        public async Task<IpApiResponse?> FetchIpInfoAsync(CancellationToken ct = default)
        {
            var http = _httpFactory.CreateClient();
            try
            {
                var api = await http.GetFromJsonAsync<IpApiDotComResponse>("http://ip-api.com/json/", ct);
                if (api?.status == "success")
                {
                    return new IpApiResponse
                    {
                        country_name = api.country,
                        city = api.city,
                        latitude = api.lat,
                        longitude = api.lon,
                    };
                }
            }
            catch { }
            return null;
        }

        public async Task<OpenMeteoResponse?> FetchHourlyAsync(double latitude, double longitude, DateOnly start, DateOnly end, CancellationToken ct = default)
        {
            var http = _httpFactory.CreateClient();
            var url = $"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&hourly=temperature_2m,weather_code,rain,wind_direction_10m&timezone=auto&start_date={start:yyyy-MM-dd}&end_date={end:yyyy-MM-dd}";
            try
            {
                return await http.GetFromJsonAsync<OpenMeteoResponse>(url, ct);
            }
            catch { return null; }
        }
    }
}
