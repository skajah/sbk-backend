const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  content: {
    type: String,
    enum: ['post', 'comment'],
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
});

const Like = mongoose.model('Like', likeSchema);

exports.Like = Like;
