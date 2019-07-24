'use strict';

// load modules
const express = require('express');
const morgan = require('morgan');
const { sequelize, models } = require('./models');
const { User, Course } = require('./models');

// variable to enable global error logging
const enableGlobalErrorLogging = process.env.ENABLE_GLOBAL_ERROR_LOGGING === 'true';

// create the Express app
const app = express();

// setup morgan which gives us http request logging
app.use(morgan('dev'));

//enable access to req.body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//async/await handler
const asyncHandler = cb => {
  return async (req, res, next) => {
    try {
      await cb(req, res, next);
    } catch(err) {
      console.log('There was an error - JMK');
      next(err);
    }
  }
}

//'GET/api/users 200' - returns the currently authenticated user
app.get('/api/users', asyncHandler(async (req, res) => {
    const users = await User.findAll({raw: true});
    res.json(users);
  })
);

//'POST/api/users 201' - creates a user, sets the 'Location' header to '/' and
//returns no content
app.post('/api/users', asyncHandler(async (req, res) => {
    const newUser = await User.create({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      emailAddress: req.body.emailAddress,
      password: req.body.password
    });
    res.location('/');
    res.status(201).json(newUser);
  })
);

//'GET/api/courses 200' - returns a list of courses (including the user that
//owns each course)
app.get('/api/courses', asyncHandler(async (req, res) => {
    const courses = await Course.findAll({
      include: [
        {
          model: User,
          as: 'user',
        },
      ],
    });
    res.json(courses);
  })
);

//'GET/api/courses/:id 200' - returns the course (including the user that owns
//the course) for the provided course ID

//'POST/api/courses 201' - creates a course, sets the 'Location' header to the
//URI for the course, and returns no content

//'PUT/api/courses/:id 204' - updates a course and returns no content

//'DELETE/api/courses/:id 204' - deletes a course and returns no content

// setup a friendly greeting for the root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the REST API project!',
  });
});

// send 404 if no other route matched
app.use((req, res) => {
  res.status(404).json({
    message: 'Route Not Found',
  });
});

// setup a global error handler
app.use((err, req, res, next) => {
  if (enableGlobalErrorLogging) {
    console.error(`Global error handler: ${JSON.stringify(err.stack)}`);
  }

  res.status(err.status || 500).json({
    message: err.message,
    error: {},
  });
});

//test the connection to the database
console.log('testing the connection to the database');
sequelize
  .authenticate()
  .then(() => {
    console.log('connection successful; synchronizing models to database - JMK');
    return sequelize.sync();
  })
  .catch(err => console.log('connection failed; unable to connect to the database - JMK'));

// set our port
app.set('port', process.env.PORT || 5000);

// start listening on our port
const server = app.listen(app.get('port'), () => {
  console.log(`Express server is listening on port ${server.address().port}`);
});
