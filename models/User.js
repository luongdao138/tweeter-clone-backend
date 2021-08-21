const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    display_name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: String,
    photo: String,
    coverPhoto: String,
    bio: String,
    social_id: String,
    following_count: {
      type: Number,
      default: 0,
    },
    followers_count: {
      type: Number,
      default: 0,
    },
    like_count: {
      type: Number,
      default: 0,
    },
    save_count: {
      type: Number,
      default: 0,
    },
    tweets_count: {
      type: Number,
      default: 0,
    },
    retweets_count: {
      type: Number,
      default: 0,
    },
    notifications_count: {
      type: Number,
      default: 0,
    },
    is_online: {
      type: Boolean,
      default: false,
    },
    socket_id: String,
  },
  {
    timestamps: true,
  }
);

const User = model('User', userSchema);
module.exports = User;
