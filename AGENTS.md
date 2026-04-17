# AGENTS.md

## Cursor Cloud specific instructions

This is a Node.js/TypeScript monorepo with three apps managed via npm workspaces (see root `package.json` `workspaces`).

### Services

| App | Client port | Server port | Start command |
|-----|-------------|-------------|---------------|
| app-01-shop-quote-studio | 5173 | 3001 | `npm start -w app-01-shop-quote-studio` |
| app-02-shift-stock-lite | 5174 | 3002 | `npm start -w app-02-shift-stock-lite` |
| packages/voice-chat | 5175 | N/A (client-only) | `npm run dev -w voice-chat` |

Both app-01 and app-02 use SQLite via `better-sqlite3` (auto-created, no setup needed). The Vite client proxies `/api` to the corresponding Express server.

### Lint / Test / Build

Standard commands from `package.json` scripts:
- **Lint:** `npx eslint . --max-warnings 0`
- **Test:** `npm test` (runs vitest in all 3 workspaces)
- **Format:** `npm run format` (prettier)

### Notes

- Default unlock code for Pro features in both apps: `demo-pro-unlock-2025` (set in `server/src/server.ts`).
- All UI text is in Chinese (zh-CN). When adding new user-visible strings, use Chinese.
