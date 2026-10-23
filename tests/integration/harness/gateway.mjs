// Minimal Supabase-shaped HTTP gateway for the integration tier.
//
//   /rest/v1/*      → PostgREST (transparent proxy, headers passed through)
//   /auth/v1/user   → real HS256 verification of the Bearer token against the
//                     per-run test secret, answered in GoTrue's user shape.
//                     auth-js `getClaims` falls back to `getUser()` for HS*
//                     tokens, which is why this route must exist.
//   /health         → readiness for stack.sh
//
// No GoTrue, no sign-in, no refresh: tokens are minted by the tests and the
// stack script. A forged or expired signature is rejected with 401.
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";

const secretFile = process.env.JWT_SECRET_FILE;
if (!secretFile) {
  console.error("gateway: JWT_SECRET_FILE is required");
  process.exit(2);
}
const SECRET = fs.readFileSync(secretFile, "utf8").trim();
const PGRST = process.env.PGRST_URL || "http://127.0.0.1:54331";
const PORT = Number(process.env.GATEWAY_PORT || 54330);

function verify(token) {
  const [h, p, s] = String(token).split(".");
  if (!h || !p || !s) return null;
  let header;
  try {
    header = JSON.parse(Buffer.from(h, "base64url").toString());
  } catch {
    return null;
  }
  if (header.alg !== "HS256") return null;
  const sig = crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(s);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let claims;
  try {
    claims = JSON.parse(Buffer.from(p, "base64url").toString());
  } catch {
    return null;
  }
  if (claims.exp && claims.exp * 1000 < Date.now()) return null;
  return claims;
}

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on("data", (d) => chunks.push(d));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });

const json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
  try {
    const url = req.url || "/";
    if (url === "/health") return json(res, 200, { ok: true });

    if (url.startsWith("/auth/v1/user")) {
      const token = (req.headers.authorization || "").replace(/^Bearer /, "");
      const claims = verify(token);
      if (!claims || !claims.sub) {
        return json(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
      }
      return json(res, 200, {
        id: claims.sub,
        aud: claims.aud ?? "authenticated",
        role: claims.role,
        email: claims.email ?? null,
        app_metadata: claims.app_metadata ?? {},
        user_metadata: claims.user_metadata ?? {},
        created_at: new Date(0).toISOString(),
      });
    }

    if (url.startsWith("/rest/v1")) {
      const body = await readBody(req);
      const headers = { ...req.headers };
      delete headers.host;
      delete headers["content-length"];
      delete headers.connection;
      const upstream = await fetch(PGRST + url.slice("/rest/v1".length), {
        method: req.method,
        headers,
        body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
      });
      const out = Buffer.from(await upstream.arrayBuffer());
      const rh = Object.fromEntries(upstream.headers);
      delete rh["content-encoding"];
      delete rh["content-length"];
      delete rh["transfer-encoding"];
      res.writeHead(upstream.status, rh);
      return res.end(out);
    }

    return json(res, 404, { error: "not_found", path: url });
  } catch (e) {
    return json(res, 502, { error: "gateway_error", message: String(e) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`gateway listening on 127.0.0.1:${PORT} → ${PGRST}`);
});
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
