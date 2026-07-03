import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"

vi.hoisted(() => {
  process.env.UNSPLASH_ACCESS_KEY = "test-access-key"
})

import {
  searchPhotos,
  randomPhoto,
  getPhoto,
  listCollections,
  getCollection,
  getCollectionPhotos,
  listTopics,
  getTopicPhotos,
} from "../index.js"

const mockFetch = vi.fn()

beforeAll(() => {
  vi.stubGlobal("fetch", mockFetch)
})

beforeEach(() => {
  mockFetch.mockReset()
})

const res = (data: unknown) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response)

const failRes = () =>
  Promise.resolve({
    ok: false,
    status: 500,
    json: () => Promise.resolve({}),
  } as Response)

const text = (result: { content: Array<{ text: string }> }) =>
  result.content[0].text

const samplePhoto = {
  id: "abc123",
  created_at: "2024-01-01T00:00:00Z",
  description: null,
  alt_description: "a mountain",
  width: 4000,
  height: 3000,
  color: "#0a0a0a",
  likes: 42,
  downloads: 100,
  urls: {
    raw: "https://images.unsplash.com/raw",
    full: "https://images.unsplash.com/full",
    regular: "https://images.unsplash.com/regular",
    small: "https://images.unsplash.com/small",
    thumb: "https://images.unsplash.com/thumb",
  },
  links: {
    html: "https://unsplash.com/photos/abc123",
    download_location: "https://api.unsplash.com/photos/abc123/download",
  },
  user: {
    username: "janedoe",
    name: "Jane Doe",
    links: { html: "https://unsplash.com/@janedoe" },
  },
  exif: { make: "Canon" },
  location: { city: "Paris", country: "France" },
}

const sampleCollection = {
  id: "coll1",
  title: "Nature",
  description: "Nature photos",
  total_photos: 12,
  cover_photo: samplePhoto,
  user: samplePhoto.user,
  links: { html: "https://unsplash.com/collections/coll1" },
}

const sampleTopic = {
  id: "topic1",
  slug: "nature",
  title: "Nature",
  description: "Nature topic",
  total_photos: 99,
  cover_photo: samplePhoto,
  links: { html: "https://unsplash.com/t/nature" },
}

describe("searchPhotos", () => {
  it("returns trimmed results on success", async () => {
    mockFetch.mockReturnValue(
      res({ total: 1, total_pages: 1, results: [samplePhoto] }),
    )
    const result = await searchPhotos({ query: "mountains" })
    expect(text(result)).toContain("a mountain")
    expect(text(result)).toContain("janedoe")
    expect(mockFetch.mock.calls[0][0]).toContain("/search/photos")
    expect(mockFetch.mock.calls[0][0]).toContain("query=mountains")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await searchPhotos({ query: "mountains" })
    expect(text(result)).toContain("Error:")
  })
})

describe("randomPhoto", () => {
  it("returns a single trimmed photo on success", async () => {
    mockFetch.mockReturnValue(res(samplePhoto))
    const result = await randomPhoto({})
    expect(text(result)).toContain("abc123")
    expect(mockFetch.mock.calls[0][0]).toContain("/photos/random")
  })

  it("returns trimmed list when count is provided", async () => {
    mockFetch.mockReturnValue(res([samplePhoto]))
    const result = await randomPhoto({ count: 3 })
    expect(text(result)).toContain("abc123")
    expect(mockFetch.mock.calls[0][0]).toContain("count=3")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await randomPhoto({})
    expect(text(result)).toContain("Error:")
  })
})

describe("getPhoto", () => {
  it("returns full trimmed photo and tracks the download", async () => {
    mockFetch.mockReturnValueOnce(res(samplePhoto))
    mockFetch.mockReturnValueOnce(res({}))
    const result = await getPhoto({ id: "abc123" })
    expect(text(result)).toContain("Canon")
    expect(text(result)).toContain("Paris")
    expect(mockFetch.mock.calls[0][0]).toContain("/photos/abc123")
    expect(mockFetch.mock.calls[1][0]).toBe(
      "https://api.unsplash.com/photos/abc123/download",
    )
  })

  it("does not fail the tool call when download tracking fails", async () => {
    mockFetch.mockReturnValueOnce(res(samplePhoto))
    mockFetch.mockImplementationOnce(() =>
      Promise.reject(new Error("network down")),
    )
    const result = await getPhoto({ id: "abc123" })
    expect(text(result)).toContain("abc123")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await getPhoto({ id: "abc123" })
    expect(text(result)).toContain("Error:")
  })
})

describe("listCollections", () => {
  it("returns trimmed collections on success", async () => {
    mockFetch.mockReturnValue(res([sampleCollection]))
    const result = await listCollections({})
    expect(text(result)).toContain("Nature")
    expect(mockFetch.mock.calls[0][0]).toContain("/collections")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await listCollections({})
    expect(text(result)).toContain("Error:")
  })
})

describe("getCollection", () => {
  it("returns a trimmed collection on success", async () => {
    mockFetch.mockReturnValue(res(sampleCollection))
    const result = await getCollection({ id: "coll1" })
    expect(text(result)).toContain("Nature")
    expect(mockFetch.mock.calls[0][0]).toContain("/collections/coll1")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await getCollection({ id: "coll1" })
    expect(text(result)).toContain("Error:")
  })
})

describe("getCollectionPhotos", () => {
  it("returns trimmed photos on success", async () => {
    mockFetch.mockReturnValue(res([samplePhoto]))
    const result = await getCollectionPhotos({ id: "coll1" })
    expect(text(result)).toContain("abc123")
    expect(mockFetch.mock.calls[0][0]).toContain("/collections/coll1/photos")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await getCollectionPhotos({ id: "coll1" })
    expect(text(result)).toContain("Error:")
  })
})

describe("listTopics", () => {
  it("returns trimmed topics on success", async () => {
    mockFetch.mockReturnValue(res([sampleTopic]))
    const result = await listTopics({})
    expect(text(result)).toContain("nature")
    expect(mockFetch.mock.calls[0][0]).toContain("/topics")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await listTopics({})
    expect(text(result)).toContain("Error:")
  })
})

describe("getTopicPhotos", () => {
  it("returns trimmed photos on success", async () => {
    mockFetch.mockReturnValue(res([samplePhoto]))
    const result = await getTopicPhotos({ id_or_slug: "nature" })
    expect(text(result)).toContain("abc123")
    expect(mockFetch.mock.calls[0][0]).toContain("/topics/nature/photos")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await getTopicPhotos({ id_or_slug: "nature" })
    expect(text(result)).toContain("Error:")
  })
})
