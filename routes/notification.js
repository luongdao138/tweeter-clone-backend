const router = require('express').Router();
const validateUser = require('../middlewares/verifyToken');
const Notification = require('../models/Notification');
const User = require('../models/User');

router.post('/', async (req, res) => {
  try {
    const { sender, tweet_id, receiver, type } = req.body;
    const user_sender = await User.findById(sender, '_id display_name photo');
    const user_receiver = await User.findById(
      receiver,
      '_id is_online socket_id'
    );

    let newNotification = new Notification({
      sender,
      tweet_id,
      type,
      receiver,
    });
    newNotification = await newNotification.save();
    newNotification = {
      ...newNotification._doc,
      sender: {
        _id: user_sender._id,
        display_name: user_sender.display_name,
        photo: user_sender.photo,
      },
      receiver: {
        _id: user_receiver._id,
        display_name: user_receiver.display_name,
        photo: user_receiver.photo,
      },
    };

    return res.json(newNotification);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Internal server error!',
    });
  }
});

router.use(validateUser);
router.get('/', async (req, res) => {
  try {
    const user = req.user;
    let limit = req.query.limit ? Number(req.query.limit) : 100;
    let skip = req.query.skip ? Number(req.query.skip) : 0;

    const notifications = await Notification.find({
      receiver: user._id,
    })
      .populate({
        path: 'sender',
        model: User,
        select: '_id display_name photo',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total_results = await Notification.find({
      receiver: user._id,
    }).countDocuments();

    return res.json({
      notifications,
      pagination: {
        skip,
        limit,
        total_results,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Internal server error!',
    });
  }
});

router.patch('/reset', async (req, res) => {
  try {
    let user = req.user;
    user.notifications_count = 0;
    await user.save();
    return res.json('Reset successfully!');
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Internal server error!',
    });
  }
});

module.exports = router;
