var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');
const helmet = require('helmet');

// routers
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/user');

// swagger docs
const swaggerUI = require('swagger-ui-express');
const yaml = require('yamljs');
const swaggerDocument = yaml.load('./swagger.yaml');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(cors());
app.use(helmet());
app.use(logger('common'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// knex setup
const options = require('./knexfile.js');
const knex = require('knex')(options);

// database connection middleware
app.use((req, res, next) => {
    req.db = knex;
    next();
})

// serve swagger docs on main landing page
app.use('/', swaggerUI.serve);
app.get('/', swaggerUI.setup(swaggerDocument));

// split into user and index routes
app.use('/', indexRouter);
app.use('/user', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;