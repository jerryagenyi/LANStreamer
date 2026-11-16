import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';

/**
 * Sends only the lifecycle records deliberately emitted by this service to
 * PostHog Logs. It intentionally does not attach to the application's Winston
 * loggers, which continue writing only to their existing destinations.
 */
class PostHogLogService {
  constructor() {
    this.provider = null;
    this.logger = null;
    this.started = false;
  }

  init() {
    if (this.started || process.env.NODE_ENV === 'test') return;

    const key = process.env.POSTHOG_KEY;
    const host = process.env.POSTHOG_HOST;
    if (!key || !host) {
      if (process.env.NODE_ENV !== 'production') {
        const variable = !key ? 'POSTHOG_KEY' : 'POSTHOG_HOST';
        console.warn(`${variable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variable} is configured`);
      }
      return;
    }

    try {
      const exporter = new OTLPLogExporter({
        url: new URL('/i/v1/logs', host).toString(),
        headers: { Authorization: `Bearer ${key}` },
      });
      this.provider = new LoggerProvider({
        resource: resourceFromAttributes({ 'service.name': 'lanstreamer-server' }),
        processors: [new BatchLogRecordProcessor(exporter)],
      });
      // Use this provider directly: the global logs API can remain a no-op when
      // OpenTelemetry package versions do not share the same global provider.
      this.logger = this.provider.getLogger('lanstreamer-posthog-exporter');
      this.started = true;
      this.emit('info', 'PostHog lifecycle log export initialized');
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`PostHog log export initialization failed: ${error.message}`);
      }
    }
  }

  emit(severityText, body, attributes = {}) {
    if (!this.logger) return;
    try {
      this.logger.emit({ severityText, body, attributes });
    } catch {
      // Logging must never affect the server lifecycle.
    }
  }

  async shutdown() {
    if (!this.provider) return;
    this.emit('info', 'LANStreamer server lifecycle is stopping');
    const provider = this.provider;
    this.provider = null;
    this.logger = null;
    this.started = false;

    try {
      await Promise.race([
        provider.shutdown(),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      // Shutdown delivery is best-effort and must not delay application exit.
    }
  }
}

export default new PostHogLogService();
