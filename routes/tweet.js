const router = require('express').Router();
const User = require('../models/User');
const Tweet = require('../models/Tweet');
const User_Detail = require('../models/User_Detail');
const validateUser = require('../middlewares/verifyToken');
const upload = require('../middlewares/upload');
const imageHelper = require('../helpers/cloudinary');
const convertTo64 = require('../helpers/convertToBase64');
const Comment = require('../models/Comment');

router.use(validateUser);
router.post('/', upload('single', 'image'), async (req, res) => {
  try {
    const { title, can_reply, gif, tags } = req.body;
    let user = req.user;
    const image = req.file;
    let newTags;

    let newTweet = new Tweet({
      title,
      can_reply,
      user: user._id,
    });
    if (tags) {
      newTags = tags.split(',');
      newTweet.tags = newTags;
    }
    if (gif) {
      newTweet.image = gif;
    }
    if (image) {
      const base64 = convertTo64(image).content;
      const { secure_url } = await imageHelper.upload(base64);
      newTweet.image = secure_url;
    }

    newTweet = await newTweet.save();
    user.tweets_count = user.tweets_count + 1;
    await user.save();
    return res.json({
      ...newTweet._doc,
      user: {
        _id: user._id,
        display_name: user.display_name,
        photo: user.photo,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal server error!',
    });
  }
});

const convertTweets = (tweets, user_detail, user_follows_retweets) => {
  return tweets.map((tweet) => {
    tweet.isLoggedInUserLiked = user_detail.likes.some(
      (x) => x.toString() === tweet._id.toString()
    );
    tweet.isLoggedInUserSaved = user_detail.saved.some(
      (x) => x.toString() === tweet._id.toString()
    );
    tweet.isLoggedInUserRetweeted = user_detail.retweets.some(
      (x) => x.tweet.toString() === tweet._id.toString()
    );

    // const x = user_follows_retweets.find((f) => {
    //   const isExist = f.retweets.some(
    //     (r) => r.toString() === tweet._id.toString()
    //   );
    //   return isExist;
    // });
    // if (x) {
    //   tweet.retweetedBy = x.user;
    // }
    return tweet;
  });
};

router.get('/user/:id', async (req, res) => {
  const { id } = req.params;
  const { filter } = req.query;
  let limit = req.query.limit ? Number(req.query.limit) : 100;
  let skip = req.query.skip ? Number(req.query.skip) : 0;
  const user_detail = await User_Detail.findOne({ user: req.user._id });
  let req_user_detail = {};
  let conditions = {};
  console.log(filter);
  switch (filter) {
    case 'tweet':
      conditions = { user: id };
      break;
    case 'like':
      req_user_detail = await User_Detail.findOne({ user: id }, '_id likes');
      conditions = {
        _id: {
          $in: req_user_detail.likes,
        },
      };
      break;
    case 'media':
      conditions = {
        $and: [
          {
            image: {
              $exists: true,
            },
          },
          { user: id },
        ],
      };
      break;
    case 'tweet_reply':
      // find tweets that user replies
      const comments = await Comment.find({ user: id }, 'tweet');
      const id_replies = comments.map((x) => x.tweet);
      conditions = {
        $or: [{ user: id }, { _id: { $in: id_replies } }],
      };

    default:
      break;
  }

  try {
    const tweets = await Tweet.find(conditions)
      .populate({
        path: 'user',
        model: User,
        select: '_id display_name photo',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total_results = await Tweet.find(conditions).countDocuments();
    return res.json({
      tweets: convertTweets(
        tweets.map((x) => x._doc),
        user_detail
        // user_follows_retweets
      ),
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

router.get('/canReply/:tweet_user_id', async (req, res) => {
  try {
    const { tweet_user_id } = req.params;
    const user_detail = await User_Detail.findOne(
      { user: tweet_user_id },
      'following'
    );
    if (user_detail) {
      const canLoggedInUserReply = user_detail.following.some(
        (x) => x.toString() === req.user._id.toString()
      );
      return res.json({ canLoggedInUserReply });
    } else {
      return res.status(400).json({ message: 'User not found!' });
    }
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
  const user_detail = await User_Detail.findOne({ user: user._id });

  try {
    const tweets = await Tweet.find({
      title: {
        $regex: new RegExp(q, 'i'),
      },
    })
      .populate({
        path: 'user',
        model: User,
        select: '_id display_name photo',
      })
      .sort({ liked_count: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total_results = await Tweet.find({
      title: {
        $regex: new RegExp(q, 'i'),
      },
    }).countDocuments();
    return res.json({
      tweets: convertTweets(
        tweets.map((x) => x._doc),
        user_detail
        // user_follows_retweets
      ),
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

router.get('/bookmark', async (req, res) => {
  try {
    const user = req.user;
    const { filter } = req.query;
    let limit = req.query.limit ? Number(req.query.limit) : 20;
    let skip = req.query.skip ? Number(req.query.skip) : 0;
    const user_detail = await User_Detail.findOne({ user: user._id });
    let conditions = {};
    console.log('bookmark', filter);
    switch (filter) {
      case 'tweet':
        conditions = {
          _id: {
            $in: user_detail.saved,
          },
        };
        break;
      case 'tweet_reply':
        const comments = await Comment.find({ user: user._id }, 'tweet');
        const id_replies = comments.map((x) => x.tweet);
        conditions = {
          $or: [
            {
              _id: {
                $in: user_detail.saved,
              },
            },
            { _id: { $in: id_replies } },
          ],
        };
        break;
      case 'media':
        conditions = {
          $and: [
            {
              _id: { $in: user_detail.saved },
            },
            {
              image: { $exists: true },
            },
          ],
        };
        break;
      case 'like':
        conditions = {
          $and: [
            {
              _id: { $in: user_detail.saved },
            },
            {
              _id: { $in: user_detail.likes },
            },
          ],
        };
        break;

      default:
        break;
    }

    let results = await Tweet.find(conditions)
      .populate({
        path: 'user',
        model: User,
        select: '_id display_name photo',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    results = convertTweets(
      results.map((x) => x._doc),
      user_detail
      // user_follows_retweets
    );
    total_results = await Tweet.find(conditions).countDocuments();
    res.json({
      tweets: results,
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

router.get('/explore', async (req, res) => {
  try {
    const user = req.user;
    const { filter } = req.query;
    let limit = req.query.limit ? Number(req.query.limit) : 20;
    let skip = req.query.skip ? Number(req.query.skip) : 0;
    const user_detail = await User_Detail.findOne({ user: user._id });
    console.log('explore', filter);
    let results = [];
    let total_results = 0;
    let conditions = {};
    let sort = {};

    switch (filter) {
      case 'top':
        conditions = {};
        sort = { liked_count: -1, createdAt: -1 };
        break;
      case 'latest':
        conditions = {};
        sort = { createdAt: -1 };
        break;
      case 'people':
        conditions = {};
        sort = { followers_count: -1, createdAt: -1 };
        break;
      case 'media':
        conditions = { image: { $exists: true } };
        sort = { liked_count: -1, createdAt: -1 };
        break;
      default:
        break;
    }

    if (filter !== 'people') {
      results = await Tweet.find(conditions)
        .populate({
          path: 'user',
          model: User,
          select: '_id display_name photo',
        })
        .sort(sort)
        .skip(skip)
        .limit(limit);
      results = convertTweets(
        results.map((x) => x._doc),
        user_detail
        // user_follows_retweets
      );
      total_results = await Tweet.find(conditions).countDocuments();
    } else {
      results = await User.find(
        conditions,
        '_id followers_count display_name photo bio'
      )
        .sort(sort)
        .skip(skip)
        .limit(limit);
      results = results.map((x) => x._doc);
      results.forEach((u) => {
        const isFollow = user_detail.following.some(
          (x) => x.toString() === u._id.toString()
        );
        u.isFollow = isFollow;
      });
      total_results = await User.find(conditions).countDocuments();
    }

    return filter === 'people'
      ? res.json({
          users: results,
          pagination: {
            skip,
            limit,
            total_results,
          },
        })
      : res.json({
          tweets: results,
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

router.get('/trend/hashtag', async (req, res) => {
  try {
    const tweets = await Tweet.find({}, '_id tags');
    let result = [];
    tweets.forEach((tweet) => {
      tweet.tags.forEach((tag) => {
        let isExist = result.find((x) => {
          return x.label.toLowerCase() === tag.toLowerCase();
        });
        if (isExist) {
          isExist.tweet_count++;
        } else {
          result.push({
            label: tag.toLowerCase(),
            tweet_count: 1,
          });
        }
      });
    });

    result = result.sort((a, b) => b.tweet_count - a.tweet_count).slice(0, 6);

    return res.json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Internal server error!',
    });
  }
});

router.get('/hashtag', async (req, res) => {
  const user = req.user;
  const { tag } = req.query;
  let limit = req.query.limit ? Number(req.query.limit) : 20;
  let skip = req.query.skip ? Number(req.query.skip) : 0;
  const user_detail = await User_Detail.findOne({ user: user._id });

  try {
    const tweets = await Tweet.find({
      tags: tag,
    })
      .populate({
        path: 'user',
        model: User,
        select: '_id display_name photo',
      })
      .sort({ liked_count: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total_results = await Tweet.find({
      tags: tag,
    }).countDocuments();
    return res.json({
      tweets: convertTweets(
        tweets.map((x) => x._doc),
        user_detail
        // user_follows_retweets
      ),
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
    const user = req.user;
    const user_detail = await User_Detail.findOne({ user: user._id });

    const tweets = await Tweet.find({
      _id: id,
    }).populate({
      path: 'user',
      model: User,
      select: '_id display_name photo',
    });
    return res.json({
      tweets: convertTweets(
        tweets.map((x) => x._doc),
        user_detail
        // user_follows_retweets
      ),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Internal server error!',
    });
  }
});
router.get('/', async (req, res) => {
  try {
    let limit = req.query.limit ? Number(req.query.limit) : 100;
    let skip = req.query.skip ? Number(req.query.skip) : 0;
    const user = req.user;

    // get the tweets this user created
    // get the tweets of all the people this user follow
    // get the tweets that all the people this user follow retweeted
    // sort by createdAt descending and pagination
    const user_detail = await User_Detail.findOne({ user: user._id });
    // let user_follows_retweets = [];
    // await Promise.all(
    //   [...user_detail.following].map(async (x) => {
    //     const detail = await User_Detail.findOne({ user: x }, '_id retweets');
    //     const userInfo = await User.findById(x, '_id display_name');
    //     user_follows_retweets = [
    //       ...user_follows_retweets,
    //       {
    //         user: userInfo,
    //         retweets: detail.retweets,
    //       },
    //     ];
    //   })
    // );

    // let follow_tweets_ids = user_follows_retweets.reduce((acc, x) => {
    //   return [...acc, ...x.retweets];
    // }, []);

    // console.log(follow_tweets_ids);

    const creators = [user._id, ...user_detail.following];

    const tweets = await Tweet.find({
      $or: [
        { user: { $in: creators } },
        // { _id: { $in: follow_tweets_ids } }
      ],
    })
      .populate({
        path: 'user',
        model: User,
        select: '_id display_name photo',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total_results = await Tweet.find({
      $or: [
        { user: { $in: creators } },
        // { _id: { $in: follow_tweets_ids } }
      ],
    }).countDocuments();

    return res.json({
      tweets: convertTweets(
        tweets.map((x) => x._doc),
        user_detail
        // user_follows_retweets
      ),
      // tweets,
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

router.post('/retweet', async (req, res) => {
  try {
    const user = req.user;
    const { tweet_id } = req.body;

    // const tweet = await Tweet.findById(tweet_id);
    const user_detail = await User_Detail.findOne(
      { user: user._id },
      '_id retweets'
    );

    const index = user_detail.retweets.findIndex(
      (x) => x.tweet.toString() === tweet_id.toString()
    );

    if (index === -1) {
      user_detail.retweets.push({ tweet: tweet_id, createdAt: new Date() });
    } else {
      user_detail.retweets.splice(index, 1);
    }

    await User.findByIdAndUpdate(user._id, {
      $inc: { retweets_count: index === -1 ? 1 : -1 },
    });
    await Tweet.findByIdAndUpdate(tweet_id, {
      $inc: { retweet_count: index === -1 ? 1 : -1 },
    });
    await user_detail.save();

    // const newTweet = new Tweet({
    //   title: tweet.title,
    //   user: tweet.user,
    //   can_reply: tweet.can_reply,
    //   image: tweet.image,
    //   retweetedBy: user._id,
    // });
    // await newTweet.save();
    return res.json({
      message: `${index === -1 ? 'Retweet' : 'Undo retweet'} Successfully!`,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal server error!',
    });
  }
});

router.post('/like', async (req, res) => {
  try {
    let user = req.user;
    const { tweet_id } = req.body;
    const user_detail = await User_Detail.findOne(
      { user: user._id },
      '_id likes'
    );

    const index = user_detail.likes.findIndex(
      (x) => x.toString() === tweet_id.toString()
    );
    if (index === -1) {
      user_detail.likes.push(tweet_id);
    } else {
      user_detail.likes.splice(index, 1);
    }

    await User.findByIdAndUpdate(user._id, {
      $inc: { like_count: index === -1 ? 1 : -1 },
    });
    await Tweet.findByIdAndUpdate(tweet_id, {
      $inc: { liked_count: index === -1 ? 1 : -1 },
    });
    await user_detail.save();

    return res.json({
      message: `${index === -1 ? 'Like' : 'Unlike'} successfully!`,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal server error!',
    });
  }
});

router.post('/save', async (req, res) => {
  try {
    let user = req.user;
    const { tweet_id } = req.body;
    const user_detail = await User_Detail.findOne(
      { user: user._id },
      '_id saved'
    );

    const index = user_detail.saved.findIndex(
      (x) => x.toString() === tweet_id.toString()
    );
    if (index === -1) {
      user_detail.saved.push(tweet_id);
    } else {
      user_detail.saved.splice(index, 1);
    }

    await User.findByIdAndUpdate(user._id, {
      $inc: { save_count: index === -1 ? 1 : -1 },
    });
    await Tweet.findByIdAndUpdate(tweet_id, {
      $inc: { saved_count: index === -1 ? 1 : -1 },
    });
    await user_detail.save();

    return res.json({
      message: `${index === -1 ? 'Save' : 'Unsave'} successfully!`,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal server error!',
    });
  }
});

module.exports = router;
