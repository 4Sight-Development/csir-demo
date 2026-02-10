using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Net.Http;
using System.Net.Http.Json;

namespace CSIRReact.Server.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [Authorize]
    public class WeatherForecastController : ControllerBase
    {
        private static readonly HttpClient _http = new HttpClient();
        private static IpApiResponse? _cachedIpInfo;
        private static DateTime _cachedIpInfoAt;
        private static readonly TimeSpan IpInfoCacheTtl = TimeSpan.FromMinutes(15);
        private static readonly Dictionary<string, string> _locationHeaderCache = new();
        private static readonly string[] Summaries = new[]
        {
            "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
        };

        private readonly ILogger<WeatherForecastController> _logger;

        public WeatherForecastController(ILogger<WeatherForecastController> logger)
        {
            _logger = logger;
        }

        //[HttpGet(Name = "GetWeatherForecast")]
        //public IEnumerable<WeatherForecast> Get()
        //{
        //    return Enumerable.Range(1, 5).Select(index => new WeatherForecast
        //    {
        //        Date = DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
        //        TemperatureC = Random.Shared.Next(-20, 55),
        //        Summary = Summaries[Random.Shared.Next(Summaries.Length)]
        //    })
        //    .ToArray();
        //}

        // New endpoint to provide grid-friendly, dynamic data with IP-based location header
        [HttpGet("grid")]
        public async Task<ActionResult<WeatherGridResponse>> GetGrid(
            [FromQuery] double? lat,
            [FromQuery] double? lon,
            [FromQuery] string? header,
            [FromQuery(Name = "isDefaultLocation")] bool? isDefaultLocation,
            [FromQuery(Name = "start_date")] string? startDate,
            [FromQuery(Name = "end_date")] string? endDate)
        {
            // Reuse a static HttpClient for better performance

            // 1) Determine location from IP (cached) unless lat/lon provided
            IpApiResponse? ipInfo = null;
            if (!lat.HasValue || !lon.HasValue)
            {
                var now = DateTime.UtcNow;
                // Only fetch IP info when nearest location is requested (not default) and lat/lon not provided
                if (isDefaultLocation != true)
                {
                    ipInfo = await FetchIpInfo(_http);
                    if (ipInfo != null)
                    {
                        _cachedIpInfo = ipInfo;
                        _cachedIpInfoAt = now;
                    }
                }
            }

            // Default hardcoded coordinates
            const double defaultLat = -25.75;
            const double defaultLon = 28.25;

            double latitude = lat ?? (isDefaultLocation == true ? defaultLat : (ipInfo?.latitude ?? defaultLat));
            double longitude = lon ?? (isDefaultLocation == true ? defaultLon : (ipInfo?.longitude ?? defaultLon));

            // Structured header fields, prioritizing IP info then reverse geocode
            string? countryNameProp = ipInfo?.country_name;
            string? countryCapitalProp = ipInfo?.country_capital;
            string? cityProp = ipInfo?.city;
            // For default location, we know this is South Africa, Pretoria (static)
            if (isDefaultLocation == true)
            {
                countryNameProp = "South Africa";
                countryCapitalProp = "Pretoria";
                cityProp = "Pretoria";
            }

            // Compose a human-readable header and structured fields: prefer explicit header, else use fields (reverse geocode fills missing), else lat/lon
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
                    // Prefer a friendly header for default location; else fallback to lat/lon
                    if (isDefaultLocation == true)
                    {
                        locationHeader = "Default Location, South Africa, Pretoria";
                    }
                    else
                    {
                        locationHeader = $"Lat {latitude:F4}, Lon {longitude:F4}";
                    }
                    _locationHeaderCache[cacheKey] = locationHeader;
                    //try
                    //{
                    //    // Reverse geocoding via Open-Meteo
                    //    var geoUrl = $"https://geocoding-api.open-meteo.com/v1/reverse?latitude={latitude}&longitude={longitude}&count=1&language=en&format=json";
                    //    var geo = await _http.GetFromJsonAsync<ReverseGeocodeResponse>(geoUrl);
                    //    string? city = geo?.results?.FirstOrDefault()?.name;
                    //    string? country = geo?.results?.FirstOrDefault()?.country;
                    //    string? code = geo?.results?.FirstOrDefault()?.country_code;

                    //    string? capital = null;
                    //    if (!string.IsNullOrWhiteSpace(code))
                    //    {
                    //        try
                    //        {
                    //            var rc = await _http.GetFromJsonAsync<List<RestCountry>>("https://restcountries.com/v3.1/alpha/" + code);
                    //            capital = rc?.FirstOrDefault()?.capital?.FirstOrDefault();
                    //        }
                    //        catch { /* ignore restcountries errors */ }
                    //    }

                    //    // Fill structured fields prioritizing IP info, then reverse geocode/restcountries
                    //    countryNameProp = !string.IsNullOrWhiteSpace(countryNameProp) ? countryNameProp : country;
                    //    countryCapitalProp = !string.IsNullOrWhiteSpace(countryCapitalProp) ? countryCapitalProp : capital;
                    //    cityProp = !string.IsNullOrWhiteSpace(cityProp) ? cityProp : city;

                    //    var parts = new List<string>();
                    //    if (isDefaultLocation == true)
                    //    {
                    //        // Preface header to indicate default location
                    //        parts.Add("Default Location");
                    //    }
                    //    if (!string.IsNullOrWhiteSpace(countryNameProp)) parts.Add(countryNameProp!);
                    //    if (!string.IsNullOrWhiteSpace(countryCapitalProp)) parts.Add(countryCapitalProp!);
                    //    if (!string.IsNullOrWhiteSpace(cityProp)) parts.Add(cityProp!);

                    //    locationHeader = parts.Count > 0 ? string.Join(", ", parts) : $"Lat {latitude:F4}, Lon {longitude:F4}";
                    //    _locationHeaderCache[cacheKey] = locationHeader;
                    //}
                    //catch
                    //{
                    //    // Total fallback
                    //    locationHeader = $"Lat {latitude:F4}, Lon {longitude:F4}";
                    //}
                }
            }

            // 2) Fetch weather using determined lat/lon
            // Resolve date range: default to last 14 days ending today
            DateOnly end = DateOnly.FromDateTime(DateTime.UtcNow);
            DateOnly start = end.AddDays(-13);
            if (DateOnly.TryParse(startDate, out var s)) start = s;
            if (DateOnly.TryParse(endDate, out var e)) end = e;
            // ensure ordering
            if (start > end)
            {
                var tmp = start; start = end; end = tmp;
            }

            var url = $"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&hourly=temperature_2m,weather_code,rain,wind_direction_10m&timezone=auto&start_date={start:yyyy-MM-dd}&end_date={end:yyyy-MM-dd}";
            OpenMeteoResponse? apiResp = null;
            try
            {
                apiResp = await _http.GetFromJsonAsync<OpenMeteoResponse>(url);
            }
            catch
            {
                apiResp = null;
            }

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

            // Compute daily aggregates (min/max temp and average rain)
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

            return Ok(new WeatherGridResponse
            {
                LocationHeader = locationHeader,
                Rows = rows,
                Days = dayStats,
                CountryName = countryNameProp,
                CountryCapital = countryCapitalProp,
                City = cityProp
            });
        }

        // Fixed multi-location endpoint: Centurion, Johannesburg, Pretoria
        [HttpGet("grid-multi")]
        public async Task<ActionResult<WeatherMultiGridResponse>> GetGridMulti(
            [FromQuery(Name = "start_date")] string? startDate,
            [FromQuery(Name = "end_date")] string? endDate)
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
                var (rows, days) = await FetchWeatherRowsAndStats(loc.Lat, loc.Lon, start, end);
                resp.Locations.Add(new LocationWeather
                {
                    Name = loc.Name,
                    Header = loc.Header,
                    Rows = rows,
                    Days = days,
                });
            }

            return Ok(resp);
        }

        private async Task<(List<Dictionary<string, object?>>, List<WeatherDayStats>)> FetchWeatherRowsAndStats(double latitude, double longitude, DateOnly start, DateOnly end)
        {
            var url = $"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&hourly=temperature_2m,weather_code,rain,wind_direction_10m&timezone=auto&start_date={start:yyyy-MM-dd}&end_date={end:yyyy-MM-dd}";
            OpenMeteoResponse? apiResp = null;
            try { apiResp = await _http.GetFromJsonAsync<OpenMeteoResponse>(url); } catch { apiResp = null; }

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

            return (rows, dayStats);
        }

        private static async Task<IpApiResponse?> FetchIpInfo(HttpClient http)
        {
            //try
            //{
            //    var req = new HttpRequestMessage(HttpMethod.Get, "https://ipapi.co/json");
            //    // Some providers require a UA to avoid 429 from anti-bot protections
            //    req.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            //    req.Headers.Accept.ParseAdd("application/json");
            //    HttpResponseMessage? resp = null;
            //    if (resp == null)
            //    {
            //        resp = await http.SendAsync(req);
            //    }
                
            //    if (resp.IsSuccessStatusCode)
            //    {
            //        var fromIpApi = await resp.Content.ReadFromJsonAsync<IpApiResponse>();
            //        if (fromIpApi != null) return fromIpApi;
            //    }
            //}
            //catch { /* ignore ipapi errors */ }

            // Fallback: ipwho.is (free, simple JSON). Returns caller IP info with lat/lon.
            //try
            //{
            //    var who = await http.GetFromJsonAsync<IpWhoIsResponse>("https://ipwho.is/");
            //    if (who?.success == true)
            //    {
            //        return new IpApiResponse
            //        {
            //            country_name = who.country,
            //            city = who.city,
            //            latitude = who.latitude,
            //            longitude = who.longitude,
            //            // country_capital may be filled later via restcountries; leave null here
            //        };
            //    }
            //}
            //catch { /* ignore fallback errors */ }

            // Second fallback: ip-api.com (HTTP, free). Returns status and lat/lon.
            try
            {
                var api = await http.GetFromJsonAsync<IpApiDotComResponse>("http://ip-api.com/json/");
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
            catch { /* ignore fallback errors */ }

            return null;
        }

        public class OpenMeteoResponse
        {
            public OpenMeteoHourly? hourly { get; set; }
        }

        public class OpenMeteoHourly
        {
            public List<string>? time { get; set; }
            public List<double?>? temperature_2m { get; set; }
            public List<int?>? weather_code { get; set; }
            public List<double?>? rain { get; set; }
            public List<double?>? wind_direction_10m { get; set; }
        }
        public class IpApiResponse
        {
            public string? country_name { get; set; }
            public string? country_capital { get; set; }
            public string? city { get; set; }
            public double? latitude { get; set; }
            public double? longitude { get; set; }
        }

        public class IpWhoIsResponse
        {
            public bool success { get; set; }
            public string? country { get; set; }
            public string? city { get; set; }
            public double? latitude { get; set; }
            public double? longitude { get; set; }
        }

        public class IpApiDotComResponse
        {
            public string? status { get; set; }
            public string? country { get; set; }
            public string? city { get; set; }
            public double? lat { get; set; }
            public double? lon { get; set; }
        }

        public class WeatherDayStats
        {
            public string? DateText { get; set; }
            public double? TempMin { get; set; }
            public double? TempMax { get; set; }
            public double? RainAvg { get; set; }
            public int Count { get; set; }
        }

        public class WeatherGridResponse
        {
            public string? LocationHeader { get; set; }
            public List<Dictionary<string, object?>> Rows { get; set; } = new();
            public List<WeatherDayStats> Days { get; set; } = new();
            public string? CountryName { get; set; }
            public string? CountryCapital { get; set; }
            public string? City { get; set; }
        }

        public class WeatherMultiGridResponse
        {
            public List<LocationWeather> Locations { get; set; } = new();
        }

        public class LocationWeather
        {
            public string Name { get; set; } = string.Empty;
            public string? Header { get; set; }
            public List<Dictionary<string, object?>> Rows { get; set; } = new();
            public List<WeatherDayStats> Days { get; set; } = new();
        }

        public class ReverseGeocodeResponse
        {
            public List<ReverseGeocodePlace>? results { get; set; }
        }

        public class ReverseGeocodePlace
        {
            public string? name { get; set; }
            public string? country { get; set; }
            public string? country_code { get; set; }
        }

        public class RestCountry
        {
            public List<string>? capital { get; set; }
        }
    }
}
