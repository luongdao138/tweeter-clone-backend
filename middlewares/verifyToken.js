const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = (req, res, next) => {
  const authorization = req.header('Authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const authToken = authorization.replace('Bearer ', '');

  jwt.verify(
    authToken,
    process.env.CLIENT_SECRET,
    async (error, decodedToken) => {
      if (error) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const { _id } = decodedToken;
      try {
        const user = await User.findById(_id);
        if (user) {
          req.user = user;
          next();
        } else {
          return res.status(401).json({ message: 'Unauthorized' });
        }
      } catch (error) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
    }
  );
};
