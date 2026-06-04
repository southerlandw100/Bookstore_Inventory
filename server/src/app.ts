import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import books from "./routes/books.js";


const app = new Hono();

const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((s) => s.trim());

app.use("/*", cors({ origin: corsOrigins }));

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.route("/books", books);

export default app;
