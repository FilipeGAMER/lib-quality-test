const express = require('express');
const compression = require('compression');
const path = require('path');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const controllersv1 = require('./routes/api_v1');

const callGithub = new (require('./helpers/callGithub'))();
const db = new (require('./helpers/db'))();

const app = express();

app.use(compression());
app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
const options = {
  callGithub : callGithub,
  db : db
};
app.use('/api/v1', controllersv1.apiv1(options));

module.exports = app;
