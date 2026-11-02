// Authenticated, role-scoped Server-Sent Events. Payloads are deliberately not sent:
// clients receive an invalidation signal and reload data through authenticated APIs.
const clients = new Set();

function canReceive(client, eventType, payload = {}) {
  if (client.role === 'admin') return true;
  const booking = payload.booking || {};
  const job = payload.job || {};
  const userId = client.userId;
  if (eventType.startsWith('booking:')) {
    return userId === (payload.customerId || booking.customerId) ||
      userId === (payload.providerId || booking.providerId);
  }
  if (eventType.startsWith('driver:')) {
    return client.role === 'driver' && (userId === payload.driverId || userId === payload.userId || userId === job.driverId) ||
      userId === payload.customerId || userId === job.customerId;
  }
  if (eventType.startsWith('grocery:')) {
    const order = payload.order || {};
    return userId === payload.customerId || userId === payload.providerId ||
      userId === order.customerId || userId === order.providerId;
  }
  if (eventType === 'review:submitted') return userId === payload.providerId;
  return false;
}

export function subscribeToEvents(req, res, identity) {
  if (!identity?.id || !identity?.role) {
    res.status(401).end();
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  const client = {
    id: `client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: identity.id,
    role: identity.role,
    res
  };
  clients.add(client);
  res.write(`event: connected\ndata: {"status":"connected"}\n\n`);
  const heartbeat = setInterval(() => {
    try { res.write(': keepalive\n\n'); }
    catch { clearInterval(heartbeat); clients.delete(client); }
  }, 25000);
  req.on('close', () => { clearInterval(heartbeat); clients.delete(client); });
}

export function broadcastEvent(eventType, payload = {}) {
  const message = `event: ${eventType}\ndata: {"event":"${eventType}"}\n\n`;
  for (const client of clients) {
    if (!canReceive(client, eventType, payload)) continue;
    try { client.res.write(message); }
    catch { clients.delete(client); }
  }
}

export function getConnectedClientCount() { return clients.size; }
