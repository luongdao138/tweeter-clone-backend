const router = require('express').Router();
const Tweet = require('../models/Tweet');
const Comment = require('../models/Comment');
const User = require('../models/User');
const User_Detail = require('../models/User_Detail');
const upload = require('../middlewares/upload');
const validateUser = require('../middlewares/verifyToken');
const imageHelper = require('../helpers/cloudinary');
const convertTo64 = require('../helpers/convertToBase64');

router.use(validateUser);
router.post('/:tweet_id', upload('single', 'image'), async (req, res) => {
  try {
    const user = req.user;
    const { tweet_id } = req.params;
    const image = req.file;
    const { content, gif } = req.body;

    let newComment = { content, user: user._id, tweet: tweet_id };
    if (gif) {
      newComment.image = gif;
    }
    if (image) {
      const base64 = convertTo64(image).content;
      const { secure_url } = await imageHelper.upload(base64);
      newComment.image = secure_url;
    }

    newComment = new Comment(newComment);
    await newComment.save();
    await Tweet.findByIdAndUpdate(tweet_id, {
      $inc: {
        comment_count: 1,
      },
    });
    const result = {
      _id: newComment._id,
      createdAt: newComment.createdAt,
      content,
      image: newComment.image,
      user: {
        _id: user._id,
        photo: user.photo,
        display_name: user.display_name,
      },
      isLiked: false,
      liked_count: newComment.liked_count,
    };
    return res.json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal server error!' });
  }
});

router.get('/like/:comment_id', async (req, res) => {
  try {
    const user = req.user;
    const { comment_id } = req.params;
    let limit = req.query.limit ? Number(req.query.limit) : 100;
    let skip = req.query.skip ? Number(req.query.skip) : 0;

    const comment = await Comment.findById(
      comment_id,
      '_id liked liked_count'
    ).populate({
      path: 'liked',
      model: User,
      select: '_id display_name followers_count photo bio',
      options: {
        limit,
        skip,
        sort: { followers_count: -1 },
      },
    });

    const user_detail = await User_Detail.findOne(
      { user: user._id },
      '_id following'
    );
    let result = comment.liked.map((x) => x._doc);
    result = result.map((u) => {
      const isFollow = user_detail.following.some(
        (x) => x.toString() === u._id.toString()
      );
      u.isFollow = isFollow;
      return u;
    });
    const total_results = comment.liked_count;

    return res.json({
      users: result,
      pagination: {
        skip,
        limit,
        total_results,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal server error!' });
  }
});

router.get('/:tweet_id', async (req, res) => {
  try {
    const user = req.user;
    const { tweet_id } = req.params;
    let limit = req.query.limit ? Number(req.query.limit) : 100;
    let skip = req.query.skip ? Number(req.query.skip) : 0;

    let comments = await Comment.find(
      {
        tweet: tweet_id,
      },
      '_id content createdAt image liked_count liked'
    )
      .populate({
        path: 'user',
        model: User,
        select: '_id display_name photo',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total_results = await Comment.find({
      tweet: tweet_id,
    }).countDocuments();
    comments = comments.map((c) => {
      const doc = c._doc;
      const isLiked = doc.liked.some(
        (x) => x.toString() === user._id.toString()
      );
      doc.isLiked = isLiked;
      delete doc.liked;
      return doc;
    });
    return res.json({
      comments,
      pagination: {
        skip,
        limit,
        total_results,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal server error!' });
  }
});

router.patch('/like/:comment_id', async (req, res) => {
  try {
    const user = req.user;
    const { comment_id } = req.params;

    let comment = await Comment.findById(comment_id, '_id liked liked_count');
    const index = comment.liked.findIndex(
      (x) => x.toString() === user._id.toString()
    );

    if (index === -1) {
      comment.liked_count++;
      comment.liked.push(user._id);
    } else {
      comment.liked_count--;
      comment.liked.splice(index, 1);
    }

    await comment.save();
    return res.json(
      `${index === -1 ? 'Like comment' : 'Unlike comment'} successfully!`
    );
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal server error!' });
  }
});

module.exports = router;
