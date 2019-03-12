var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var amqp = require('amqplib/callback_api');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.post('/listen', (req, res) => {
  //var keys = new Array()
  //console.log(req.body)
  var keys = req.body.keys
  amqp.connect('amqp://localhost', function(err, conn) {
    conn.createChannel(function(err, ch) {
      if (err) return res.json({status: "ERROR"});
      var hw3 = 'hw3';

      ch.assertExchange(hw3, 'direct', {durable: false});

      ch.assertQueue('', {exclusive: true}, function(err, q) {
        //console.log(' [*] Waiting for logs. To exit press CTRL+C');

        keys.forEach(function(severity) {
          ch.bindQueue(q.queue, hw3, severity);
        });

        ch.consume(q.queue, function(msg) {
          //console.log(" [x] %s: '%s'", msg.fields.routingKey, msg.content.toString());
          //console.log(msg);
          //res.send({msg: msg})
          //console.log(JSON.parse(msg.content.toString()));
          res.json({msg: msg.content.toString()});
          ch.close(function() {conn.close()})
        }, {noAck: false});
      });
    });
  });
});

app.post('/speak', (req, res) => {
  //console.log(req.body)
  var key = req.body.key
  var msg = req.body.msg
  amqp.connect('amqp://localhost', function(err, conn) {
    conn.createChannel(function(err, ch) {
      var hw3 = 'hw3';
      //var args = process.argv.slice(2);
      //var msg = args.slice(1).join(' ') || 'Hello World!';
      //var severity = (args.length > 0) ? args[0] : 'info';

      ch.assertExchange(hw3, 'direct', {durable: false});
      ch.publish(hw3, key, new Buffer(msg));
      return res.json({status: "OK" })
      //console.log(" [x] Sent %s: '%s'", severity, msg);
    });

    //setTimeout(function() { conn.close(); process.exit(0) }, 500);
  });
});

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
