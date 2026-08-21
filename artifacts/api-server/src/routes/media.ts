import { Router, type IRouter, type Request, type Response } from "express";
import { consume, ConsumetError } from "../lib/consumet";

const router: IRouter = Router();

const providers = {
  anime: "gogoanime",
  manga: "mangadex",
  movie: "flixhq",
  tv: "flixhq",
} as const;

type MediaType = keyof typeof providers;
type RequestWithLog = Request & { log?: { warn: (data: unknown, message: string) => void } };

function param(req: Request, name: string) {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

function clean(value: unknown, name: string) {
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${name} is required`);
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }
  return value.trim();
}

function providerFor(type: MediaType, value: unknown) {
  const provider = typeof value === "string" && value.trim() ? value.trim() : providers[type];
  return encodeURIComponent(provider);
}

async function proxy(req: RequestWithLog, res: Response, path: string) {
  try {
    const data = await consume(path);
    res.json(data);
  } catch (error) {
    const status = error instanceof ConsumetError ? error.statusCode : 400;
    if (status >= 500) req.log?.warn({ err: error, path }, "Media provider request failed");
    const message = error instanceof Error ? error.message : "Invalid request";
    res.status(status).json({ error: message });
  }
}

function mediaRoute(type: MediaType, suffix: string, idName: string) {
  return async (req: RequestWithLog, res: Response): Promise<void> => {
    try {
      const id = encodeURIComponent(clean(param(req, idName), idName));
      const provider = providerFor(type, req.query.provider);
      await proxy(req, res, `/${type}/${provider}${suffix.replace(":id", id)}`);
    } catch (error) {
      const status = (error as Error & { statusCode?: number }).statusCode ?? 400;
      res.status(status).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  };
}

router.get("/catalog", (_req, res) => {
  res.json({
    name: "Consumet Media API",
    version: "1.0.0",
    media: ["anime", "manga", "movie", "tv"],
    providers,
    endpoints: {
      search: "GET /api/{media}/search/:query",
      info: "GET /api/{media}/info/:id",
      episodes: "GET /api/{media}/episodes/:id",
      stream: "GET /api/{media}/stream/:episodeId",
    },
  });
});

for (const type of Object.keys(providers) as MediaType[]) {
  router.get(`/${type}/search/:query`, async (req: RequestWithLog, res) => {
    const provider = providerFor(type, req.query.provider);
    await proxy(req, res, `/${type}/${provider}/${encodeURIComponent(clean(req.params.query, "query"))}`);
  });

  router.get(`/${type}/info/:id`, mediaRoute(type, "/info/:id", "id"));
  router.get(`/${type}/seasons/:id`, mediaRoute(type, "/info/:id", "id"));
  router.get(`/${type}/episodes/:id`, mediaRoute(type, "/info/:id", "id"));
  router.get(`/${type}/chapters/:id`, mediaRoute(type, "/info/:id", "id"));
  router.get(`/${type}/episode/:id`, mediaRoute(type, "/watch/:id", "id"));
  router.get(`/${type}/stream/:id`, mediaRoute(type, "/watch/:id", "id"));
  router.get(`/${type}/watch/:id`, mediaRoute(type, "/watch/:id", "id"));
  router.get(`/${type}/servers/:id`, mediaRoute(type, "/servers/:id", "id"));
}

// Compatibility routes matching the upstream Consumet URL shape:
// /api/anime/gogoanime/searchTerm, /api/anime/gogoanime/info/id, etc.
router.get("/:type/:provider/:query", async (req: RequestWithLog, res) => {
  const type = param(req, "type");
  if (!["anime", "manga", "movie", "tv"].includes(type)) {
    res.status(404).json({ error: "Unknown media type" });
    return;
  }
  await proxy(req, res, `/${type}/${encodeURIComponent(param(req, "provider"))}/${encodeURIComponent(param(req, "query"))}`);
});

router.get("/:type/:provider/info/:id", async (req: RequestWithLog, res) => {
  const type = param(req, "type");
  if (!["anime", "manga", "movie", "tv"].includes(type)) {
    res.status(404).json({ error: "Unknown media type" });
    return;
  }
  await proxy(req, res, `/${type}/${encodeURIComponent(param(req, "provider"))}/info/${encodeURIComponent(param(req, "id"))}`);
});

router.get("/:type/:provider/watch/:id", async (req: RequestWithLog, res) => {
  const type = param(req, "type");
  if (!["anime", "manga", "movie", "tv"].includes(type)) {
    res.status(404).json({ error: "Unknown media type" });
    return;
  }
  await proxy(req, res, `/${type}/${encodeURIComponent(param(req, "provider"))}/watch/${encodeURIComponent(param(req, "id"))}`);
});

export default router;