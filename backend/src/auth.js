export function apiKey(req, res, next) {
  const key = process.env.API_KEY;
  const incoming = req.headers["x-api-key"];

  if (!key) return next();
  if (incoming === key) return next();

  return res.status(401).json({ error: "Unauthorized" });
}
