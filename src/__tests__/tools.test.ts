import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"

vi.hoisted(() => {
  process.env.MCP_UNSPLASH_ACCESS_KEY = "test-access-key"
})

import {
  listPhotos,
  searchPhotos,
  randomPhoto,
  getPhoto,
  getPhotoStatistics,
  listCollections,
  getCollection,
  getCollectionPhotos,
  searchCollections,
  getCollectionRelated,
  listTopics,
  getTopicPhotos,
  getTopic,
  getUser,
  getUserPhotos,
  getUserCollections,
  getUserStatistics,
  searchUsers,
  getStatsTotal,
  getStatsMonth,
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

const sampleUser = {
  id: "user1",
  username: "janedoe",
  name: "Jane Doe",
  bio: "Photographer",
  location: "Paris",
  total_photos: 10,
  total_likes: 20,
  total_collections: 3,
  links: { html: "https://unsplash.com/@janedoe" },
}

const sampleStatMetric = {
  total: 100,
  historical: {
    change: 5,
    resolution: "days",
    quantity: 30,
    values: [{ date: "2024-01-01", value: 10 }],
  },
}

const samplePhotoStatistics = {
  id: "abc123",
  downloads: sampleStatMetric,
  views: sampleStatMetric,
  likes: sampleStatMetric,
}

const sampleUserStatistics = {
  username: "janedoe",
  downloads: sampleStatMetric,
  views: sampleStatMetric,
  likes: sampleStatMetric,
}

const sampleTotalStats = {
  photos: 1,
  downloads: 2,
  views: 3,
  likes: 4,
  photographers: 5,
  pixels: 6,
  downloads_per_second: 7,
  views_per_second: 8,
  developers: 9,
}

const sampleMonthStats = {
  downloads: 1,
  views: 2,
  likes: 3,
  new_photos: 4,
  new_photographers: 5,
  new_pixels: 6,
  new_developers: 7,
  new_applications: 8,
  new_requests: 9,
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

describe("listPhotos", () => {
  it("returns trimmed photos on success", async () => {
    mockFetch.mockReturnValue(res([samplePhoto]))
    const result = await listPhotos({})
    expect(text(result)).toContain("abc123")
    expect(mockFetch.mock.calls[0][0]).toContain("/photos")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await listPhotos({})
    expect(text(result)).toContain("Error:")
  })
})

describe("getPhotoStatistics", () => {
  it("returns statistics on success", async () => {
    mockFetch.mockReturnValue(res(samplePhotoStatistics))
    const result = await getPhotoStatistics({ id: "abc123" })
    expect(text(result)).toContain("abc123")
    expect(mockFetch.mock.calls[0][0]).toContain("/photos/abc123/statistics")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await getPhotoStatistics({ id: "abc123" })
    expect(text(result)).toContain("Error:")
  })
})

describe("searchCollections", () => {
  it("returns trimmed results on success", async () => {
    mockFetch.mockReturnValue(
      res({ total: 1, total_pages: 1, results: [sampleCollection] }),
    )
    const result = await searchCollections({ query: "nature" })
    expect(text(result)).toContain("Nature")
    expect(mockFetch.mock.calls[0][0]).toContain("/search/collections")
    expect(mockFetch.mock.calls[0][0]).toContain("query=nature")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await searchCollections({ query: "nature" })
    expect(text(result)).toContain("Error:")
  })
})

describe("getCollectionRelated", () => {
  it("returns trimmed collections on success", async () => {
    mockFetch.mockReturnValue(res([sampleCollection]))
    const result = await getCollectionRelated({ id: "coll1" })
    expect(text(result)).toContain("Nature")
    expect(mockFetch.mock.calls[0][0]).toContain("/collections/coll1/related")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await getCollectionRelated({ id: "coll1" })
    expect(text(result)).toContain("Error:")
  })
})

describe("getTopic", () => {
  it("returns a trimmed topic on success", async () => {
    mockFetch.mockReturnValue(res(sampleTopic))
    const result = await getTopic({ id_or_slug: "nature" })
    expect(text(result)).toContain("nature")
    expect(mockFetch.mock.calls[0][0]).toContain("/topics/nature")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await getTopic({ id_or_slug: "nature" })
    expect(text(result)).toContain("Error:")
  })
})

describe("getUser", () => {
  it("returns a trimmed user on success", async () => {
    mockFetch.mockReturnValue(res(sampleUser))
    const result = await getUser({ username: "janedoe" })
    expect(text(result)).toContain("janedoe")
    expect(text(result)).toContain("Paris")
    expect(mockFetch.mock.calls[0][0]).toContain("/users/janedoe")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await getUser({ username: "janedoe" })
    expect(text(result)).toContain("Error:")
  })
})

describe("getUserPhotos", () => {
  it("returns trimmed photos on success", async () => {
    mockFetch.mockReturnValue(res([samplePhoto]))
    const result = await getUserPhotos({ username: "janedoe" })
    expect(text(result)).toContain("abc123")
    expect(mockFetch.mock.calls[0][0]).toContain("/users/janedoe/photos")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await getUserPhotos({ username: "janedoe" })
    expect(text(result)).toContain("Error:")
  })
})

describe("getUserCollections", () => {
  it("returns trimmed collections on success", async () => {
    mockFetch.mockReturnValue(res([sampleCollection]))
    const result = await getUserCollections({ username: "janedoe" })
    expect(text(result)).toContain("Nature")
    expect(mockFetch.mock.calls[0][0]).toContain("/users/janedoe/collections")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await getUserCollections({ username: "janedoe" })
    expect(text(result)).toContain("Error:")
  })
})

describe("getUserStatistics", () => {
  it("returns statistics on success", async () => {
    mockFetch.mockReturnValue(res(sampleUserStatistics))
    const result = await getUserStatistics({ username: "janedoe" })
    expect(text(result)).toContain("janedoe")
    expect(mockFetch.mock.calls[0][0]).toContain("/users/janedoe/statistics")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await getUserStatistics({ username: "janedoe" })
    expect(text(result)).toContain("Error:")
  })
})

describe("searchUsers", () => {
  it("returns trimmed results on success", async () => {
    mockFetch.mockReturnValue(
      res({ total: 1, total_pages: 1, results: [sampleUser] }),
    )
    const result = await searchUsers({ query: "jane" })
    expect(text(result)).toContain("janedoe")
    expect(mockFetch.mock.calls[0][0]).toContain("/search/users")
    expect(mockFetch.mock.calls[0][0]).toContain("query=jane")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await searchUsers({ query: "jane" })
    expect(text(result)).toContain("Error:")
  })
})

describe("getStatsTotal", () => {
  it("returns stats on success", async () => {
    mockFetch.mockReturnValue(res(sampleTotalStats))
    const result = await getStatsTotal()
    expect(text(result)).toContain("photographers")
    expect(mockFetch.mock.calls[0][0]).toContain("/stats/total")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await getStatsTotal()
    expect(text(result)).toContain("Error:")
  })
})

describe("getStatsMonth", () => {
  it("returns stats on success", async () => {
    mockFetch.mockReturnValue(res(sampleMonthStats))
    const result = await getStatsMonth({})
    expect(text(result)).toContain("new_photos")
    expect(mockFetch.mock.calls[0][0]).toContain("/stats/month")
  })

  it("returns error when fetch fails", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await getStatsMonth({})
    expect(text(result)).toContain("Error:")
  })
})
