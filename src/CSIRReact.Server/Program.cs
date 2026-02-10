var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHostedService<CSIRReact.Server.Services.MqttPublisherService>();

// CORS for local Next.js dev (http/https on port 3000)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowDev", policy =>
        policy.WithOrigins(
                // Next.js dev
                "http://localhost:3000",
                "https://localhost:3000",
                // Vite dev default
                "http://localhost:5173",
                "https://localhost:5173",
                // Alternate local hosts sometimes used
                "http://127.0.0.1:5173",
                "https://127.0.0.1:5173",
                // Existing local ports
                "https://localhost:41130",
                "http://localhost:41130"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

// JWT Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    var jwt = builder.Configuration.GetSection("Jwt");
    var issuer = jwt["Issuer"];
    var audience = jwt["Audience"];
    var key = jwt["Key"] ?? string.Empty;
    options.RequireHttpsMetadata = true;
    options.SaveToken = true;
    options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidateLifetime = true,
        ValidIssuer = issuer,
        ValidAudience = audience,
        IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(key))
    };
});

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowDev");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();
