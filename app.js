'use strict';

//load application modules
const express = require('express');
const morgan = require('morgan');
const { sequelize, models } = require('./models');
const { User, Course } = require('./models');
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');

//variable to enable global error logging
const enableGlobalErrorLogging = process.env.ENABLE_GLOBAL_ERROR_LOGGING === 'true';

//create the Express app
const app = express();

//setup morgan which gives us http request logging
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
      console.log('There was an error with the application');
      next(err);
    }
  }
}

//user authentication middleware
const authenticateUser = async (req, res, next) => {
  let message = null;
  //check for user credentials in authorization header
  const credentials = auth(req);
  if(credentials) {
    //locate user with matching email address
    const user = await User.findOne({
        raw: true,
        where: {
          emailAddress: credentials.name,
        },
    });
    //if a user matches the email address found in the authorization header
    if(user) {
      //check password in authorization header with the matched user's password
      const authenticated = bcryptjs.compareSync(credentials.pass, user.password);
      //if password in authorization header matches matched user's password
      if(authenticated) {
        //authentication was successful
        console.log(`Authentication successful for user: ${user.firstName} ${user.lastName}`);
        if(req.originalUrl.includes('courses')) {
          //if route has a Course enpoint, set request userId to matched user's id
          req.body.userId = user.id;
        } else if(req.originalUrl.includes('users')) {
          //if route has a User endpoint, set reques id to matched ukser's id
          req.body.id = user.id;
        }
      } else {
        //authentication was not successful
        message = `Authentication failed for user: ${user.firstName} ${user.lastName}`;
      }
    } else {
      //there was no user with an email address matching the email address in the authorization header
      message = `User not found for email address: ${credentials.name}`;
    }
  } else {
    //no user credentials/authorization header available
    message = 'Authorization header not found';
  }
  //if there is a message, then access is denied
  if(message) {
    console.warn(message);
    const err = new Error('Access Denied');
    err.status = 401;
    next(err);
  } else {
    //user is authenticated
    next();
  }
}

//'GET/api/users 200' - returns the currently authenticated user
app.get('/api/users', authenticateUser, asyncHandler(async (req, res) => {
    const user = await User.findByPk(
      req.body.id,
      {
        attributes: {
          exclude: ['password', 'createdAt', 'updatedAt'],
        },
      }
    );
    res.json(user);
  })
);

//'POST/api/users 201' - creates a user, sets the 'Location' header to '/' and
//returns no content
app.post('/api/users', asyncHandler(async (req, res) => {
    //check if the request body has a password
    if(req.body.password) {
      //if so, hash the password and then attempt to create a new user
      //instance form the request body
      req.body.password = await bcryptjs.hashSync(req.body.password);
      //this trigger model validations for User model
      const newUser = await User.create(req.body);
    } else {
      //this will trigger model validations for User model
      const newUser = await User.create(req.body);
    }
    //if User model instance was successfully created, set response location
    //and send 201 status code
    res.location('/');
    res.status(201).end();
  })
);

//'GET/api/courses 200' - returns a list of courses (including the user that
//owns each course)
app.get('/api/courses', asyncHandler(async (req, res) => {
    const courses = await Course.findAll({
      //filter out unecessary, irrelevant or private information
      attributes: {
        exclude: ['createdAt', 'updatedAt'],
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: {
            exclude: ['password', 'createdAt', 'updatedAt'],
          },
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
      //filter out unecessary, irrelevant or private information
      where: {
        id: req.params.id,
      },
      attributes: {
        exclude: ['createdAt', 'updatedAt'],
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: {
            exclude: ['password', 'createdAt', 'updatedAt'],
          },
        },
      ],
    });
    res.json(course);
  })
);

//'POST/api/courses 201' - creates a course, sets the 'Location' header to the
//URI for the course, and returns no content
app.post('/api/courses', authenticateUser, asyncHandler(async (req, res) => {
    //Course model validations will ensure that required data is provided
    const newCourse = await Course.create(req.body);
    res.location(`/api/courses/${newCourse.id}`);
    res.status(201).end();
  })
);

//'PUT/api/courses/:id 204' - updates a course and returns no content
app.put('/api/courses/:id', authenticateUser, asyncHandler(async (req, res, next) => {
    let course = await Course.findByPk(req.params.id);
    //check to ensure that authenticated user is the owner of the course
    if(course.userId === req.body.userId) {
      course.title = req.body.title;
      course.description = req.body.description;
      course.estimatedTime = req.body.estimatedTime;
      course.materialsNeeded = req.body.materialsNeeded;
      //Course model validations will ensure that required data is provided
      course = await course.save();
      res.status(204).end();
    } else {
      //users may not update courses that they do not own
      const err = new Error('Forbidden');
      err.status = 403;
      next(err);
    }
  })
);

//'DELETE/api/courses/:id 204' - deletes a course and returns no content
app.delete('/api/courses/:id', authenticateUser, asyncHandler(async (req, res, next) => {
    const course = await Course.findByPk(req.params.id);
    //check to ensure that authenticated user is the owner of the course
    if(course.userId === req.body.userId) {
      await course.destroy();
      res.status(204).end();
    } else {
      //users may not delete courses that they do not own
      const err = new Error('forbidden');
      err.status = 403;
      next(err);
    }
  })
);

//default/'Home Page' route handler
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the REST API project!',
  });
});

//404/'Not Found' route handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Route Not Found',
  });
});

//global error handler
app.use((err, req, res, next) => {
  if (enableGlobalErrorLogging) {
    console.error(`Global error handler: ${JSON.stringify(err.stack)}`);
  }
  if(err.name === 'SequelizeValidationError') {
    let errorString = '';
    for(let error in err.errors) {
      errorString += `${err.errors[error].message}\n`;
    }
    err.status = 400;
  }
  if(err.name === 'SequelizeUniqueConstraintError') {
    err.status = 400;
  }
  console.log(err);
  res.status(err.status || 500).json({
    message: err.message,
    error: {},
  });
});

//set port value
app.set('port', process.env.PORT || 5000);

//test the connection to the database
console.log('testing the connection to the database');
sequelize
  .authenticate() //attempt to authenticate database
  .then(() => {
    //if database is authenticated, sync the database
    console.log('connection successful; synchronizing models to database - JMK');
    return sequelize.sync();
  })
  .then(() => {
    //start listening on port if database authentication succeeds
    //and if database has been synced
    const server = app.listen(app.get('port'), () => {
      console.log(`Express server is listening on port ${server.address().port}`);
    });
  }) //database authentication failed - notify user
  .catch(err => console.log('connection failed; unable to connect to the database - JMK'));
