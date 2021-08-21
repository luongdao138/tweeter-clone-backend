const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User_Detail = require('../models/User_Detail');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({
        message: 'Email or password is not correct!',
      });

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid)
      return res.status(400).json({
        message: 'Email or password is not correct!',
      });

    const token = jwt.sign({ _id: user._id }, process.env.CLIENT_SECRET);
    return res.json({ token, user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Login failed!',
    });
  }
});
router.post('/signup', async (req, res) => {
  const { email, password, display_name } = req.body;
  let user = await User.findOne({ email });
  if (user)
    return res.status(400).json({
      message: 'Email already taken!',
    });

  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(password, salt);
  user = new User({
    email,
    password: hashPassword,
    display_name,
  });
  user = await user.save();
  let user_detail = new User_Detail({
    user: user._id,
  });
  await user_detail.save();
  const token = jwt.sign({ _id: user._id }, process.env.CLIENT_SECRET);
  return res.json({ token, user });
});

module.exports = router;
