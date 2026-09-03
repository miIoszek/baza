---
name: deploy
description: Deploy the app to Cloudflare Workers via wrangler. Only the user can trigger this skill.
disable-model-invocation: true
---

Deploy CookingHelper to Cloudflare Workers.

Steps:

1. Confirm the user intends to deploy to production (ask explicitly if not stated).
2. Run `npm run build` and surface any errors before proceeding.
3. Run `npx wrangler deploy`.
4. Report the deployed URL from wrangler output.

If wrangler is not authenticated, tell the user to run `npx wrangler login` first.
If `SUPABASE_URL` or `SUPABASE_KEY` are missing from the Cloudflare environment, warn before deploying — the app will start but auth will fail.
