// Test-only TLS transport. Both endpoints are fixed to IPv4 loopback.
import { readFileSync } from "node:fs";
import { request } from "node:http";
import { createServer } from "node:https";

function options(args) {
  const values = new Map();
  const allowed = new Set(["--listen-port", "--upstream-port", "--cert", "--key"]);
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    if (!allowed.has(name) || values.has(name) || !args[index + 1]) throw new Error();
    values.set(name, args[index + 1]);
  }
  const port = (name) => {
    const value = values.get(name);
    if (!/^[1-9]\d{0,4}$/.test(value ?? "") || Number(value) > 65535) throw new Error();
    return Number(value);
  };
  const listen = port("--listen-port");
  const upstream = port("--upstream-port");
  if (listen === upstream || !values.get("--cert") || !values.get("--key")) throw new Error();
  return {
    listen,
    upstream,
    cert: readFileSync(values.get("--cert")),
    key: readFileSync(values.get("--key")),
  };
}

function start(config) {
  const sockets = new Set();
  const requests = new Set();
  let closing = false;
  const track = (socket) => {
    if (sockets.has(socket)) return;
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  };
  const accepted = (incoming) => {
    const host = incoming.headers.host;
    const path = incoming.url ?? "/";
    return (
      (host === `127.0.0.1:${config.listen}` || host === `localhost:${config.listen}`) &&
      path.startsWith("/") &&
      !path.startsWith("//") &&
      !/[\\\r\n]/.test(path)
    );
  };
  const upstreamRequest = (incoming) => {
    const outgoing = request({
      hostname: "127.0.0.1",
      port: config.upstream,
      method: incoming.method,
      path: incoming.url,
      headers: {
        ...incoming.headers,
        host: `127.0.0.1:${config.upstream}`,
        "x-forwarded-host": incoming.headers.host,
        "x-forwarded-proto": "https",
      },
    });
    requests.add(outgoing);
    outgoing.once("close", () => requests.delete(outgoing));
    outgoing.on("socket", track);
    outgoing.setTimeout(30_000, () => outgoing.destroy());
    return outgoing;
  };
  const server = createServer({ cert: config.cert, key: config.key }, (incoming, response) => {
    if (!accepted(incoming)) {
      response.writeHead(400);
      response.end();
      return;
    }
    const outgoing = upstreamRequest(incoming);
    outgoing.on("response", (upstream) => {
      response.writeHead(upstream.statusCode ?? 502, upstream.headers);
      upstream.on("error", () => response.destroy());
      upstream.pipe(response);
    });
    outgoing.on("error", () => {
      if (!response.headersSent) response.writeHead(502);
      response.end();
    });
    incoming.on("aborted", () => outgoing.destroy());
    incoming.on("error", () => outgoing.destroy());
    response.on("close", () => {
      if (!response.writableEnded) outgoing.destroy();
    });
    incoming.pipe(outgoing);
  });
  server.on("connection", track);
  server.on("tlsClientError", (_error, socket) => socket.destroy());
  server.on("upgrade", (incoming, socket, head) => {
    if (!accepted(incoming)) {
      socket.destroy();
      return;
    }
    const outgoing = upstreamRequest(incoming);
    outgoing.on("upgrade", (upstream, target, targetHead) => {
      track(target);
      target.setTimeout(0);
      const headers = [];
      for (let index = 0; index < upstream.rawHeaders.length; index += 2)
        headers.push(`${upstream.rawHeaders[index]}: ${upstream.rawHeaders[index + 1]}`);
      socket.write(`HTTP/1.1 101 Switching Protocols\r\n${headers.join("\r\n")}\r\n\r\n`);
      if (head.length) target.write(head);
      if (targetHead.length) socket.write(targetHead);
      socket.on("error", () => target.destroy());
      target.on("error", () => socket.destroy());
      socket.on("close", () => target.destroy());
      target.on("close", () => socket.destroy());
      socket.pipe(target).pipe(socket);
    });
    outgoing.on("response", (upstream) => {
      upstream.resume();
      socket.end("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
    });
    outgoing.on("error", () => socket.destroy());
    socket.on("close", () => outgoing.destroy());
    outgoing.end();
  });
  const stop = () => {
    if (closing) return;
    closing = true;
    server.close();
    for (const outgoing of requests) outgoing.destroy();
    for (const socket of sockets) socket.destroy();
  };
  server.on("error", () => {
    process.stderr.write("Local HTTPS proxy could not start.\n");
    process.exitCode = 1;
    stop();
  });
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  server.listen(config.listen, "127.0.0.1", () => {
    process.stdout.write(
      `Local HTTPS proxy: https://127.0.0.1:${config.listen} -> loopback:${config.upstream}\n`,
    );
  });
}

try {
  start(options(process.argv.slice(2)));
} catch {
  process.stderr.write("Invalid local HTTPS proxy configuration.\n");
  process.exitCode = 2;
}
