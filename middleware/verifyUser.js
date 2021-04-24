const { Post } = require('../models/post');
const { Comment } = require('../models/comment');

// Assuming user is set in req, check if they own the post
exports.verifyUserForPost = async function (req, res, next) {
  const post = await Post.findById(req.params.id).select('user');
  if (!post) return res.status(404).send('Post not found');
  if (post.user._id.toString() !== req.user._id)
    return res.status(401).send('Access denied');
  next();
};

// Assuming user is set in req, check if they own the comment
exports.verifyUserForComment = async function (req, res, next) {
  const comment = await Comment.findById(req.params.id).select('user');
  if (!comment) return res.status(404).send('Comment not found');
  if (comment.user._id.toString() !== req.user._id)
    return res.status(401).send('Access denied');
  next();
};
