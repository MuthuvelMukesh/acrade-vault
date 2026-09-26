const VALID_GAMES = new Set([
  'snake',
  'shooter',
  'breaker',
  'tiles2048',
  'memory',
  'reaction',
  'pongvs'
]);

// Game specific scoring models to prevent impossible or cheating submissions
const SCORE_MODELS = {
  snake: {
    min: 0,
    max: 50000,
    isValid(score) {
      return typeof score === 'number' && Number.isInteger(score) && score >= this.min && score <= this.max && score % 10 === 0;
    }
  },
  shooter: {
    min: 0,
    max: 100000,
    isValid(score) {
      return typeof score === 'number' && Number.isInteger(score) && score >= this.min && score <= this.max && score % 10 === 0;
    }
  },
  breaker: {
    min: 0,
    max: 100000,
    isValid(score) {
      return typeof score === 'number' && Number.isInteger(score) && score >= this.min && score <= this.max && score % 100 === 0;
    }
  },
  tiles2048: {
    min: 0,
    max: 500000,
    isValid(score) {
      return typeof score === 'number' && Number.isInteger(score) && score >= this.min && score <= this.max && (score === 0 || score % 2 === 0);
    }
  },
  memory: {
    min: 0,
    max: 800, // Exactly 8 pairs * 100 points
    isValid(score) {
      return typeof score === 'number' && Number.isInteger(score) && score >= this.min && score <= this.max && score % 100 === 0;
    }
  },
  reaction: {
    min: 0,
    max: 1000,
    isValid(score) {
      return typeof score === 'number' && Number.isInteger(score) && score >= this.min && score <= this.max;
    }
  },
  pongvs: {
    min: 0,
    max: 50,
    isValid(score) {
      return typeof score === 'number' && Number.isInteger(score) && score >= this.min && score <= this.max;
    }
  }
};

/**
 * Validates a game ID
 */
function isValidGameId(gameId) {
  return typeof gameId === 'string' && VALID_GAMES.has(gameId.toLowerCase());
}

/**
 * Validates player initials (1-3 alphanumeric uppercase characters)
 */
function sanitizeInitials(initials) {
  if (!initials || typeof initials !== 'string') return 'AAA';
  const clean = initials.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3);
  return clean.length > 0 ? clean : 'AAA';
}

/**
 * Validates a score submission against deterministic game physics rules
 */
function validateScore(gameId, score) {
  if (!isValidGameId(gameId)) {
    return { valid: false, error: 'Unknown game ID' };
  }
  const model = SCORE_MODELS[gameId.toLowerCase()];
  if (!model || !model.isValid(score)) {
    return { valid: false, error: `Invalid score for ${gameId}: out of bounds or impossible score step` };
  }
  return { valid: true };
}

/**
 * Sliding window in-memory rate limiter for serverless containers
 */
class RateLimiter {
  constructor(windowMs = 5000, maxRequests = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.hits = new Map();
  }

  isRateLimited(key) {
    const now = Date.now();
    const timestamps = this.hits.get(key) || [];
    const validTimestamps = timestamps.filter(t => now - t < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      return true;
    }

    validTimestamps.push(now);
    this.hits.set(key, validTimestamps);

    // Occasional cleanup
    if (this.hits.size > 2000) {
      for (const [k, ts] of this.hits.entries()) {
        if (ts.length === 0 || now - ts[ts.length - 1] > this.windowMs) {
          this.hits.delete(k);
        }
      }
    }

    return false;
  }
}

const scoreRateLimiter = new RateLimiter(5000, 5); // Max 5 score submissions per 5 seconds
const apiRateLimiter = new RateLimiter(10000, 60); // Max 60 general requests per 10 seconds

module.exports = {
  VALID_GAMES,
  isValidGameId,
  sanitizeInitials,
  validateScore,
  scoreRateLimiter,
  apiRateLimiter
};
