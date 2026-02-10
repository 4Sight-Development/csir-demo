using System;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MQTTnet;
using MQTTnet.Client;
// Note: MQTTnet v4 no longer uses the .Client.Options namespace; options
// are built via MQTTnet.Client.MqttClientOptionsBuilder.

namespace CSIRReact.Server.Services
{
    public class MqttPublisherService : BackgroundService
    {
        private readonly ILogger<MqttPublisherService> _logger;

        // Static configuration for simplicity; can be moved to appsettings later
        private const string BrokerHost = "broker.hivemq.com";
        private const int BrokerPort = 1883; // MQTT TCP
        private const string Topic = "csirreact/feed/live"; // single static topic used by the app

        private IMqttClient? _client;

        public MqttPublisherService(ILogger<MqttPublisherService> logger)
        {
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var factory = new MqttFactory();
            _client = factory.CreateMqttClient();

            var options = new MqttClientOptionsBuilder()
                .WithTcpServer(BrokerHost, BrokerPort)
                .WithCleanSession()
                .Build();

            var rnd = new Random();

            while (!stoppingToken.IsCancellationRequested)
            {
                // Ensure connection
                if (_client is not null && !_client.IsConnected)
                {
                    try
                    {
                        await _client.ConnectAsync(options, stoppingToken);
                        _logger.LogInformation("Connected to MQTT broker {Host}:{Port}", BrokerHost, BrokerPort);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to connect to MQTT broker");
                        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                        continue; // retry connect
                    }
                }

                // Publish a random value 0-100 as a simple numeric string
                var value = rnd.Next(0, 100).ToString();
                var msg = new MqttApplicationMessageBuilder()
                    .WithTopic(Topic)
                    .WithPayload(Encoding.UTF8.GetBytes(value))
                    .WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.AtMostOnce)
                    .Build();

                try
                {
                    if (_client is not null)
                    {
                        await _client.PublishAsync(msg, stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to publish MQTT message");
                }

                await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
            }
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            try
            {
                if (_client != null)
                {
                    // Use parameterless disconnect for MQTTnet v4 to avoid enum mismatch issues
                    await _client.DisconnectAsync();
                    _client.Dispose();
                }
            }
            catch { }
            finally
            {
                await base.StopAsync(cancellationToken);
            }
        }
    }
}