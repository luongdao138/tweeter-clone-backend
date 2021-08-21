const { Schema, model } = require('mongoose');

const tweetSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    title: {
      type: String,
    },
    image: {
      type: String,
    },
    can_reply: {
      type: String,
      enum: ['EVERYONE', 'FOLLOW'],
      default: 'EVERYONE',
    },
    liked_count: {
      type: Number,
      default: 0,
    },
    saved_count: {
      type: Number,
      default: 0,
    },
    comment_count: {
      type: Number,
      default: 0,
    },
    retweet_count: {
      type: Number,
      default: 0,
    },
    tags: [String],
  },
  {
    timestamps: true,
  }
);

const Tweet = model('Tweet', tweetSchema);
module.exports = Tweet;
