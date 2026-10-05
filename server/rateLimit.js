// Minimal in-memory, per-IP sliding-window rate limiter. Good enough for a
// single server process; swap for a shared store if this ever runs on several.
function createRateLimiter({ windowMs, max, message }) {
    const hits = new Map();

    setInterval(() => {
        const now = Date.now();
        for (const [ip, timestamps] of hits) {
            if (!timestamps.some((t) => now - t < windowMs)) hits.delete(ip);
        }
    }, windowMs).unref();

    return function rateLimit(req, res, next) {
        const now = Date.now();
        const timestamps = (hits.get(req.ip) || []).filter((t) => now - t < windowMs);
        timestamps.push(now);
        hits.set(req.ip, timestamps);
        if (timestamps.length > max) {
            return res.status(429).json({ success: false, message });
        }
        next();
    };
}

module.exports = createRateLimiter;
