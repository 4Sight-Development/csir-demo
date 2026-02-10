namespace CSIRReact.DataAccess.Models
{
    public class IpApiDotComResponse
    {
        public string? status { get; set; }
        public string? country { get; set; }
        public string? city { get; set; }
        public double? lat { get; set; }
        public double? lon { get; set; }
    }
}
