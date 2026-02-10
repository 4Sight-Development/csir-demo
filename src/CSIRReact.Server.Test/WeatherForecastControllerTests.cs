using NUnit.Framework;
using Moq;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Mvc;
using CSIRReact.Server.Controllers;
using System.Threading.Tasks;
using CSIRReact.Logic.Interfaces;
using CSIRReact.Logic.Models;

namespace CSIRReact.Server.Test
{
    public class WeatherForecastControllerTests
    {
        [Test]
        public async Task GetGrid_ReturnsOkResult()
        {
            // Arrange
            var loggerMock = new Mock<ILogger<WeatherForecastController>>();
            var weatherMock = new Mock<IWeatherService>();
            weatherMock.Setup(w => w.GetGridAsync(null, null, null, true, null, null, default))
                .ReturnsAsync(new WeatherGridResponse { LocationHeader = "Default Location" });
            var controller = new WeatherForecastController(loggerMock.Object, weatherMock.Object);

            // Act
            var result = await controller.GetGrid(null, null, null, true, null, null);

            // Assert
            var okResult = result.Result as OkObjectResult;
            Assert.IsNotNull(okResult);
            Assert.IsInstanceOf<WeatherGridResponse>(okResult.Value);
        }

        [Test]
        public async Task GetGridMulti_ReturnsOkResult()
        {
            // Arrange
            var loggerMock = new Mock<ILogger<WeatherForecastController>>();
            var weatherMock = new Mock<IWeatherService>();
            weatherMock.Setup(w => w.GetGridMultiAsync(null, null, default))
                .ReturnsAsync(new WeatherMultiGridResponse());
            var controller = new WeatherForecastController(loggerMock.Object, weatherMock.Object);

            // Act
            var result = await controller.GetGridMulti(null, null);

            // Assert
            var okResult = result.Result as OkObjectResult;
            Assert.IsNotNull(okResult);
            Assert.IsInstanceOf<WeatherMultiGridResponse>(okResult.Value);
        }
    }
}