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

const port = process.env.PORT || 4000;

app.listen(port, () => {
  winston.info(`Listening on port ${port}...`);
});
