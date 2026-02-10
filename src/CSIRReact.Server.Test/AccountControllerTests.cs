using NUnit.Framework;
using Moq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using CSIRReact.Server.Controllers;
using System.Threading.Tasks;

namespace CSIRReact.Server.Test
{
    public class AccountControllerTests
    {
        [Test]
        public async Task Login_ReturnsOk_ForValidDemoCredentials()
        {
            // Arrange
            var controller = new AccountController();
            var context = new DefaultHttpContext();
            var configMock = new Mock<IConfiguration>();
            configMock.Setup(c => c.GetSection("Jwt")["AccessTokenMinutes"]).Returns("30");
            configMock.Setup(c => c.GetSection("Jwt")["Issuer"]).Returns("issuer");
            configMock.Setup(c => c.GetSection("Jwt")["Audience"]).Returns("audience");
            configMock.Setup(c => c.GetSection("Jwt")["Key"]).Returns("testkeytestkeytestkeytestkey12345678");
            context.RequestServices = new ServiceProviderStub(configMock.Object);
            controller.ControllerContext = new ControllerContext { HttpContext = context };

            var model = new AccountController.LoginModel
            {
                Email = "demo.csir@demomail.com",
                Password = "D3mo@Pass123!"
            };

            // Act
            var result = await controller.Login(model);

            // Assert
            Assert.IsInstanceOf<OkObjectResult>(result);
        }

        [Test]
        public async Task Login_ReturnsUnauthorized_ForInvalidCredentials()
        {
            // Arrange
            var controller = new AccountController();
            var context = new DefaultHttpContext();
            var configMock = new Mock<IConfiguration>();
            context.RequestServices = new ServiceProviderStub(configMock.Object);
            controller.ControllerContext = new ControllerContext { HttpContext = context };

            var model = new AccountController.LoginModel
            {
                Email = "wrong@user.com",
                Password = "wrongpass"
            };

            // Act
            var result = await controller.Login(model);

            // Assert
            Assert.IsInstanceOf<UnauthorizedObjectResult>(result);
        }

        [Test]
        public async Task Login_ReturnsBadRequest_ForInvalidModel()
        {
            // Arrange
            var controller = new AccountController();
            controller.ModelState.AddModelError("Email", "Required");
            var model = new AccountController.LoginModel();

            // Act
            var result = await controller.Login(model);

            // Assert
            Assert.IsInstanceOf<BadRequestObjectResult>(result);
        }
    }

    // Helper for IServiceProvider
    public class ServiceProviderStub : IServiceProvider
    {
        private readonly IConfiguration _config;
        public ServiceProviderStub(IConfiguration config) => _config = config;
        public object? GetService(Type serviceType)
        {
            if (serviceType == typeof(IConfiguration)) return _config;
            return null;
        }
    }
}