# Pre-Launch Checklist

Use this checklist before publishing MathSheets on a real web domain.

## Code and Security

- [ ] Hard-disable `backend/src/routes/test-auth.routes.ts` outside `NODE_ENV=test`
- [ ] Verify same-origin production auth cookies work over HTTPS
- [ ] Confirm security headers are present in the deployed app
- [ ] Confirm body-size limits do not break normal worksheet flows
- [ ] Recheck rate-limit thresholds for real usage

## Frontend and API Configuration

- [ ] Set `VITE_API_BASE_URL` for production if frontend and API are on different origins
- [ ] If frontend and API are same-origin, verify the app works with `/api`
- [ ] Remove any remaining localhost values from production environment files
- [ ] Verify Google OAuth origin and callback match the real production domain exactly

## Infrastructure

- [ ] Serve frontend and backend over HTTPS only
- [ ] Put PostgreSQL on persistent storage
- [ ] Set up automated backups
- [ ] Verify restore procedure once
- [ ] Add uptime monitoring for `/api/health`
- [ ] Add centralized error and log monitoring

## Secrets

- [ ] Rotate the Google OAuth secret before launch if it was exposed during setup
- [ ] Use strong production JWT secrets
- [ ] Store secrets in deployment secret management, not committed files

## QA

- [ ] Run the full backend and frontend test suite
- [ ] Run the full Playwright suite
- [ ] Test real Google sign-in on the deployed domain
- [ ] Test refresh-token flow after access token expiry
- [ ] Test logout
- [ ] Test anonymous-to-signed-in import flow
- [ ] Test leaderboard appearance after completing a worksheet
- [ ] Test mobile flows on a real phone

## Product and Compliance

- [x] Add a Privacy Policy
- [x] Add Terms of Service
- [x] Add client-side consent controls for non-essential cookies
- [ ] Clearly explain public nickname and leaderboard visibility in the UI
- [ ] Review final legal text with your own legal and business requirements before public launch
- [ ] Review child and student privacy requirements if relevant

## Deployment

- [ ] Document deploy order: database migrate, backend deploy, frontend deploy
- [ ] Smoke-test the live app immediately after deploy
- [ ] Have rollback steps ready
