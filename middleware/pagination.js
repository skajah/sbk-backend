module.exports = function (req, res, next) {
  let { maxDate, limit } = req.query;

  const checkedLimit = parseInt(limit, 10);

  if (isNaN(checkedLimit) || checkedLimit <= 0) limit = 5;
  else limit = checkedLimit;

  const checkedDate = new Date(maxDate);
  if (checkedDate.toString() === 'Invalid Date') maxDate = new Date();
  else maxDate = checkedDate;

  req.query.maxDate = maxDate;
  req.query.limit = limit;

  next();
};
