const { Schema, model } = require('mongoose');

const commentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tweet: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Tweet',
    },
    liked_count: {
      type: Number,
      default: 0,
    },
    liked: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    content: {
      type: String,
    },
    image: { type: String },
  },
  {
    timestamps: true,
  }
);

const Comment = model('Comment', commentSchema);
module.exports = Comment;
