namespace CSIRReact.DataAccess.Models
{
    public class IpWhoIsResponse
    {
        public bool success { get; set; }
        public string? country { get; set; }
        public string? city { get; set; }
        public double? latitude { get; set; }
        public double? longitude { get; set; }
    }
}
