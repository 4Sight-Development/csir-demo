namespace CSIRReact.Logic.Interfaces
{
    public interface IAuthService
    {
        Task<LoginResult?> LoginAsync(string email, string password, CancellationToken ct = default);
    }

    public class LoginResult
    {
        public string AccessToken { get; set; } = string.Empty;
        public int ExpiresInSeconds { get; set; }
        public string RefreshToken { get; set; } = string.Empty;
    }
}
