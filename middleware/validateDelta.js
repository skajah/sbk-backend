exports.likeDelta = function (req, res, next) {
  const { liked } = req.body;
  if (liked === true) req.likeDelta = 1;
  else if (liked === false) req.likeDelta = -1;
  else return res.status(400).send('Expected "liked" to be true or false');
  next();
};
