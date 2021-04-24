const winston = require('winston');
const express = require('express');
const app = express();
app.use(express.json({ limit: '100mb' }));
require('./startup/logging')();
require('./startup/config')();
require('./startup/validation')();
require('./startup/db')();
require('./startup/routes')(app);
require('./startup/prod')(app);

app.listen(4000, () => {
  winston.info('Listening on port 4000...');
});
