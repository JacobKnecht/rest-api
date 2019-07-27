'use strict';

// load modules
const express = require('express');
const morgan = require('morgan');
const { sequelize, models } = require('./models');
const { User, Course } = require('./models');
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');

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
    req.body.password = bcryptjs.hashSync(req.body.password);
    const newUser = await User.create(req.body);
    res.location('/');
    res.status(201).end();
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
app.get('/api/courses/:id', asyncHandler(async (req, res) => {
    const course = await Course.findAll({
      where: {
        id: req.params.id,
      },
      include: [
        {
          model: User,
          as: 'user',
        },
      ],
    });
    res.json(course);
  })
);

//'POST/api/courses 201' - creates a course, sets the 'Location' header to the
//URI for the course, and returns no content
app.post('/api/courses', asyncHandler(async (req, res) => {
    const newCourse = await Course.create(req.body);
    res.location(`/api/courses/${newCourse.id}`);
    res.status(201).end();
  })
);

//'PUT/api/courses/:id 204' - updates a course and returns no content
app.put('/api/courses/:id', asyncHandler(async (req, res) => {
    let course = await Course.findByPk(req.params.id);
    course.title = req.body.title;
    course.description = req.body.description;
    course.estimatedTime = req.body.estimatedTime;
    course.materialsNeeded = req.body.materialsNeeded;
    course = await course.save();
    res.status(204).end();
  })
);

//'DELETE/api/courses/:id 204' - deletes a course and returns no content
app.delete('/api/courses/:id', asyncHandler(async (req, res) => {
    const course = await Course.findByPk(req.params.id);
    await course.destroy();
    res.status(204).end();
  })
);

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
  if(err.name === 'SequelizeValidationError') {
    let errorString = '\n';
    for(let error in err.errors) {
      errorString += `${err.errors[error].message}\n`;
    }
    err.status = 400;
  }
  if(err.name === 'SequelizeUniqueConstraintError') {
    err.status = 400;
  }
  console.log(err.name);
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
