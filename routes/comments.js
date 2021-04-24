const _ = require('lodash');
const auth = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const { likeDelta } = require('../middleware/validateDelta');
const { verifyUserForComment } = require('../middleware/verifyUser');
const pagination = require('../middleware/pagination');
const express = require('express');
const { Comment, validate } = require('../models/comment');
const { Post } = require('../models/post');
const { User, likeComment } = require('../models/user');
const mongoose = require('mongoose');
const { Like } = require('../models/like');
const router = express.Router();

router.get('/', pagination, async (req, res) => {
  const { postId, maxDate, limit } = req.query;
  if (!postId)
    return res
      .status(400)
      .send('Specify postId in query string to get comments');
  if (!mongoose.Types.ObjectId.isValid(postId))
    return res.status(400).send('Invalid Id');

  const postExists = await Post.exists({ _id: postId });
  if (!postExists) return res.status(404).send('Post not found');

  const comments = await Comment.find({
    postId,
    date: { $lt: maxDate },
  })
    .lean()
    .populate('user', '_id username profilePic')
    .limit(limit)
    .select('-__v')
    .sort('-date');
  res.send(comments);
});

router.post('/', auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  const commentObject = _.pick(req.body, ['postId', 'likes', 'date', 'text']);
  const postExists = await Post.exists({ _id: commentObject.postId });
  if (!postExists) return res.status(400).send('Invalid postId for comment');

  const user = await User.findById(req.user._id).select(
    '_id username profilePic'
  );
  if (!user) return res.status(400).send('Invalid userId for comment');

  commentObject.user = user._id;
  const comment = await new Comment(commentObject).save();
  comment.user = user;
  await Post.findByIdAndUpdate(comment.postId, {
    $inc: { numberOfComments: 1 },
  });

  res.send(comment);
});

router.patch('/:id', [auth, validateId, likeDelta], async (req, res) => {
  const comment = await Comment.findById(req.params.id).select('likes');
  if (!comment) return res.status(404).send('Comment not found');

  const likeDelta = req.likeDelta;

  if (likeDelta === -1 && comment.likes === 0)
    return res.status(400).send("Can't unlike a comment with 0 likes");
  comment.likes += likeDelta;
  await comment.save();
  likeComment(req.user._id, req.params.id, likeDelta === 1);

  res.send({ likes: comment.likes });
});

router.delete(
  '/:id',
  [auth, validateId, verifyUserForComment],
  async (req, res) => {
    const comment = await Comment.findByIdAndDelete(req.params.id).select(
      '-__v'
    );
    if (!comment) return res.status(404).send('Comment not found');

    await Post.findByIdAndUpdate(comment.postId, {
      $inc: { numberOfComments: -1 },
    });

    await Like.deleteMany({
      content: 'comment',
      contentId: comment._id,
    });

    res.send(comment);
  }
);

module.exports = router;
