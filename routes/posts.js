const express = require('express');
const _ = require('lodash');
const auth = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const pagination = require('../middleware/pagination');
const { likeDelta } = require('../middleware/validateDelta');
const { verifyUserForPost } = require('../middleware/verifyUser');
const { Post, validate, filterPosts } = require('../models/post');
const { Comment } = require('../models/comment');
const { User, likePost } = require('../models/user');
const { Media } = require('../models/media');
const { Like } = require('../models/like');
const router = express.Router();

router.get('/', pagination, async (req, res) => {
  const { filter, filterData, maxDate, limit } = req.query;
  const { error, value: posts } = await filterPosts(
    filter,
    filterData,
    maxDate,
    limit
  );
  if (error) return res.status(400).send(error);

  res.send(posts);
});

router.get('/:id', validateId, async (req, res) => {
  const { id } = req.params;

  let post = await Post.findById(id)
    .lean()
    .populate('user', '_id username profilePic')
    .populate('media', 'mediaType data')
    .select('-__v');

  if (!post) return res.status(404).send('Post not found');

  res.send(post);
});

router.post('/', auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  const postObject = _.pick(req.body, ['date', 'text', 'likes', 'media']);
  const user = await User.findById(req.user._id).select(
    '_id username profilePic'
  );
  if (!user) res.status(400).send('Invalid userId for post');

  let media = postObject.media
    ? await new Media(postObject.media).save()
    : null;

  const newPost = await new Post({
    user: req.user._id,
    date: postObject.date,
    text: postObject.text,
    likes: postObject.likes,
    media: media ? media._id : undefined,
  }).save();

  const post = await Post.findById(newPost._id)
    .populate('user', '_id username profilePic')
    .populate('media', 'mediaType data')
    .select('-__v');

  res.send(post);
});

router.patch('/:id', [auth, validateId, likeDelta], async (req, res) => {
  const post = await Post.findById(req.params.id).select('likes');
  if (!post) return res.status(404).send('Post not found');

  const likeDelta = req.likeDelta;

  if (likeDelta === -1 && post.likes === 0)
    return res.status(400).send("Can't unlike a post with 0 likes");
  post.likes += likeDelta;
  await post.save();
  likePost(req.user._id, req.params.id, likeDelta === 1);

  res.send({ likes: post.likes });
});

router.delete(
  '/:id',
  [auth, validateId, verifyUserForPost],
  async (req, res) => {
    const postId = req.params.id;

    post = await Post.findByIdAndDelete(postId);
    if (!post) return res.status(404).send('Post not found');

    await Like.deleteMany({
      content: 'post',
      contentId: post._id,
    });

    const commentIds = Array.from(
      await Comment.find({ postId }).lean().select('_id')
    ).map((c) => c._id);

    await Comment.deleteMany({ postId });

    await Like.deleteMany({
      content: 'comment',
      contentId: { $in: commentIds },
    });

    if (post.media) await Media.findByIdAndDelete(post.media);

    res.send(post);
  }
);

module.exports = router;
