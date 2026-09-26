const crypto = require('crypto');

const AUTH_SECRET = process.env.ARCADE_AUTH_SECRET || 'arcade-vault-v2-master-key-salt-987';

/**
 * Signs a player ID to prevent client spoofing of player identities.
 */
function signPlayerId(playerId) {
  const hmac = crypto.createHmac('sha256', AUTH_SECRET);
  hmac.update(playerId);
  return hmac.digest('hex').substring(0, 16);
}

/**
 * Creates an authentic guest token for anonymous players.
 */
function createGuestToken(customId = null) {
  const id = customId || `p_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
  const sig = signPlayerId(id);
  return {
    playerId: id,
    token: `${id}.${sig}`
  };
}

/**
 * Verifies and decodes a guest token.
 */
function verifyGuestToken(tokenString) {
  if (!tokenString || typeof tokenString !== 'string') return null;
  const parts = tokenString.split('.');
  if (parts.length !== 2) return null;
  const [playerId, sig] = parts;
  const expected = signPlayerId(playerId);
  if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return playerId;
  }
  return null;
}

/**
 * Safely decodes base64url JSON (e.g. Netlify Identity JWT payload)
 */
function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    const payload = JSON.parse(json);
    // Check expiration if present
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }
    return payload;
  } catch (_e) {
    return null;
  }
}

/**
 * Resolves player identity from request headers (Netlify Identity Bearer token, Guest token, or query).
 */
function resolvePlayer(req) {
  const authHeader = req.headers.authorization || '';
  const tokenHeader = req.headers['x-player-token'] || '';

  // 1. Try Bearer JWT (Netlify Identity)
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    // Check if it's a Netlify JWT
    const jwtPayload = decodeJwtPayload(token);
    if (jwtPayload && jwtPayload.sub) {
      return {
        id: `net_${jwtPayload.sub}`,
        authType: 'netlify',
        email: jwtPayload.email || '',
        name: jwtPayload.user_metadata?.full_name || ''
      };
    }
    // Check if it's our signed guest token
    const guestId = verifyGuestToken(token);
    if (guestId) {
      return {
        id: guestId,
        authType: 'guest'
      };
    }
  }

  // 2. Try x-player-token header
  if (tokenHeader) {
    const guestId = verifyGuestToken(tokenHeader);
    if (guestId) {
      return {
        id: guestId,
        authType: 'guest'
      };
    }
  }

  return null;
}

/**
 * Express middleware requiring valid player authentication.
 */
function requireAuth(req, res, next) {
  const player = resolvePlayer(req);
  if (!player) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Valid authentication token required'
      }
    });
  }
  req.player = player;
  next();
}

/**
 * Express middleware permitting optional player authentication.
 */
function optionalAuth(req, _res, next) {
  req.player = resolvePlayer(req);
  next();
}

module.exports = {
  createGuestToken,
  verifyGuestToken,
  resolvePlayer,
  requireAuth,
  optionalAuth
};
