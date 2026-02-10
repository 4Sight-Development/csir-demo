using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CSIRReact.DataAccess.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using CSIRReact.Logic.Interfaces;

namespace CSIRReact.Logic.Implementations
{
    public class AuthService : IAuthService
    {
        private readonly IConfiguration _config;
        private readonly IUserRepository _users;

        public AuthService(IConfiguration config, IUserRepository users)
        {
            _config = config;
            _users = users;
        }

        public async Task<LoginResult?> LoginAsync(string email, string password, CancellationToken ct = default)
        {
            var personId = await _users.ValidateAndGetPersonIdAsync(email, password, ct);
            if (personId == null) return null;

            var configMinutes = _config.GetSection("Jwt")["AccessTokenMinutes"];
            var expiresInMinutes = int.TryParse(configMinutes, out var mins) ? mins : 30;

            var issuer = _config.GetSection("Jwt")["Issuer"];
            var audience = _config.GetSection("Jwt")["Audience"];
            var key = _config.GetSection("Jwt")["Key"] ?? string.Empty;
            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(ClaimTypes.Name, email),
                new Claim("pid", personId.Value.ToString())
            };

            var now = DateTime.UtcNow;
            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                notBefore: now,
                expires: now.AddMinutes(expiresInMinutes),
                signingCredentials: creds);

            var accessToken = new JwtSecurityTokenHandler().WriteToken(token);
            var refreshToken = $"{Guid.NewGuid()}{Guid.NewGuid()}{Guid.NewGuid()}{Guid.NewGuid()}{Guid.NewGuid()}{Guid.NewGuid()}";

            return new LoginResult
            {
                AccessToken = accessToken,
                ExpiresInSeconds = expiresInMinutes * 180,
                RefreshToken = refreshToken
            };
        }
    }
}
