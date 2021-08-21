const { Schema, model } = require('mongoose');

const Notification = new Schema(
  {
    tweet: {
      type: Schema.Types.ObjectId,
      ref: 'Tweet',
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['LIKE', 'COMMENT'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model('Notification', Notification);
