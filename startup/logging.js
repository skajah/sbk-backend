const winston = require('winston');
const config = require('config');
require('winston-mongodb');
require('express-async-errors');

module.exports = function () {
  winston.add(
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
  winston.add(
    new winston.transports.File({
      filename: 'log',
      handleExceptions: true,
      handleRejections: true,
    })
  );
  winston.add(
    new winston.transports.MongoDB({
      db: config.get('db'),
      handleExceptions: true,
      handleRejections: true,
    })
  );
};
