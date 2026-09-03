const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  let token = req.headers['authorization'];
  if (!token) return res.status(403).json({ message: 'No token provided' });

  // Handle standard "Bearer <token>" prefix gracefully if provided
  if (token.startsWith('Bearer ') || token.startsWith('bearer ')) {
    token = token.slice(7).trim();
  }

  const secret = process.env.JWT_SECRET || 'antigravity_jwt_super_secure_secret_key_2026';

  jwt.verify(token, secret, (err, decoded) => {
    if (err) return res.status(500).json({ message: 'Failed to authenticate token' });
    req.userId = decoded.id;
    next();
  });
};

module.exports = verifyToken;
