// Mint an HS256 JWT with the per-run test secret (stack.sh helper).
//
//   node mint-jwt.mjs --secret-file <path> --role anon
//   node mint-jwt.mjs --secret-file <path> --role service_role
//   node mint-jwt.mjs --secret-file <path> --role authenticated --sub <uuid> [--org <uuid>] [--email x]
//
// Prints the token on stdout and nothing else. node:crypto only — the TS
// helper used by the tests (jwt.ts) also signs with node:crypto; the gateway and
// PostgREST verify each token independently.
import crypto from "node:crypto";
import fs from "node:fs";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
}
const secretFile = args.get("secret-file");
const role = args.get("role");
if (!secretFile || !role) {
  console.error(
    "usage: mint-jwt.mjs --secret-file <path> --role <anon|service_role|authenticated> [--sub uuid] [--org uuid] [--email x] [--ttl seconds]",
  );
  process.exit(2);
}
const secret = fs.readFileSync(secretFile, "utf8").trim();
const now = Math.floor(Date.now() / 1000);
const ttl = Number(args.get("ttl") || 8 * 3600);
const claims = { iss: "sadeed-integration", iat: now, exp: now + ttl, role };
if (role === "authenticated") {
  if (!args.get("sub")) {
    console.error("--sub is required for role authenticated");
    process.exit(2);
  }
  claims.sub = args.get("sub");
  claims.aud = "authenticated";
  if (args.get("email")) claims.email = args.get("email");
  if (args.get("org")) claims.app_metadata = { current_org: args.get("org") };
}
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const head = b64({ alg: "HS256", typ: "JWT" });
const payload = b64(claims);
const sig = crypto.createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url");
process.stdout.write(`${head}.${payload}.${sig}\n`);
