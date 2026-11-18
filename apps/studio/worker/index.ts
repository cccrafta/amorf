// Studio Worker: the Access check on every request, then the API under /api and the SPA assets.
import { Hono } from "hono";
import { accessEmail, type AccessEnv } from "./access";
import { entities } from "./entities";

export type Env = AccessEnv & {
  ASSETS: Fetcher;
  MEDIA: R2Bucket;
  ARCHIVE: R2Bucket;
};

export type App = { Bindings: Env; Variables: { email: string } };

const app = new Hono<App>();

app.use("*", async (c, next) => {
  const email = await accessEmail(c.req.raw, c.env);
  if (!email) return c.text("Forbidden", 403);
  c.set("email", email);
  await next();
});

app.get("/api/me", (c) => c.json({ email: c.get("email") }));
app.route("/api/entities", entities);
app.all("/api/*", (c) => c.json({ error: "not found" }, 404));
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
