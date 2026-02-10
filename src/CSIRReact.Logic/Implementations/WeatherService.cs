using CSIRReact.DataAccess.Interfaces;
using CSIRReact.DataAccess.Models;
using CSIRReact.Logic.Interfaces;
using CSIRReact.Logic.Models;

namespace CSIRReact.Logic.Implementations
{
    public class WeatherService : IWeatherService
    {
        private readonly IWeatherProvider _provider;

        private static readonly Dictionary<string, string> _locationHeaderCache = new();

        public WeatherService(IWeatherProvider provider)
        {
            _provider = provider;
        }

        public async Task<WeatherGridResponse> GetGridAsync(double? lat, double? lon, string? header, bool? isDefaultLocation, string? startDate, string? endDate, CancellationToken ct = default)
        {
            IpApiResponse? ipInfo = null;
            if (!lat.HasValue || !lon.HasValue)
            {
                if (isDefaultLocation != true)
                {
                    ipInfo = await _provider.FetchIpInfoAsync(ct);
                }
            }

            const double defaultLat = -25.75;
            const double defaultLon = 28.25;

            double latitude = lat ?? (isDefaultLocation == true ? defaultLat : (ipInfo?.latitude ?? defaultLat));
            double longitude = lon ?? (isDefaultLocation == true ? defaultLon : (ipInfo?.longitude ?? defaultLon));

            string? countryNameProp = ipInfo?.country_name;
            string? countryCapitalProp = ipInfo?.country_capital;
            string? cityProp = ipInfo?.city;
            if (isDefaultLocation == true)
            {
                countryNameProp = "South Africa";
                countryCapitalProp = "Pretoria";
                cityProp = "Pretoria";
            }

            string locationHeader = string.Empty;
            if (!string.IsNullOrWhiteSpace(header))
            {
                locationHeader = header!;
            }
            else
            {
                var cacheKey = $"{latitude:F4}:{longitude:F4}";
                if (_locationHeaderCache.TryGetValue(cacheKey, out var cached))
                {
                    locationHeader = cached;
                }
                else
                {
                    locationHeader = isDefaultLocation == true
                        ? "Default Location, South Africa, Pretoria"
                        : $"Lat {latitude:F4}, Lon {longitude:F4}";
                    _locationHeaderCache[cacheKey] = locationHeader;
                }
            }

            DateOnly end = DateOnly.FromDateTime(DateTime.UtcNow);
            DateOnly start = end.AddDays(-13);
            if (DateOnly.TryParse(startDate, out var s)) start = s;
            if (DateOnly.TryParse(endDate, out var e)) end = e;
            if (start > end) { var tmp = start; start = end; end = tmp; }

            var apiResp = await _provider.FetchHourlyAsync(latitude, longitude, start, end, ct);

            var rows = new List<Dictionary<string, object?>>();
            if (apiResp?.hourly?.time != null)
            {
                var times = apiResp.hourly.time;
                var temps = apiResp.hourly.temperature_2m ?? new List<double?>();
                var codes = apiResp.hourly.weather_code ?? new List<int?>();
                var rain = apiResp.hourly.rain ?? new List<double?>();
                var windDir = apiResp.hourly.wind_direction_10m ?? new List<double?>();

                int count = times.Count;
                count = new[] { count, temps.Count, codes.Count, rain.Count, windDir.Count }.Where(c => c > 0).DefaultIfEmpty(count).Min();

                for (int i = 0; i < count; i++)
                {
                    rows.Add(new Dictionary<string, object?>
                    {
                        ["time"] = times[i],
                        ["temperature_2m"] = i < temps.Count ? temps[i] : null,
                        ["weather_code"] = i < codes.Count ? codes[i] : null,
                        ["rain"] = i < rain.Count ? rain[i] : null,
                        ["wind_direction_10m"] = i < windDir.Count ? windDir[i] : null,
                    });
                }
            }

            var dayStats = AggregateDayStats(rows);

            return new WeatherGridResponse
            {
                LocationHeader = locationHeader,
                Rows = rows,
                Days = dayStats,
                CountryName = countryNameProp,
                CountryCapital = countryCapitalProp,
                City = cityProp
            };
        }

        public async Task<WeatherMultiGridResponse> GetGridMultiAsync(string? startDate, string? endDate, CancellationToken ct = default)
        {
            DateOnly end = DateOnly.FromDateTime(DateTime.UtcNow);
            DateOnly start = end.AddDays(-13);
            if (DateOnly.TryParse(startDate, out var s)) start = s;
            if (DateOnly.TryParse(endDate, out var e)) end = e;
            if (start > end) { var tmp = start; start = end; end = tmp; }

            var locations = new List<(string Name, string Header, double Lat, double Lon)>
            {
                ("Centurion", "South Africa, Gauteng, Centurion", -25.86, 28.19),
                ("Johannesburg", "South Africa, Gauteng, Johannesburg", -26.20, 28.05),
                ("Pretoria", "South Africa, Gauteng, Pretoria", -25.75, 28.19),
            };

            var resp = new WeatherMultiGridResponse();
            foreach (var loc in locations)
            {
                var apiResp = await _provider.FetchHourlyAsync(loc.Lat, loc.Lon, start, end, ct);
                var rows = new List<Dictionary<string, object?>>();
                if (apiResp?.hourly?.time != null)
                {
                    var times = apiResp.hourly.time;
                    var temps = apiResp.hourly.temperature_2m ?? new List<double?>();
                    var codes = apiResp.hourly.weather_code ?? new List<int?>();
                    var rain = apiResp.hourly.rain ?? new List<double?>();
                    var windDir = apiResp.hourly.wind_direction_10m ?? new List<double?>();

                    int count = times.Count;
                    count = new[] { count, temps.Count, codes.Count, rain.Count, windDir.Count }.Where(c => c > 0).DefaultIfEmpty(count).Min();

                    for (int i = 0; i < count; i++)
                    {
                        rows.Add(new Dictionary<string, object?>
                        {
                            ["time"] = times[i],
                            ["temperature_2m"] = i < temps.Count ? temps[i] : null,
                            ["weather_code"] = i < codes.Count ? codes[i] : null,
                            ["rain"] = i < rain.Count ? rain[i] : null,
                            ["wind_direction_10m"] = i < windDir.Count ? windDir[i] : null,
                        });
                    }
                }

                var days = AggregateDayStats(rows);
                resp.Locations.Add(new LocationWeather
                {
                    Name = loc.Name,
                    Header = loc.Header,
                    Rows = rows,
                    Days = days,
                });
            }

            return resp;
        }

        private static List<WeatherDayStats> AggregateDayStats(List<Dictionary<string, object?>> rows)
        {
            var dayStats = new List<WeatherDayStats>();
            var groups = rows.GroupBy(r =>
            {
                var t = r.TryGetValue("time", out var tv) ? tv as string : null;
                if (string.IsNullOrWhiteSpace(t)) return "Unknown";
                var idx = t!.IndexOf('T');
                return idx > 0 ? t.Substring(0, idx) : t;
            });

            foreach (var g in groups)
            {
                var tempsDay = g.Select(r => r.TryGetValue("temperature_2m", out var v) ? v as double? : null).Where(v => v.HasValue).Select(v => v!.Value).ToList();
                var rainsDay = g.Select(r => r.TryGetValue("rain", out var v) ? v as double? : null).Where(v => v.HasValue).Select(v => v!.Value).ToList();
                var stats = new WeatherDayStats
                {
                    DateText = g.Key,
                    TempMin = tempsDay.Count > 0 ? tempsDay.Min() : (double?)null,
                    TempMax = tempsDay.Count > 0 ? tempsDay.Max() : (double?)null,
                    RainAvg = rainsDay.Count > 0 ? rainsDay.Average() : (double?)null,
                    Count = g.Count()
                };
                dayStats.Add(stats);
            }

            return dayStats;
        }
    }
}
