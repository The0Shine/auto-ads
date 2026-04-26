/**
 * Simulate real Ads API behavior:
 * - Network latency
 * - Rate limiting
 * - Random transient errors
 */

module.exports = async function simulate(req, res, next) {
  try {
    // ⏱️ 1. Simulate network delay (100ms – 300ms)
    const delay = 100 + Math.random() * 200;
    await new Promise((r) => setTimeout(r, delay));

    // 🚫 2. Simulate rate limit (~5%)
    if (Math.random() < 0.05) {
      return res.status(429).json({
        error: {
          message: "User request limit reached",
          type: "OAuthException",
          code: 17,
          fbtrace_id: generateTraceId(),
        },
      });
    }

    // ⚠️ 3. Simulate random API error (~2%)
    if (Math.random() < 0.02) {
      return res.status(500).json({
        error: {
          message: "Internal server error",
          type: "FacebookApiException",
          code: 1,
          fbtrace_id: generateTraceId(),
        },
      });
    }

    // ✅ Pass request forward
    next();
  } catch (err) {
    next(err);
  }
};

// Generate fake trace ID giống Facebook
function generateTraceId() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}
