const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev_secret';

function auth(requiredRole = null) {
  return function (req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const token = authHeader.split(' ')[1];
      const user = jwt.verify(token, SECRET);
      if (requiredRole && user.role !== requiredRole) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      req.user = user;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

module.exports = auth;
