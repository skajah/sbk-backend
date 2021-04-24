const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  followType: {
    type: String,
    enum: ['following', 'followedBy'],
    requried: true,
  },
  followUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const Follow = mongoose.model('Follow', followSchema);

exports.Follow = Follow;
