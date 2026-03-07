/**
 * Simple in-memory rate limiting for API routes
 * Note: For production with multiple instances, use Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

// Default configs for different route types
export const RATE_LIMITS = {
  standard: { windowMs: 60 * 1000, maxRequests: 60 },      // 60 req/min
  expensive: { windowMs: 60 * 1000, maxRequests: 10 },     // 10 req/min (PDF gen, email)
  export: { windowMs: 60 * 1000, maxRequests: 5 },         // 5 req/min (CSV export)
  write: { windowMs: 60 * 1000, maxRequests: 30 },         // 30 req/min (POST/PATCH)
} as const;

/**
 * Get client identifier from request
 */
export function getClientId(request: Request): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0]?.trim() || 'unknown';
  return ip;
}

/**
 * Check rate limit and return result
 */
export function checkRateLimit(
  clientId: string,
  routeKey: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetIn: number } {
  const key = `${routeKey}:${clientId}`;
  const now = Date.now();
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetTime < now) {
    // Create new window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    };
  }
  
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    };
  }
  
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  };
}

/**
 * Create rate limit exceeded response
 */
export function rateLimitResponse(resetIn: number): Response {
  return new Response(
    JSON.stringify({ 
      error: 'Too many requests', 
      retryAfter: Math.ceil(resetIn / 1000) 
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(resetIn / 1000)),
      },
    }
  );
}
