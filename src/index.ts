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

type UnsplashSearchCollectionsResponse = {
  total: number
  total_pages: number
  results: UnsplashCollection[]
}

type UnsplashUserProfile = {
  id?: string
  username: string
  name: string
  bio: string | null
  location: string | null
  total_photos?: number
  total_likes?: number
  total_collections?: number
  links: { html: string }
}

type UnsplashSearchUsersResponse = {
  total: number
  total_pages: number
  results: UnsplashUserProfile[]
}

type UnsplashStatValue = { date: string; value: number }

type UnsplashStatHistorical = {
  change: number
  resolution: string
  quantity: number
  values: UnsplashStatValue[]
}

type UnsplashStatMetric = {
  total: number
  historical: UnsplashStatHistorical
}

type UnsplashPhotoStatistics = {
  id: string
  downloads: UnsplashStatMetric
  views: UnsplashStatMetric
  likes?: UnsplashStatMetric
}

type UnsplashUserStatistics = {
  username: string
  downloads: UnsplashStatMetric
  views: UnsplashStatMetric
  likes?: UnsplashStatMetric
}

type UnsplashTotalStats = {
  photos: number
  downloads: number
  views: number
  likes: number
  photographers: number
  pixels: number
  downloads_per_second: number
  views_per_second: number
  developers: number
}

type UnsplashMonthStats = {
  downloads: number
  views: number
  likes: number
  new_photos: number
  new_photographers: number
  new_pixels: number
  new_developers: number
  new_applications: number
  new_requests: number
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

const trimUserSummary = (user: UnsplashUserProfile) => ({
  name: user.name,
  username: user.username,
  profile: user.links?.html,
  bio: user.bio,
  location: user.location,
  total_photos: user.total_photos,
  total_likes: user.total_likes,
  total_collections: user.total_collections,
})

// ─── Photos ───

export const listPhotos = async ({
  page = 1,
  per_page = 10,
  order_by,
}: {
  page?: number
  per_page?: number
  order_by?: "latest" | "oldest" | "popular"
}) => {
  const path = `/photos${buildQuery({ page, per_page, order_by })}`
  const data = await apiFetch<UnsplashPhoto[]>(path)
  if (!data) return err("failed to list photos")
  return ok(data.map(trimPhotoSummary))
}

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

export const getPhotoStatistics = async ({
  id,
  resolution = "days",
  quantity = 30,
}: {
  id: string
  resolution?: "days"
  quantity?: number
}) => {
  const path = `/photos/${id}/statistics${buildQuery({ resolution, quantity })}`
  const data = await apiFetch<UnsplashPhotoStatistics>(path)
  if (!data) return err("failed to fetch photo statistics")
  return ok(data)
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

export const searchCollections = async ({
  query,
  page = 1,
  per_page = 10,
}: {
  query: string
  page?: number
  per_page?: number
}) => {
  const path = `/search/collections${buildQuery({ query, page, per_page })}`
  const data = await apiFetch<UnsplashSearchCollectionsResponse>(path)
  if (!data) return err("failed to search collections")
  return ok({
    total: data.total,
    total_pages: data.total_pages,
    results: data.results.map(trimCollectionSummary),
  })
}

export const getCollectionRelated = async ({ id }: { id: string }) => {
  const data = await apiFetch<UnsplashCollection[]>(
    `/collections/${id}/related`,
  )
  if (!data) return err("failed to fetch related collections")
  return ok(data.map(trimCollectionSummary))
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

export const getTopic = async ({ id_or_slug }: { id_or_slug: string }) => {
  const data = await apiFetch<UnsplashTopic>(`/topics/${id_or_slug}`)
  if (!data) return err("failed to fetch topic")
  return ok(trimTopicSummary(data))
}

// ─── Users ───

export const getUser = async ({ username }: { username: string }) => {
  const data = await apiFetch<UnsplashUserProfile>(`/users/${username}`)
  if (!data) return err("failed to fetch user")
  return ok(trimUserSummary(data))
}

export const getUserPhotos = async ({
  username,
  page = 1,
  per_page = 10,
  order_by,
  orientation,
}: {
  username: string
  page?: number
  per_page?: number
  order_by?: "latest" | "oldest" | "popular" | "views" | "downloads"
  orientation?: "landscape" | "portrait" | "squarish"
}) => {
  const path = `/users/${username}/photos${buildQuery({ page, per_page, order_by, orientation })}`
  const data = await apiFetch<UnsplashPhoto[]>(path)
  if (!data) return err("failed to fetch user photos")
  return ok(data.map(trimPhotoSummary))
}

export const getUserCollections = async ({
  username,
  page = 1,
  per_page = 10,
}: {
  username: string
  page?: number
  per_page?: number
}) => {
  const path = `/users/${username}/collections${buildQuery({ page, per_page })}`
  const data = await apiFetch<UnsplashCollection[]>(path)
  if (!data) return err("failed to fetch user collections")
  return ok(data.map(trimCollectionSummary))
}

export const getUserStatistics = async ({
  username,
  resolution = "days",
  quantity = 30,
}: {
  username: string
  resolution?: "days"
  quantity?: number
}) => {
  const path = `/users/${username}/statistics${buildQuery({ resolution, quantity })}`
  const data = await apiFetch<UnsplashUserStatistics>(path)
  if (!data) return err("failed to fetch user statistics")
  return ok(data)
}

export const searchUsers = async ({
  query,
  page = 1,
  per_page = 10,
}: {
  query: string
  page?: number
  per_page?: number
}) => {
  const path = `/search/users${buildQuery({ query, page, per_page })}`
  const data = await apiFetch<UnsplashSearchUsersResponse>(path)
  if (!data) return err("failed to search users")
  return ok({
    total: data.total,
    total_pages: data.total_pages,
    results: data.results.map(trimUserSummary),
  })
}

// ─── Stats ───

export const getStatsTotal = async () => {
  const data = await apiFetch<UnsplashTotalStats>("/stats/total")
  if (!data) return err("failed to fetch total stats")
  return ok(data)
}

export const getStatsMonth = async ({
  resolution = "days",
  quantity = 30,
}: {
  resolution?: "days"
  quantity?: number
}) => {
  const path = `/stats/month${buildQuery({ resolution, quantity })}`
  const data = await apiFetch<UnsplashMonthStats>(path)
  if (!data) return err("failed to fetch month stats")
  return ok(data)
}

const server = new McpServer({ name: "unsplash", version: "1.0.0" })

const orientationSchema = z
  .enum(["landscape", "portrait", "squarish"])
  .optional()
  .describe("Photo orientation filter")

// ─── Photos ───

server.registerTool(
  "list_photos",
  {
    description: "List all Unsplash photos, newest first by default",
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
        .enum(["latest", "oldest", "popular"])
        .optional()
        .describe("Sort order"),
    },
  },
  listPhotos,
)

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

server.registerTool(
  "get_photo_statistics",
  {
    description: "Fetch download/view/like statistics for a photo by ID",
    inputSchema: {
      id: z.string().describe("Photo ID"),
      resolution: z
        .enum(["days"])
        .default("days")
        .describe("Time resolution for historical values"),
      quantity: z
        .number()
        .int()
        .min(1)
        .max(30)
        .default(30)
        .describe("Number of historical data points (max 30)"),
    },
  },
  getPhotoStatistics,
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

server.registerTool(
  "search_collections",
  {
    description: "Search Unsplash collections by keyword",
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
    },
  },
  searchCollections,
)

server.registerTool(
  "get_collection_related",
  {
    description: "List collections related to a given collection",
    inputSchema: { id: z.string().describe("Collection ID") },
  },
  getCollectionRelated,
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

server.registerTool(
  "get_topic",
  {
    description: "Fetch a single Unsplash topic by ID or slug",
    inputSchema: { id_or_slug: z.string().describe("Topic ID or slug") },
  },
  getTopic,
)

// ─── Users ───

server.registerTool(
  "get_user",
  {
    description: "Fetch a user's public profile by username",
    inputSchema: { username: z.string().describe("Unsplash username") },
  },
  getUser,
)

server.registerTool(
  "get_user_photos",
  {
    description: "List the photos published by a user",
    inputSchema: {
      username: z.string().describe("Unsplash username"),
      page: z.number().int().min(1).default(1).describe("Page number"),
      per_page: z
        .number()
        .int()
        .min(1)
        .max(30)
        .default(10)
        .describe("Results per page (max 30)"),
      order_by: z
        .enum(["latest", "oldest", "popular", "views", "downloads"])
        .optional()
        .describe("Sort order"),
      orientation: orientationSchema,
    },
  },
  getUserPhotos,
)

server.registerTool(
  "get_user_collections",
  {
    description: "List the collections curated by a user",
    inputSchema: {
      username: z.string().describe("Unsplash username"),
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
  getUserCollections,
)

server.registerTool(
  "get_user_statistics",
  {
    description: "Fetch download/view/like statistics for a user",
    inputSchema: {
      username: z.string().describe("Unsplash username"),
      resolution: z
        .enum(["days"])
        .default("days")
        .describe("Time resolution for historical values"),
      quantity: z
        .number()
        .int()
        .min(1)
        .max(30)
        .default(30)
        .describe("Number of historical data points (max 30)"),
    },
  },
  getUserStatistics,
)

server.registerTool(
  "search_users",
  {
    description: "Search Unsplash users by keyword",
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
    },
  },
  searchUsers,
)

// ─── Stats ───

server.registerTool(
  "get_stats_total",
  {
    description: "Fetch Unsplash's all-time total platform statistics",
    inputSchema: {},
  },
  getStatsTotal,
)

server.registerTool(
  "get_stats_month",
  {
    description: "Fetch Unsplash's platform statistics for the past month",
    inputSchema: {
      resolution: z
        .enum(["days"])
        .default("days")
        .describe("Time resolution for historical values"),
      quantity: z
        .number()
        .int()
        .min(1)
        .max(30)
        .default(30)
        .describe("Number of historical data points (max 30)"),
    },
  },
  getStatsMonth,
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
