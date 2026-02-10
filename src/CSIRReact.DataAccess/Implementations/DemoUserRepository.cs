using CSIRReact.DataAccess.Interfaces;

namespace CSIRReact.DataAccess.Implementations
{
    public class DemoUserRepository : IUserRepository
    {
        public Task<Guid?> ValidateAndGetPersonIdAsync(string email, string password, CancellationToken ct = default)
        {
            var valid = email.Trim().ToLower() == "demo.csir@demomail.com" && password.Trim() == "D3mo@Pass123!";
            return Task.FromResult(valid ? Guid.NewGuid() : (Guid?)null);
        }
    }
}
