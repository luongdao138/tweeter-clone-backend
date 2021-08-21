const { Schema, model } = require('mongoose');

const tweetDetailSchema = new Schema({
  tweet: {
    type: Schema.Types.ObjectId,
    ref: 'Tweet',
  },
  comment: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  retweet: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  liked: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  saved: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
});

const Tweet_Detail = model('Tweet_Detail', tweetDetailSchema);
module.exports = Tweet_Detail;
