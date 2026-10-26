# Implementation Plan: Cloudflare Deployment Fix

The current deployment fails because the `@opennextjs/cloudflare` adapter requires Next.js 15+, while the project is currently using Next.js 14. To enable serverless functions on Cloudflare Pages, we must align the project dependencies.

## Planned Changes

1.  **Upgrade Dependencies:**
    - Update `next`, `react`, and `react-dom` to version 15+ in `apps/web/package.json`.
    - Update `@types/react` and `@types/react-dom` to match.
    - Resolve any peer dependency conflicts in the root `package.json`.

2.  **Project Structure Cleanup:**
    - Final removal of any `pages/` directory files that cause build conflicts with the App Router.
    - Ensure `wrangler.jsonc` (if present) is properly configured or removed for Pages deployment.

3.  **Adapter Configuration:**
    - Run the OpenNext migration tool (`@opennextjs/cloudflare`) to correctly re-configure the project for Cloudflare Pages.
    - Update `next.config.js` to use the Cloudflare adapter.

4.  **Verification:**
    - Verify local build (`npm run build` in `apps/web`) succeeds with the new configuration.

5.  **Deployment:**
    - Provide the final steps to update Cloudflare Pages settings for the new build configuration.

## Risks & Mitigation
- **Version Compatibility:** Upgrading Next.js 14 to 15 might introduce minor breaking changes in React/Next.js APIs. I will review and fix any immediate type or runtime errors caused by the upgrade.
- **Monorepo Complexity:** The monorepo structure needs precise build command configuration. I will ensure the `package.json` at the root correctly bridges the build process for `apps/web`.
