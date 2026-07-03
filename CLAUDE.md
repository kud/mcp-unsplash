# mcp-unsplash

## API Reference

Official API docs: https://unsplash.com/documentation

Read-only, public endpoints only — no OAuth, no user/write actions. Authenticated
via `Authorization: Client-ID <MCP_UNSPLASH_ACCESS_KEY>` header on every request.

Per Unsplash API guidelines, calling `get_photo` also triggers the photo's
`links.download_location` endpoint (best-effort) to register a download event.
