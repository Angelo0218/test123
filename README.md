# web-push-demo

Simple Vite + Vue web push demo with a Vercel serverless API.

## Local setup

1. Install deps
   ```sh
   npm install
   ```
2. Generate VAPID keys
   ```sh
   npx web-push generate-vapid-keys
   ```
3. Create `.env` from `.env.example` and paste the keys.
4. Run dev server
   ```sh
   npm run dev
   ```

## Vercel setup

Set the same env vars in your Vercel project:
- `VITE_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Deploy, then open the site and click Subscribe and Send Test Push.
