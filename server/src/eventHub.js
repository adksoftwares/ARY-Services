// Real-time Event Hub using native Server-Sent Events (SSE)
// Supports multi-client real-time synchronization with zero external dependencies.

const clients = new Set();

export function subscribeToEvents(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const client = {
    id: `client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: req.query.userId || null,
    role: req.query.role || null,
    res
  };

  clients.add(client);

  // Send initial handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clientId: client.id, timestamp: Date.now() })}\n\n`);

  // 25-second keepalive heartbeat to prevent cloud load-balancer timeouts
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeat);
      clients.delete(client);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(client);
  });
}

export function broadcastEvent(eventType, payload) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(message);
    } catch {
      clients.delete(client);
    }
  }
}

export function getConnectedClientCount() {
  return clients.size;
}
