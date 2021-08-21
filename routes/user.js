const router = require('express').Router();
const validateUser = require('../middlewares/verifyToken');
const upload = require('../middlewares/upload');
const bcrypt = require('bcryptjs');
const imageHelper = require('../helpers/cloudinary');
const convertTo64 = require('../helpers/convertToBase64');
const User = require('../models/User');
const User_Detail = require('../models/User_Detail');

router.use(validateUser);

router.get('/tweetAction/:tweet_id', async (req, res) => {
  try {
    const { tweet_id } = req.params;
    const { type } = req.query;
    const user = req.user;
    let limit = req.query.limit ? Number(req.query.limit) : 20;
    let skip = req.query.skip ? Number(req.query.skip) : 0;
    const loggedIn_user_detail = await User_Detail.findOne(
      { user: user._id },
      '_id following'
    );
    let details = [];
    let total_results = 0;

    switch (type) {
      case 'like':
        details = await User_Detail.find(
          {
            likes: tweet_id,
          },
          '_id user'
        ).populate({
          path: 'user',
          model: User,
          select: '_id followers_count display_name photo bio is_online',
          options: {
            sort: { followers_count: -1, createdAt: -1 },
            limit,
            skip,
          },
        });
        total_results = await User_Detail.find({
          likes: tweet_id,
        }).countDocuments();
        break;
      case 'saved':
        details = await User_Detail.find(
          {
            saved: tweet_id,
          },
          '_id user'
        ).populate({
          path: 'user',
          model: User,
          select: '_id followers_count display_name photo bio is_online',
          options: {
            sort: { followers_count: -1, createdAt: -1 },
            limit,
            skip,
          },
        });
        total_results = await User_Detail.find({
          saved: tweet_id,
        }).countDocuments();
        break;
      case 'retweet':
        details = await User_Detail.find(
          {
            'retweets.tweet': tweet_id,
          },
          '_id user'
        ).populate({
          path: 'user',
          model: User,
          select: '_id followers_count display_name photo bio is_online',
          options: {
            sort: { followers_count: -1, createdAt: -1 },
            limit,
            skip,
          },
        });
        total_results = await User_Detail.find({
          'retweets.tweet': tweet_id,
        }).countDocuments();
        break;
      default:
        break;
    }
    let users = details.map((d) => d.user._doc);
    users.forEach((u) => {
      const isFollow = loggedIn_user_detail.following.some(
        (x) => x.toString() === u._id.toString()
      );
      u.isFollow = isFollow;
    });
    return res.json({
      users,
      pagination: {
        total_results,
        skip,
        limit,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Internal server error!',
    });
  }
});

router.get('/follow/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { type } = req.query;
    let limit = req.query.limit ? Number(req.query.limit) : 20;
    let skip = req.query.skip ? Number(req.query.skip) : 0;

    const user_detail = await User_Detail.findOne(
      { user: id },
      '_id following followers'
    );
    const loggedIn_user_detail = await User_Detail.findOne(
      { user: user._id },
      '_id following'
    );
    let data;
    let total_results = 0;

    data = await User.find(
      {
        _id: {
          $in:
            type === 'following'
              ? user_detail.following
              : user_detail.followers,
        },
      },
      '_id followers_count display_name photo bio is_online'
    )
      .sort({ followers_count: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    total_results =
      type === 'following'
        ? user_detail.following.length
        : user_detail.followers.length;

    data = data.map((x) => x._doc);
    data.forEach((u) => {
      const isFollow = loggedIn_user_detail.following.some(
        (x) => x.toString() === u._id.toString()
      );
      u.isFollow = isFollow;
    });
    return res.json({
      users: data,
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

router.get('/recommendFollow', async (req, res) => {
  try {
    const user = req.user;
    const user_detail = await User_Detail.findOne(
      { user: user._id },
      '_id following'
    );
    let users = await User.find(
      {
        _id: {
          $nin: [...user_detail.following, user._id],
        },
      },
      '_id display_name is_online followers_count photo coverPhoto bio'
    )
      .sort({ followers_count: -1, createdAt: -1 })
      .limit(10);
    users = users.map((u) => {
      let x = u._doc;
      x.isFollow = false;
      return x;
    });

    return res.json({ users });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Internal server error!',
    });
  }
});

router.get('/search', async (req, res) => {
  const user = req.user;
  const { q } = req.query;
  let limit = req.query.limit ? Number(req.query.limit) : 20;
  let skip = req.query.skip ? Number(req.query.skip) : 0;
  const user_detail = await User_Detail.findOne(
    { user: user._id },
    '_id following'
  );

  try {
    let users = await User.find(
      {
        display_name: {
          $regex: new RegExp(q, 'i'),
        },
      },
      '_id followers_count display_name photo bio is_online'
    )
      .sort({ followers_count: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total_results = await User.find({
      display_name: {
        $regex: new RegExp(q, 'i'),
      },
    }).countDocuments();
    users = users.map((x) => x._doc);
    users.forEach((u) => {
      const isFollow = user_detail.following.some(
        (x) => x.toString() === u._id.toString()
      );
      u.isFollow = isFollow;
    });
    return res.json({
      users,
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

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    const loggedInUserDetail = await User_Detail.findOne(
      { user: req.user._id },
      '_id following'
    );
    const isFollow = loggedInUserDetail.following.some(
      (x) => x.toString() === id.toString()
    );
    const result = { ...user._doc, isFollow };
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      message: 'Server error',
    });
  }
});

router.get('/', (req, res) => {
  // req.headers
  return res.json(req.user);
});

router.patch('/', upload('single', 'photo'), async (req, res) => {
  const photo = req.file;
  const { display_name, bio, phone, password } = req.body;
  const user_id = req.user._id;

  try {
    let updateUser = { display_name, bio, phone };
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashPw = await bcrypt.hash(password, salt);
      updateUser.password = hashPw;
    }

    if (photo) {
      const base64 = convertTo64(photo);
      const { secure_url, public_id } = await imageHelper.upload(
        base64.content
      );
      updateUser.photo = secure_url;
    }

    let user = await User.findByIdAndUpdate(
      user_id,
      {
        $set: updateUser,
      },
      { new: true }
    );
    return res.json(user);
  } catch (error) {
    return res.json({
      message: 'Cannot update user!',
    });
  }
});

router.patch('/follow', async (req, res) => {
  try {
    const user = req.user;
    const { follow_id } = req.body;

    const user_detail = await User_Detail.findOne({ user: user._id });
    const follow_user_detail = await User_Detail.findOne({ user: follow_id });
    const index = follow_user_detail.followers.findIndex(
      (x) => x.toString() === user._id.toString()
    );

    if (index !== -1) {
      // already follow -> unfollow
      follow_user_detail.followers.splice(index, 1);
      user_detail.following = user_detail.following.filter(
        (x) => x.toString() !== follow_id.toString()
      );
    } else {
      // not follow -> follow
      follow_user_detail.followers.push(user._id);
      user_detail.following.push(follow_id);
    }
    await user_detail.save();
    await follow_user_detail.save();
    await User.findByIdAndUpdate(user._id, {
      $inc: {
        following_count: index !== -1 ? -1 : 1,
      },
    });
    await User.findByIdAndUpdate(follow_id, {
      $inc: {
        followers_count: index !== -1 ? -1 : 1,
      },
    });
    return res.json({
      message: `${index === -1 ? 'Follow' : 'Unfollow'} successfully!`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Internal server error!',
    });
  }
});

module.exports = router;
