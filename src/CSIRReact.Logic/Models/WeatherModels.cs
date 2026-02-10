namespace CSIRReact.Logic.Models
{
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
}
