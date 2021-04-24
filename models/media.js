const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  mediaType: {
    type: String,
    enum: ['image', 'audio', 'video'],
    required: true,
  },
  data: {
    type: String,
    required: true,
  },
});

const Media = mongoose.model('Media', mediaSchema);

exports.Media = Media;
