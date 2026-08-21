# Consumet Media API

A small, production-minded proxy around the public Consumet provider API. It
gives clients one stable API for anime, manga, movies, TV shows, music, and
books.

## Quick start

```bash
pnpm --filter @workspace/api-server run dev
```

The server is mounted below `/api`. The upstream can be changed with
`CONSUMET_BASE_URL`; by default it uses `https://api.consumet.org`.

## Routes

| Route | Purpose |
| --- | --- |
| `GET /api/catalog` | Supported categories, default providers, and route hints |
| `GET /api/demo/source` | Legal CC0 MP4 source for testing a video player |
| `GET /api/{media}/search/{query}` | Search anime, manga, movies, or TV |
| `GET /api/{media}/info/{id}` | Metadata and seasons/episodes/chapters |
| `GET /api/{media}/seasons/{id}` | Season-compatible alias for provider details |
| `GET /api/{media}/episodes/{id}` | Episode/chapter-compatible alias for info |
| `GET /api/{media}/episode/{id}` | Episode-compatible alias for playback |
| `GET /api/{media}/servers/{id}` | Available streaming servers |
| `GET /api/{media}/stream/{id}` | Playback sources for an episode |
| `GET /api/{media}/watch/{id}` | Upstream-compatible playback alias |
| `GET /api/movies/{provider}/{query}` | Movie search with the documented plural route |
| `GET /api/movies/{provider}/info?id={id}` | Movie details |
| `GET /api/movies/{provider}/watch?episodeId={id}` | Movie/TV playback sources |
| `GET /api/movies/{provider}/download?episodeId={id}` | Download-style source alias |
| `GET /api/music/{provider}/{query}` | Song, artist, or album search |
| `GET /api/books/{provider}/{query}` | Book search |

`media` is one of `anime`, `manga`, `movie`, or `tv`. Add
`?provider=<provider>` to override the defaults (`gogoanime`, `mangadex`, and
`flixhq`).

Pass `?unified=true` to any search, details, or playback route to receive:

```json
{
  "success": true,
  "mediaType": "movie",
  "provider": "flixhq",
  "data": {}
}
```

For clients already using the upstream Consumet URL shape, these also work:

```text
/api/anime/gogoanime/naruto
/api/anime/gogoanime/info/naruto-123
/api/anime/gogoanime/watch/naruto-123-episode-1
```

Responses are passed through from the provider so episode lists, seasons,
chapters, subtitles, and stream source fields remain available. Successful
GET responses are cached in memory for 30 seconds and provider requests time
out after 12 seconds.

Only use sources and media you have the right to access and distribute.