const mongoose = require('mongoose');
const Joi = require('joi');
const { User } = require('./user');
const { Like } = require('./like');
const { Follow } = require('./follow');

const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: { type: Date, default: Date.now },
  text: {
    type: String,
    maxlength: 3000,
  },
  likes: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Must be an integer >= 0',
    },
  },
  numberOfComments: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Must be an integer >=0',
    },
  },
  media: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media',
  },
});

const Post = mongoose.model('Post', postSchema);

function validatePost(post) {
  const schema = Joi.object({
    date: Joi.date().default(Date.now),
    text: Joi.string().max(3000).allow(''),
    likes: Joi.number().integer().min(0).default(0),
    numberOfComments: Joi.number().integer().min(0).default(0),
    media: Joi.object().keys({
      mediaType: Joi.string().equal('image', 'video', 'audio').required(),
      data: Joi.string().required(),
    }),
  });

  return schema.validate(post);
}

async function getPosts(maxDate, limit) {
  return await Post.find({
    date: { $lt: maxDate },
  })
    .lean()
    .populate('user', '_id username profilePic')
    .populate('media', 'mediaType data')
    .limit(limit)
    .select('-__v')
    .sort('-date');
}

async function filterByUserId(userId, maxDate, limit) {
  return await Post.find({
    user: userId,
    date: { $lt: maxDate },
  })
    .lean()
    .populate('user', '_id username profilePic')
    .populate('media', 'mediaType data')
    .limit(limit)
    .select('-__v')
    .sort('-date');
}

async function filterByUsername(username, maxDate, limit) {
  const users = Array.from(
    await User.find({
      username: {
        $regex: username,
        $options: 'i',
      },
    })
      .lean()
      .select('_id')
  ).map((user) => user._id);

  const posts = await Post.find({
    user: { $in: users },
    date: { $lt: maxDate },
  })
    .lean()
    .populate('user', '_id username profilePic')
    .populate('media', 'mediaType data')
    .limit(limit)
    .select('-__v')
    .sort('-date');

  return posts;
}

async function filterByDateRange(start, end, maxDate, limit) {
  return await Post.find({
    date: { $gte: start, $lt: end },
  })
    .and({ date: { $lt: maxDate } })
    .lean()
    .populate('user', '_id username profilePic')
    .populate('media', 'mediaType data')
    .limit(limit)
    .select('-__v')
    .sort('-date');
}

async function filterByDaysAgo(days, maxDate, limit) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(now);

  if (days === 0) now.setDate(now.getDate() + 1);

  start.setDate(start.getDate() - days);

  return await filterByDateRange(start, now, maxDate, limit);
}

async function filterByLikedPosts(userId, maxDate, limit) {
  const likedPosts = Array.from(
    await Like.find({
      content: 'post',
      userId,
    })
      .lean()
      .select('contentId')
  ).map((like) => like.contentId);

  return await Post.find({
    _id: { $in: likedPosts },
    date: { $lt: maxDate },
  })
    .lean()
    .populate('user', '_id username profilePic')
    .populate('media', 'mediaType data')
    .limit(limit)
    .select('-__v')
    .sort('-date');
}

async function filterByFollowing(userId, maxDate, limit) {
  const following = Array.from(
    await Follow.find({
      user: userId,
      followType: 'following',
    })
      .lean()
      .select('followUser')
  ).map((follow) => follow.followUser);

  return await Post.find({
    user: { $in: following },
    date: { $lt: maxDate },
  })
    .lean()
    .populate('user', '_id username profilePic')
    .populate('media', 'mediaType data')
    .limit(limit)
    .select('-__v')
    .sort('-date');
}

async function filterPosts(filter, filterData, maxDate, limit) {
  const result = {};

  if (!filter) {
    result.value = await getPosts(maxDate, limit);
  } else if (!filterData) {
    result.error = '"filterData" is required';
    return result;
  } else if (filter === 'username') {
    result.value = await filterByUsername(filterData, maxDate, limit);
  } else if (filter === 'likedPosts') {
    if (!mongoose.Types.ObjectId.isValid(filterData)) {
      result.error = 'Invalid userId';
      return result;
    }
    const user = await User.exists({ _id: filterData });
    if (!user) {
      result.error = 'Invalid userId';
      return result;
    }
    result.value = await filterByLikedPosts(filterData, maxDate, limit);
  } else if (filter === 'following') {
    if (!mongoose.Types.ObjectId.isValid(filterData)) {
      result.error = 'Invalid userId';
      return result;
    }
    const user = await User.exists({ _id: filterData });
    if (!user) {
      result.error = 'Invalid userId';
      return result;
    }
    result.value = await filterByFollowing(filterData, maxDate, limit);
  } else if (filter === 'userId') {
    if (!mongoose.Types.ObjectId.isValid(filterData)) {
      result.error = 'Invalid userId';
      return result;
    }
    const user = await User.exists({ _id: filterData });
    if (!user) {
      result.error = 'Invalid userId';
      return result;
    }
    result.value = await filterByUserId(filterData, maxDate, limit);
  } else if (filter === 'daysAgo') {
    const days = parseInt(filterData);
    if (isNaN(days) || days < 0) {
      result.error = '"filterData" must an integer >= 0';
      return result;
    }
    result.value = await filterByDaysAgo(days, maxDate, limit);
  } else if (filter === 'dateRange') {
    const parts = filterData.split(',');
    if (parts.length !== 2) {
      result.error =
        'Must specify start and end dates separated by a comma.\nEx: filterData=start,end';
      return result;
    }

    let [start, end] = parts;
    start = new Date(start);
    end = new Date(end);

    if (
      !(
        start.toString() !== 'Invalid Date' && end.toString() !== 'Invalid Date'
      )
    ) {
      result.error = 'Invalid start and/or end date';
      return result;
    }

    end.setDate(end.getDate() + 1);

    result.value = await filterByDateRange(start, end, maxDate, limit);
  } else {
    result.error = 'Invalid filter';
  }
  return result;
}

exports.Post = Post;
exports.validate = validatePost;
exports.filterPosts = filterPosts;
