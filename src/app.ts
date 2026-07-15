import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import fs from "node:fs";
import path from "node:path";

app.use("/api", router);

// Serve static assets in production
const isProd = process.env.NODE_ENV === "production";
if (isProd) {
  const distPaths = [
    path.resolve(process.cwd(), "dist"),
    path.resolve(process.cwd(), "..", "dist"),
    path.resolve(__dirname, "../../dist"),
    path.resolve(__dirname, "../dist")
  ];

  let resolvedDist = "";
  for (const p of distPaths) {
    if (fs.existsSync(path.join(p, "index.html"))) {
      resolvedDist = p;
      break;
    }
  }

  if (resolvedDist) {
    logger.info({ path: resolvedDist }, "Serving static files from");
    app.use(express.static(resolvedDist));
    app.get("/*splat", (req, res) => {
      res.sendFile(path.join(resolvedDist, "index.html"));
    });
  } else {
    logger.warn("Static assets directory (dist) not found");
  }
}

export default app;
