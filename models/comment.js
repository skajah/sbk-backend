const mongoose = require('mongoose');
const Joi = require('joi');

const commentSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: { type: Date, default: Date.now },
  text: { type: String, required: true, minlength: 1, maxlength: 3000 },
  likes: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Must be an integer >= 0',
    },
  },
});

const Comment = mongoose.model('Comment', commentSchema);

function validateComment(comment) {
  const schema = Joi.object({
    postId: Joi.objectId().required(),
    date: Joi.date().default(Date.now),
    text: Joi.string().min(1).max(3000).required(),
    likes: Joi.number().integer().min(0).default(0),
  });

  return schema.validate(comment);
}

exports.Comment = Comment;
exports.validate = validateComment;
