using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using System.Reflection;

using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace CSIRReact.Server.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class AccountController : ControllerBase
    {
        public class LoginModel
        {
            [Required]
            [EmailAddress]
            public string Email { get; set; } = string.Empty;

            [Required]
            [DataType(DataType.Password)]
            public string Password { get; set; } = string.Empty;
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            Guid? personId = null;
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var configMinutes = HttpContext.RequestServices.GetService<IConfiguration>()?
                    .GetSection("Jwt")?["AccessTokenMinutes"];

                var expiresInMinutes = int.TryParse(configMinutes, out var mins) ? mins : 30;

                // Fixed demo credentials
                var email = model.Email.Trim().ToLower();
                var password = model.Password.Trim();
                if (email == "demo.csir@demomail.com" && password == "D3mo@Pass123!")
                {
                    personId = Guid.NewGuid();

                    var config = HttpContext.RequestServices.GetService<IConfiguration>()!;
                    var issuer = config.GetSection("Jwt")["Issuer"];
                    var audience = config.GetSection("Jwt")["Audience"];
                    var key = config.GetSection("Jwt")["Key"] ?? string.Empty;
                    var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
                    var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

                    var claims = new List<Claim>
                    {
                        new Claim(JwtRegisteredClaimNames.Sub, email),
                        new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                        new Claim(ClaimTypes.Name, email),
                        new Claim("pid", personId?.ToString() ?? string.Empty)
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

                    return Ok(new { accessToken, expiresIn = expiresInMinutes * 180, refreshToken });
                }
                else
                {
                    return Unauthorized(new { Message = "Invalid login attempt." });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = ex.Message });
            }
        }
    }
}
