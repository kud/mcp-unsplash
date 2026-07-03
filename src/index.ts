#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

const ACCESS_KEY = process.env["MCP_UNSPLASH_ACCESS_KEY"]
if (!ACCESS_KEY) {
  console.error("MCP_UNSPLASH_ACCESS_KEY env var is required")
  process.exit(1)
}

const API_BASE = "https://api.unsplash.com"

type UnsplashUser = {
  username: string
  name: string
  links?: { html?: string }
}

type UnsplashUrls = {
  raw: string
  full: string
  regular: string
  small: string
  thumb: string
}

type UnsplashLinks = {
  html: string
  download_location: string
}

type UnsplashExif = {
  make?: string
  model?: string
  exposure_time?: string
  aperture?: string
  focal_length?: string
  iso?: number
}

type UnsplashLocation = {
  name?: string
  city?: string
  country?: string
  position?: { latitude?: number; longitude?: number }
}

type UnsplashPhoto = {
  id: string
  created_at?: string
  description: string | null
  alt_description: string | null
  width: number
  height: number
  color: string | null
  likes: number
  downloads?: number
  urls: UnsplashUrls
  links: UnsplashLinks
  user: UnsplashUser
  exif?: UnsplashExif
  location?: UnsplashLocation
}

type UnsplashSearchPhotosResponse = {
  total: number
  total_pages: number
  results: UnsplashPhoto[]
}

type UnsplashCollection = {
  id: string
  title: string
  description: string | null
  total_photos: number
  cover_photo: UnsplashPhoto | null
  user: UnsplashUser
  links: { html: string }
}

type UnsplashTopic = {
  id: string
  slug: string
  title: string
  description: string | null
  total_photos: number
  cover_photo: UnsplashPhoto | null
  links: { html: string }
}

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T | null> => {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Client-ID ${ACCESS_KEY}`,
        "Accept-Version": "v1",
        ...options.headers,
      },
    })
    if (!response.ok) {
      console.error(`Unsplash API error: ${response.status} ${path}`)
      return null
    }
    return (await response.json()) as T
  } catch (e) {
    console.error(`Fetch failed: ${path}`, e)
    return null
  }
}

const trackDownload = async (downloadLocation: string): Promise<void> => {
  try {
    await fetch(downloadLocation, {
      headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
    })
  } catch (e) {
    console.error("Unsplash download tracking failed", e)
  }
}

export const ok = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
})

export const err = (msg: string) => ({
  content: [{ type: "text" as const, text: `Error: ${msg}` }],
})

const buildQuery = (
  params: Record<string, string | number | undefined>,
): string => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

const trimAuthor = (user: UnsplashUser) => ({
  name: user.name,
  username: user.username,
  profile: user.links?.html,
})

const trimPhotoSummary = (photo: UnsplashPhoto) => ({
  id: photo.id,
  description: photo.description ?? photo.alt_description,
  width: photo.width,
  height: photo.height,
  color: photo.color,
  likes: photo.likes,
  urls: {
    regular: photo.urls.regular,
    small: photo.urls.small,
    thumb: photo.urls.thumb,
  },
  link: photo.links.html,
  author: trimAuthor(photo.user),
})

const trimPhotoFull = (photo: UnsplashPhoto) => ({
  id: photo.id,
  created_at: photo.created_at,
  description: photo.description ?? photo.alt_description,
  width: photo.width,
  height: photo.height,
  color: photo.color,
  likes: photo.likes,
  downloads: photo.downloads,
  urls: photo.urls,
  link: photo.links.html,
  author: trimAuthor(photo.user),
  exif: photo.exif,
  location: photo.location,
})

const trimCollectionSummary = (collection: UnsplashCollection) => ({
  id: collection.id,
  title: collection.title,
  description: collection.description,
  total_photos: collection.total_photos,
  cover_photo: collection.cover_photo
    ? trimPhotoSummary(collection.cover_photo)
    : null,
  author: trimAuthor(collection.user),
  link: collection.links.html,
})

const trimTopicSummary = (topic: UnsplashTopic) => ({
  id: topic.id,
  slug: topic.slug,
  title: topic.title,
  description: topic.description,
  total_photos: topic.total_photos,
  cover_photo: topic.cover_photo ? trimPhotoSummary(topic.cover_photo) : null,
  link: topic.links.html,
})

// ─── Photos ───

export const searchPhotos = async ({
  query,
  page = 1,
  per_page = 10,
  orientation,
  color,
  order_by,
}: {
  query: string
  page?: number
  per_page?: number
  orientation?: "landscape" | "portrait" | "squarish"
  color?: string
  order_by?: "relevant" | "latest"
}) => {
  const path = `/search/photos${buildQuery({
    query,
    page,
    per_page,
    orientation,
    color,
    order_by,
  })}`
  const data = await apiFetch<UnsplashSearchPhotosResponse>(path)
  if (!data) return err("failed to search photos")
  return ok({
    total: data.total,
    total_pages: data.total_pages,
    results: data.results.map(trimPhotoSummary),
  })
}

export const randomPhoto = async ({
  query,
  collections,
  topics,
  orientation,
  count,
}: {
  query?: string
  collections?: string
  topics?: string
  orientation?: "landscape" | "portrait" | "squarish"
  count?: number
}) => {
  const path = `/photos/random${buildQuery({
    query,
    collections,
    topics,
    orientation,
    count,
  })}`
  const data = await apiFetch<UnsplashPhoto | UnsplashPhoto[]>(path)
  if (!data) return err("failed to fetch random photo")
  return ok(
    Array.isArray(data) ? data.map(trimPhotoSummary) : trimPhotoFull(data),
  )
}

export const getPhoto = async ({ id }: { id: string }) => {
  const data = await apiFetch<UnsplashPhoto>(`/photos/${id}`)
  if (!data) return err("failed to fetch photo")

  // Unsplash API guidelines require triggering a download event whenever a
  // photo is displayed/used by a client. This is best-effort — a failure
  // here must never fail the tool call itself.
  if (data.links?.download_location) {
    await trackDownload(data.links.download_location)
  }

  return ok(trimPhotoFull(data))
}

// ─── Collections ───

export const listCollections = async ({
  page = 1,
  per_page = 10,
}: {
  page?: number
  per_page?: number
}) => {
  const path = `/collections${buildQuery({ page, per_page })}`
  const data = await apiFetch<UnsplashCollection[]>(path)
  if (!data) return err("failed to list collections")
  return ok(data.map(trimCollectionSummary))
}

export const getCollection = async ({ id }: { id: string }) => {
  const data = await apiFetch<UnsplashCollection>(`/collections/${id}`)
  if (!data) return err("failed to fetch collection")
  return ok(trimCollectionSummary(data))
}

export const getCollectionPhotos = async ({
  id,
  page = 1,
  per_page = 10,
  orientation,
}: {
  id: string
  page?: number
  per_page?: number
  orientation?: "landscape" | "portrait" | "squarish"
}) => {
  const path = `/collections/${id}/photos${buildQuery({ page, per_page, orientation })}`
  const data = await apiFetch<UnsplashPhoto[]>(path)
  if (!data) return err("failed to fetch collection photos")
  return ok(data.map(trimPhotoSummary))
}

// ─── Topics ───

export const listTopics = async ({
  page = 1,
  per_page = 10,
  order_by,
}: {
  page?: number
  per_page?: number
  order_by?: "featured" | "latest" | "oldest" | "position"
}) => {
  const path = `/topics${buildQuery({ page, per_page, order_by })}`
  const data = await apiFetch<UnsplashTopic[]>(path)
  if (!data) return err("failed to list topics")
  return ok(data.map(trimTopicSummary))
}

export const getTopicPhotos = async ({
  id_or_slug,
  page = 1,
  per_page = 10,
  orientation,
}: {
  id_or_slug: string
  page?: number
  per_page?: number
  orientation?: "landscape" | "portrait" | "squarish"
}) => {
  const path = `/topics/${id_or_slug}/photos${buildQuery({ page, per_page, orientation })}`
  const data = await apiFetch<UnsplashPhoto[]>(path)
  if (!data) return err("failed to fetch topic photos")
  return ok(data.map(trimPhotoSummary))
}

const server = new McpServer({ name: "unsplash", version: "1.0.0" })

const orientationSchema = z
  .enum(["landscape", "portrait", "squarish"])
  .optional()
  .describe("Photo orientation filter")

// ─── Photos ───

server.registerTool(
  "search_photos",
  {
    description: "Search Unsplash photos by keyword",
    inputSchema: {
      query: z.string().describe("Search terms"),
      page: z.number().int().min(1).default(1).describe("Page number"),
      per_page: z
        .number()
        .int()
        .min(1)
        .max(30)
        .default(10)
        .describe("Results per page (max 30)"),
      orientation: orientationSchema,
      color: z
        .string()
        .optional()
        .describe(
          "Unsplash colour filter, e.g. black_and_white, black, white, yellow, orange, red, purple, magenta, green, teal, blue",
        ),
      order_by: z
        .enum(["relevant", "latest"])
        .optional()
        .describe("Sort order"),
    },
  },
  searchPhotos,
)

server.registerTool(
  "random_photo",
  {
    description:
      "Fetch one or more random Unsplash photos, optionally filtered",
    inputSchema: {
      query: z
        .string()
        .optional()
        .describe("Limit selection to matching photos"),
      collections: z
        .string()
        .optional()
        .describe("Comma-separated collection IDs to limit selection"),
      topics: z
        .string()
        .optional()
        .describe("Comma-separated topic IDs to limit selection"),
      orientation: orientationSchema,
      count: z
        .number()
        .int()
        .min(1)
        .max(30)
        .optional()
        .describe("Number of photos to return (1-30)"),
    },
  },
  randomPhoto,
)

server.registerTool(
  "get_photo",
  {
    description:
      "Fetch full metadata for a single photo by ID (also registers a download event with Unsplash, per API guidelines)",
    inputSchema: { id: z.string().describe("Photo ID") },
  },
  getPhoto,
)

// ─── Collections ───

server.registerTool(
  "list_collections",
  {
    description: "List Unsplash collections",
    inputSchema: {
      page: z.number().int().min(1).default(1).describe("Page number"),
      per_page: z
        .number()
        .int()
        .min(1)
        .max(30)
        .default(10)
        .describe("Results per page (max 30)"),
    },
  },
  listCollections,
)

server.registerTool(
  "get_collection",
  {
    description: "Fetch a single collection by ID",
    inputSchema: { id: z.string().describe("Collection ID") },
  },
  getCollection,
)

server.registerTool(
  "get_collection_photos",
  {
    description: "List the photos in a collection",
    inputSchema: {
      id: z.string().describe("Collection ID"),
      page: z.number().int().min(1).default(1).describe("Page number"),
      per_page: z
        .number()
        .int()
        .min(1)
        .max(30)
        .default(10)
        .describe("Results per page (max 30)"),
      orientation: orientationSchema,
    },
  },
  getCollectionPhotos,
)

// ─── Topics ───

server.registerTool(
  "list_topics",
  {
    description: "List Unsplash topics",
    inputSchema: {
      page: z.number().int().min(1).default(1).describe("Page number"),
      per_page: z
        .number()
        .int()
        .min(1)
        .max(30)
        .default(10)
        .describe("Results per page (max 30)"),
      order_by: z
        .enum(["featured", "latest", "oldest", "position"])
        .optional()
        .describe("Sort order"),
    },
  },
  listTopics,
)

server.registerTool(
  "get_topic_photos",
  {
    description: "List the photos in a topic",
    inputSchema: {
      id_or_slug: z.string().describe("Topic ID or slug"),
      page: z.number().int().min(1).default(1).describe("Page number"),
      per_page: z
        .number()
        .int()
        .min(1)
        .max(30)
        .default(10)
        .describe("Results per page (max 30)"),
      orientation: orientationSchema,
    },
  },
  getTopicPhotos,
)

const main = async () => {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("mcp-unsplash running")
}

main().catch((e) => {
  console.error("Fatal:", e)
  process.exit(1)
})
