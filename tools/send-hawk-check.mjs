/* global AbortSignal, fetch */
import process from 'node:process';
import { URL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { log, error } from 'node:console';

const dsn = process.env['HAWK_DSN'] ?? '';
const application = process.env['HAWK_APPLICATION'] ?? 'ZoomWeather';
const version = process.env['APP_VERSION'] ?? 'development';
try {
  const address = new URL(dsn);
  if (
    address.protocol !== 'https:' ||
    !/^[A-Za-z0-9]{1,128}$/.test(address.username) ||
    address.password ||
    address.search ||
    address.hash ||
    !/\/\d+$/.test(address.pathname)
  )
    throw new Error('Invalid configuration');
  const path = address.pathname.split('/');
  const project = path.pop();
  const endpoint = new URL(`${address.origin}${path.join('/')}/api/${project}/envelope/`);
  endpoint.searchParams.set('sentry_key', address.username);
  endpoint.searchParams.set('sentry_version', '7');
  const id = randomUUID().replaceAll('-', '');
  const event = {
    event_id: id,
    timestamp: Date.now() / 1000,
    platform: 'javascript',
    level: 'info',
    message: `${application} release diagnostics verification`,
    release: `${application.toLowerCase()}@${version}`,
    tags: { application, platform: 'GitHub Actions', diagnostic_check: 'true' },
    fingerprint: [application, 'diagnostics verification'],
  };
  const envelope = `${JSON.stringify({ event_id: id, sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: 'event', content_type: 'application/json' })}\n${JSON.stringify(event)}\n`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-sentry-envelope' },
    body: envelope,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Collector rejected verification');
  log(`Hawk accepted the ${application} release verification event`);
} catch {
  error('Hawk verification failed. Check the Sentry compatible DSN and collector availability.');
  process.exitCode = 1;
}
