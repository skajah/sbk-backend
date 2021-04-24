const _ = require('lodash');
const bcrypt = require('bcrypt');
const express = require('express');
const { User, validate, update } = require('../models/user');
const { Follow } = require('../models/follow');
const auth = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const pagination = require('../middleware/pagination');
const { Like } = require('../models/like');

const router = express.Router();

router.get('/me', auth, async (req, res) => {
  const me = await User.findById(req.user._id).select(
    '_id email username description profilePic'
  );
  res.send(me);
});

router.get('/me/checkLiked/:id', [auth, validateId], async (req, res) => {
  const { id } = req.params;
  const { type } = req.query;
  let result;

  if (type === 'post') {
    result = await Like.exists({
      content: 'post',
      contentId: id,
      userId: req.user._id,
    });
  } else if (type === 'comment') {
    result = await Like.exists({
      content: 'comment',
      contentId: id,
      userId: req.user._id,
    });
  } else {
    return res
      .status(400)
      .send('Specify "type=comment" or "type=post" in query');
  }

  res.send(result);
});

router.get('/me/checkFollowing/:id', [auth, validateId], async (req, res) => {
  const { id } = req.params;
  const following = await Follow.exists({
    user: req.user._id,
    followType: 'following',
    followUser: id,
  });
  res.send(following);
});

router.get('/:id', validateId, async (req, res) => {
  const user = await User.findById(req.params.id).select(
    '_id username profilePic'
  );
  if (!user) return res.status(404).send('User not found');
  res.send(user);
});

router.get('/:id/following', [validateId, pagination], async (req, res) => {
  const { id } = req.params;
  const user = await User.exists({ _id: id });
  if (!user) return res.status(404).send('User not found');

  const { maxDate, limit } = req.query;

  let following = await Follow.find({
    user: id,
    followType: 'following',
    date: { $lt: maxDate },
  })
    .lean()
    .limit(limit)
    .populate('followUser', '_id username profilePic')
    .select('-_id followUser date')
    .sort('-date');

  following = following.map((f) => {
    return {
      _id: f.followUser._id.toString(),
      username: f.followUser.username,
      date: f.date,
      profilePic: f.followUser.profilePic,
    };
  });
  res.send(following);
});

router.get('/:id/followers', [validateId, pagination], async (req, res) => {
  const { id } = req.params;
  const user = await User.exists({ _id: id });
  if (!user) return res.status(404).send('User not found');

  const { maxDate, limit } = req.query;
  let followers = await Follow.find({
    user: id,
    followType: 'followedBy',
    date: { $lt: maxDate },
  })
    .lean()
    .limit(limit)
    .populate('followUser', '_id username profilePic')
    .select('-_id followUser date')
    .sort('-date');

  followers = followers.map((f) => {
    return {
      _id: f.followUser._id.toString(),
      username: f.followUser.username,
      date: f.date,
      profilePic: f.followUser.profilePic,
    };
  });

  res.send(followers);
});

router.patch('/me', auth, async (req, res) => {
  let {
    email,
    username,
    description,
    password,
    profilePic,
    following,
  } = req.body;
  let result;
  const id = req.user._id;

  if (email !== undefined) result = await update.email(id, email);
  else if (username !== undefined) result = await update.username(id, username);
  else if (description !== undefined)
    result = await update.description(id, description);
  else if (password !== undefined) result = await update.password(id, password);
  else if (profilePic !== undefined)
    result = await update.profilePic(id, profilePic);
  else if (following != undefined)
    result = await update.following(id, following);
  else return res.status(400).send('No data given to update');
  if (result.error) return res.status(400).send(result.error);

  if (result) {
    if (password !== undefined) result.value = 'Password Changed';
    const token = (await User.findById(id)).generateAuthToken();
    return res
      .header('x-auth-token', token)
      .header('access-control-expose-headers', 'x-auth-token')
      .send(result.value);
  }
});

router.post('/', async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  const userObject = _.pick(req.body, [
    'username',
    'email',
    'password',
    'date',
    'isAdmin',
  ]);
  const { username, email } = userObject;
  const usernameExists = await User.exists({ username });
  if (usernameExists)
    return res.status(400).send(`Username already registered`);
  const emailExists = await User.exists({ email });
  if (emailExists) return res.status(400).send(`Email already registered`);

  const user = new User(userObject);
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  await user.save();
  const token = user.generateAuthToken();
  res
    .header('x-auth-token', token)
    .header('access-control-expose-headers', 'x-auth-token')
    .send(_.pick(user, ['_id', 'username', 'email']));
});

module.exports = router;
