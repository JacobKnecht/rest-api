# REST API

Purpose  - The purpose of this application is to provide routes that perform
the basic functionalities of a REST API, while also providing error handling
and user authentication. This is demonstrated by managing users and courses
stored within a database.

Implementation - The project is implemented by providing routes that act on
users and courses stored within a database. The users and courses are
represented by two Sequelize models: User and Course. These models provide
validations that check to see if required information is present and that
information is properly formatted. Routes and functions manage the application
and provide RESTful functionality. The routes and functions include:
1. asyncHandler : middleware to manage asynchronous operations
2. authenticateUser : middleware to provide userAuthentication
3. GET/api/users 200 : route that authenticates the current user and then returns that user
4. POST/api/users 201 : route that creates a user, sets the 'Location' header to '/' and returns no content
5. GET/api/courses 200 : route that returns a list of courses (including the user that owns each course)
6. GET/api/courses/:id 200 : route that returns the course (including the user that owns the course) for the provided course ID
7. POST/api/courses 201 : route that authenticates the current user and then creates a course, sets the 'Location' header to the URI for the course and returns no content
8. PUT/api/courses/:id 204 : route that authenticates the current user and then updates the course for the provided course UD, returning no content
9. DELETE/api/courses/:id 204 : route that authenticates the current user and then deletes the course for the provided course ID, returning no content

The application also provides a default/home page route, a 404/'Not Found' route, a global error handling route, and middleware to authenticate and synchronize the database
