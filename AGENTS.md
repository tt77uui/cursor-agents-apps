# AGENTS.md

## Cursor Cloud specific instructions

This repository is an empty scaffold (as of initial setup). It contains only `README.md`, `LICENSE`, and a Node.js-oriented `.gitignore`. No application code, services, or dependencies exist yet.

### Environment

- **Node.js** is available via `nvm` (v22.x LTS).
- **npm** (v10.x), **pnpm** (v10.x), and **yarn** (v1.x) are all pre-installed.
- No `package.json` or lockfile exists — there are no dependencies to install.

### Running services

There are no services to run. When application code is added, update this section with startup commands, ports, and any non-obvious caveats.

### Lint / Test / Build

No lint, test, or build commands exist. When tooling is added (e.g., ESLint, Vitest, TypeScript), update this section accordingly.

### Notes

- The `.gitignore` covers Node.js, Next.js, Nuxt, SvelteKit, Vite, Gatsby, VuePress, Docusaurus, Firebase, Serverless Framework, and DynamoDB Local — suggesting the repo will house JavaScript/TypeScript web applications.
- Future agents: once a `package.json` is added, run the matching package manager's install command (check for lockfiles: `package-lock.json` → npm, `yarn.lock` → yarn, `pnpm-lock.yaml` → pnpm).
