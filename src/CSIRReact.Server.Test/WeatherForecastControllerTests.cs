using NUnit.Framework;
using Moq;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Mvc;
using CSIRReact.Server.Controllers;
using System.Threading.Tasks;

namespace CSIRReact.Server.Test
{
    public class WeatherForecastControllerTests
    {
        [Test]
        public async Task GetGrid_ReturnsOkResult()
        {
            // Arrange
            var loggerMock = new Mock<ILogger<WeatherForecastController>>();
            var controller = new WeatherForecastController(loggerMock.Object);

            // Act
            var result = await controller.GetGrid(null, null, null, true, null, null);

            // Assert
            var okResult = result.Result as OkObjectResult;
            Assert.IsNotNull(okResult);
            Assert.IsInstanceOf<WeatherForecastController.WeatherGridResponse>(okResult.Value);
        }

        [Test]
        public async Task GetGridMulti_ReturnsOkResult()
        {
            // Arrange
            var loggerMock = new Mock<ILogger<WeatherForecastController>>();
            var controller = new WeatherForecastController(loggerMock.Object);

            // Act
            var result = await controller.GetGridMulti(null, null);

            // Assert
            var okResult = result.Result as OkObjectResult;
            Assert.IsNotNull(okResult);
            Assert.IsInstanceOf<WeatherForecastController.WeatherMultiGridResponse>(okResult.Value);
        }
    }
}