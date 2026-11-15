// Origins allowed to call the API with cookies: FRONTEND_URL and DASHBOARD_URL. Each may hold
// several comma-separated addresses (e.g. a Vercel URL and a custom domain). Values are normalized
// because a trailing "/" or a stray space in the hosting dashboard silently breaks CORS.
const normalize = (value) => value.trim().replace(/\/+$/, "").toLowerCase();

export const allowedOrigins = () =>
  [process.env.FRONTEND_URL, process.env.DASHBOARD_URL]
    .filter(Boolean)
    .flatMap((value) => value.split(","))
    .map(normalize)
    .filter(Boolean);

export const isAllowedOrigin = (origin) => Boolean(origin) && allowedOrigins().includes(normalize(origin));

// For cors() and socket.io: accept listed origins, and requests without an Origin (same-site, curl).
export const corsOrigin = (origin, callback) => callback(null, !origin || isAllowedOrigin(origin));
