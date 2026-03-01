import rateLimit from 'express-rate-limit';

const getIpKey = (ip: string | undefined): string => {
  if (!ip) {
    return 'unknown-ip';
  }

  const normalized = ip.trim();
  if (normalized.startsWith('::ffff:')) {
    return normalized.replace('::ffff:', '');
  }

  return normalized;
};

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1200, // Limit each IP to 1200 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getIpKey(req.ip),
  skip: (req) => req.path === '/health',
});

// Cart-specific rate limiter
export const cartLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 cart operations per minute
  message: 'Too many cart operations, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getIpKey(req.ip),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getIpKey(req.ip),
});

export const riderLocationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  message: 'Too many location updates. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getIpKey(req.ip),
});