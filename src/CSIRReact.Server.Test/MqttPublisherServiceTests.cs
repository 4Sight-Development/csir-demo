using NUnit.Framework;
using Moq;
using Microsoft.Extensions.Logging;
using CSIRReact.Server.Services;
using System.Threading;
using System.Threading.Tasks;

namespace CSIRReact.Server.Test
{
    public class MqttPublisherServiceTests
    {
        [Test]
        public async Task StopAsync_DisconnectsClient_WithoutException()
        {
            // Arrange
            var loggerMock = new Mock<ILogger<MqttPublisherService>>();
            var service = new MqttPublisherService(loggerMock.Object);

            // Act & Assert
            Assert.DoesNotThrowAsync(async () => await service.StopAsync(CancellationToken.None));
        }
    }
}