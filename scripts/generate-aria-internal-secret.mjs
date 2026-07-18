import { randomBytes } from "node:crypto";

// Pipe this output directly into the NEXIOS secret manager. Never commit it.
const secret = randomBytes(48).toString("base64url");
process.stdout.write(`ARIA_MESSAGE_APPROVAL_SECRET=${secret}\n`);
