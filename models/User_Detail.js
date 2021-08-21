const { Schema, model } = require('mongoose');

const userDetailSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  following: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  followers: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  // tweets: [
  //   {
  //     type: Schema.Types.ObjectId,
  //     ref: 'Tweet',
  //   },
  // ],
  retweets: [
    {
      tweet: {
        type: Schema.Types.ObjectId,
        ref: 'Tweet',
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  likes: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Tweet',
    },
  ],
  saved: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Tweet',
    },
  ],
});

const User_Detail = model('User_Detail', userDetailSchema);
module.exports = User_Detail;
