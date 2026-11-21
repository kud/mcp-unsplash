```
██╗   ██╗███╗   ██╗███████╗██████╗ ██╗      █████╗ ███████╗██╗  ██╗
██║   ██║████╗  ██║██╔════╝██╔══██╗██║     ██╔══██╗██╔════╝██║  ██║
██║   ██║██╔██╗ ██║███████╗██████╔╝██║     ███████║███████╗███████║
██║   ██║██║╚██╗██║╚════██║██╔═══╝ ██║     ██╔══██║╚════██║██╔══██║
╚██████╔╝██║ ╚████║███████║██║     ███████╗██║  ██║███████║██║  ██║
 ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
```

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![npm](https://img.shields.io/npm/v/@kud/mcp-unsplash?style=flat-square&color=CB3837)
![MIT](https://img.shields.io/badge/licence-MIT-22C55E?style=flat-square)

**MCP server for Unsplash — search and fetch freely-licensed photos via the public Unsplash API.**

[Features](#-features) • [Quick Start](#-quick-start) • [Available Tools](#-available-tools) • [Development](#-development)

</div>

## 🌟 Features

- 🔍 **Keyword search** — full-text search across photos, collections, and users, with pagination, orientation, colour, and sort-order filters
- 🎲 **Random photos** — pull 1–30 random photos, optionally scoped to a query, collection, or topic
- 🖼 **Full photo metadata** — resolve a single photo by ID, including EXIF and location where available
- 📁 **Collections browsing** — list collections, fetch one by ID, list its photos, find related collections
- 🏷 **Editorial topics** — list Unsplash's curated topics, fetch one by ID/slug, and the photos within each one
- 👤 **User profiles** — public profile, photos, collections, and statistics for any Unsplash user
- 📊 **Statistics** — per-photo and per-user download/view/like statistics, plus platform-wide totals and monthly stats
- ✂️ **Trimmed responses** — list, search and browse tools strip API payloads down to the fields a model actually needs (id, description, dimensions, colour, a small set of image URLs, author name + profile link); single-photo lookups keep the full metadata, and statistics are passed through as Unsplash returns them
- ✅ **Guideline-compliant** — `get_photo` fires the Unsplash download-tracking ping automatically, as required by the API terms

## 🚀 Quick Start

Get a free Access Key from [unsplash.com/developers](https://unsplash.com/developers) — no payment required. New apps start in the **Demo** tier (50 requests/hour); apply for **Production** access to raise that to 5,000 requests/hour.

```sh
npm install -g @kud/mcp-unsplash
```

Run it directly to confirm it starts:

```console
$ MCP_UNSPLASH_ACCESS_KEY=your-access-key npx @kud/mcp-unsplash
mcp-unsplash running
```

The server speaks MCP over stdio, so in practice it's launched by an MCP client (Claude Desktop, Claude Code, etc.) rather than run standalone — see [Configuration](#-configuration) below.

## 🔧 Configuration

The server needs exactly one environment variable:

| Variable                  | Required | Description                                                   |
| ------------------------- | -------- | ------------------------------------------------------------- |
| `MCP_UNSPLASH_ACCESS_KEY` | yes      | Unsplash Access Key, sent as `Authorization: Client-ID <key>` |

Auth is read-only against Unsplash's public endpoints — no OAuth flow, no write actions, no user-scoped data.

### Register with an MCP client

Add the server to your client's MCP config (e.g. `.mcp.json`):

```json
{
  "mcpServers": {
    "mcp-unsplash": {
      "command": "npx",
      "args": ["-y", "@kud/mcp-unsplash"],
      "env": {
        "MCP_UNSPLASH_ACCESS_KEY": "your-access-key"
      }
    }
  }
}
```

## 🛠 Available Tools

| Tool                     | Description                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| `list_photos`            | List all photos, newest first — `page`, `per_page` (≤30), `order_by`                        |
| `search_photos`          | Keyword search — `query`, `page`, `per_page` (≤30), `orientation`, `color`, `order_by`      |
| `random_photo`           | One or more random photos — `query`, `collections`, `topics`, `orientation`, `count` (1–30) |
| `get_photo`              | Full metadata for a photo by `id`; also fires the Unsplash download-tracking ping           |
| `get_photo_statistics`   | Download/view/like statistics for a photo — `id`, `resolution`, `quantity` (≤30)            |
| `list_collections`       | Browse collections — `page`, `per_page`                                                     |
| `get_collection`         | Fetch a single collection by `id`                                                           |
| `get_collection_photos`  | Photos in a collection — `id`, `page`, `per_page`, `orientation`                            |
| `search_collections`     | Keyword search for collections — `query`, `page`, `per_page`                                |
| `get_collection_related` | Collections related to a given collection — `id`                                            |
| `list_topics`            | List editorial topics — `page`, `per_page`, `order_by`                                      |
| `get_topic_photos`       | Photos in a topic — `id_or_slug`, `page`, `per_page`, `orientation`                         |
| `get_topic`              | Fetch a single topic by `id_or_slug`                                                        |
| `get_user`               | Public profile for a user by `username`                                                     |
| `get_user_photos`        | Photos published by a user — `username`, `page`, `per_page`, `order_by`, `orientation`      |
| `get_user_collections`   | Collections curated by a user — `username`, `page`, `per_page`                              |
| `get_user_statistics`    | Download/view/like statistics for a user — `username`, `resolution`, `quantity` (≤30)       |
| `search_users`           | Keyword search for users — `query`, `page`, `per_page`                                      |
| `get_stats_total`        | Unsplash's all-time platform statistics                                                     |
| `get_stats_month`        | Unsplash's platform statistics for the past month — `resolution`, `quantity` (≤30)          |

List, search and browse tools return trimmed photo, collection, topic and user summaries rather than the full Unsplash payload; a photo summary carries `id`, `description`, `width`/`height`, `color`, `likes`, a small `urls` subset (`regular`/`small`/`thumb`), a `link`, and the author's `name`, `username` and profile link. `get_photo`, and `random_photo` when called without `count`, return the fuller shape instead: the complete `urls` set plus `created_at`, `downloads`, `exif` and `location` where available. The statistics tools (`get_photo_statistics`, `get_user_statistics`, `get_stats_total`, `get_stats_month`) return Unsplash's payload untrimmed. Paginated tools default to `page` 1 and `per_page` 10, capped at 30.

When a request fails, the tool replies with a plain `Error: failed to <action>` message (for example `Error: failed to search photos`). The HTTP status is logged to stderr only, so a rate-limit rejection looks the same as any other failure from the client's side.

### Attribution and hotlinking

Unsplash's API guidelines require crediting the photographer and hotlinking images directly rather than re-hosting them. When displaying a photo returned by any of these tools:

- Use the returned `urls` values directly (don't download and re-serve the image yourself)
- Credit the photographer by name, linking to their `author.profile` URL
- Call `get_photo` for the photo you actually use — it pings Unsplash's download-tracking endpoint (best-effort), which is what registers the download; search and list results do not

## 🔧 Development

```
mcp-unsplash/
├── src/
│   ├── index.ts              MCP server, tool registration, Unsplash API client
│   └── __tests__/
│       └── tools.test.ts     Vitest coverage for each tool
├── docs/                     Per-topic documentation pages
├── dist/                     Compiled output (npm run build)
└── .mcp.json                 Local dev MCP client config (tsx, no build step)
```

| Script                | Purpose                                               |
| --------------------- | ----------------------------------------------------- |
| `npm run dev`         | Run the server directly from source via `tsx`         |
| `npm run build`       | Compile TypeScript to `dist/`                         |
| `npm run build:watch` | Compile in watch mode                                 |
| `npm test`            | Run the Vitest suite                                  |
| `npm run coverage`    | Run tests with coverage                               |
| `npm run typecheck`   | Type-check without emitting                           |
| `npm run inspect`     | Launch the MCP Inspector against the built server     |
| `npm run inspect:dev` | Launch the MCP Inspector against the source via `tsx` |

```sh
git clone https://github.com/kud/mcp-unsplash.git
cd mcp-unsplash
npm install
MCP_UNSPLASH_ACCESS_KEY=your-access-key npm run dev
```

## 🏗 Tech Stack

| Category          | Choice                      |
| ----------------- | --------------------------- |
| Language          | TypeScript                  |
| MCP framework     | `@modelcontextprotocol/sdk` |
| Schema validation | `zod`                       |
| Testing           | Vitest                      |
| Dev runner        | `tsx`                       |

---

MIT © [kud](https://github.com/kud) — Made with ❤️
