# Administrator Handbook

## Roles
Roles live in `public.user_roles` (`admin`, `moderator`, `user`). Promote a user:
```sql
INSERT INTO public.user_roles (user_id, role) VALUES ('<uuid>', 'admin');
```

## Daily admin tasks
1. Open `/observability` — review audit log + token spend.
2. Open `/admin` — manage users, roles, system flags.
3. Open `/governance` — confirm SLAs & policy coverage are green.
4. Scan `/risk` for any new critical (red) items.

## Managing executive content
- `/decisions`, `/memory`, `/forgotten`, `/briefing` — full CRUD per user.
- `/governance`, `/transformation`, `/outcomes` — CRUD via inline forms.
- Pulse tables (`pulse_kpis`, `pulse_crises`, etc.) auto-seed on first login; admins may overwrite rows directly.

## Auth configuration
- Email/password + Google OAuth enabled.
- Confirm-email: ON (toggle in Lovable Cloud → Auth).
- Password leak protection: enable via Cloud → Auth → Email settings.

## Data exports
Use the Supabase UI or `psql` (`SUPABASE_DB_URL`) for one-off CSV exports.

## Escalation
Lovable support → Project Settings → Help.
