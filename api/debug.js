// Temporary diagnostic — reveals env var PRESENCE and LENGTH only, never values.
// Remove this file once we've confirmed the env vars are wired up.
export default function handler(req, res) {
  const ap = process.env.ACCESS_PASSWORD;
  const gh = process.env.GH_TOKEN;
  res.status(200).json({
    ACCESS_PASSWORD: {
      set: typeof ap === 'string' && ap.length > 0,
      length: typeof ap === 'string' ? ap.length : 0,
      first_char: typeof ap === 'string' && ap.length > 0 ? ap[0] : null,
      last_char: typeof ap === 'string' && ap.length > 0 ? ap[ap.length - 1] : null,
    },
    GH_TOKEN: {
      set: typeof gh === 'string' && gh.length > 0,
      length: typeof gh === 'string' ? gh.length : 0,
      starts_with: typeof gh === 'string' ? gh.slice(0, 11) : null,
    },
    deployed_at: new Date().toISOString(),
  });
}
