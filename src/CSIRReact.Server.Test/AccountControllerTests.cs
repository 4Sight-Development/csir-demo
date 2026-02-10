using NUnit.Framework;
using Moq;
using Microsoft.AspNetCore.Mvc;
using CSIRReact.Server.Controllers;
using CSIRReact.Logic.Interfaces;
using System.Threading.Tasks;

namespace CSIRReact.Server.Test
{
    public class AccountControllerTests
    {
        [Test]
        public async Task Login_ReturnsOk_ForValidDemoCredentials()
        {
            // Arrange
            var authMock = new Mock<IAuthService>();
            authMock.Setup(a => a.LoginAsync("demo.csir@demomail.com", "D3mo@Pass123!", default))
                .ReturnsAsync(new LoginResult { AccessToken = "token", ExpiresInSeconds = 180 * 30, RefreshToken = "refresh" });
            var controller = new AccountController(authMock.Object);

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
            var authMock = new Mock<IAuthService>();
            authMock.Setup(a => a.LoginAsync(It.IsAny<string>(), It.IsAny<string>(), default))
                .ReturnsAsync((LoginResult?)null);
            var controller = new AccountController(authMock.Object);

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
            var authMock = new Mock<IAuthService>();
            var controller = new AccountController(authMock.Object);
            controller.ModelState.AddModelError("Email", "Required");
            var model = new AccountController.LoginModel();

            // Act
            var result = await controller.Login(model);

            // Assert
            Assert.IsInstanceOf<BadRequestObjectResult>(result);
        }
    }

    // ServiceProviderStub no longer needed after refactor
}