namespace CSIRReact.DataAccess.Models
{
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
}
