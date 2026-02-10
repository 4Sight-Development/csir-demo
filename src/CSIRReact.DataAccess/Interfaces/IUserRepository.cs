namespace CSIRReact.DataAccess.Interfaces
{
    public interface IUserRepository
    {
        Task<Guid?> ValidateAndGetPersonIdAsync(string email, string password, CancellationToken ct = default);
    }
}
