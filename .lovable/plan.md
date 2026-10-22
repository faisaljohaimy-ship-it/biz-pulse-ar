# Production incident: Vercel health fails with "Invalid API key" (diagnosis and recovery options)

## Findings (non-sensitive)

- Cause: the Vercel deployment's server credential for the source backend is wrong for that backend, or missing. The database read check works because it uses the public key. The rate-limit store uses the admin credential, and the source backend rejects it.
- On Lovable Cloud, the admin credential for the source backend is managed by the platform. Users cannot export it, and neither can I. That is a platform rule, not a missing setting.
- What my tools can do: run read-only queries on the source, read the code, call public endpoints on neexios.com, and change code or settings in this Lovable project only after you approve.
- What my tools cannot do: read or copy the source admin credential, see or set Vercel environment variables (there is no Vercel connection), redeploy Vercel, or rotate keys.

## Recovery options (choose one)

1. **Official Lovable support (the only way to keep using a source admin credential outside Lovable).** Ask support whether they can securely provision a server credential for this Cloud project to an external host, or move the project to a backend you own. Staff need to: issue or transfer a server credential for this project to the owner's Vercel deployment, or confirm this is not supported. I have not confirmed this is possible.
2. **Remove the need for the admin credential on Vercel (code change; the database part needs your approval).** Move the rate-limit store behind a narrow database function that runs with the public key. This needs a production migration, so it waits for your explicit approval under the project's rules. A Vercel redeploy is also needed.
3. **Temporary relief, decided by you.** Set `SADEED_GATE_DEGRADED_MODE=bounded` on Vercel. Chat then works with in-memory limits at half the normal caps. The health check will still report the store as failing. This needs a Vercel redeploy, which only you can do.
4. **Planned cutover to the destination backend.** Do this after the owner's end-to-end check and the final data sync. Use the destination URL and the destination credential together, never mixed. This also solves the problem for good.
5. **Point the domain at the Lovable-hosted app.** The managed credential works there. This is not recommended: you said not to publish the older Lovable version over Vercel.

## Recommended order

Start option 1 now. If the timing matters, use option 3 meanwhile. Treat option 4 as the lasting fix.

## Technical details

- Unconfirmed: whether the Vercel variable is empty, holds the destination's credential, or holds an old or rotated one. Only the Vercel dashboard shows this, and only the owner can see it.
- No code, settings, branches, database or deployment were changed.
