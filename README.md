
Project using Node.js with Handlebars as the templating engine and MySQL as the database backend. 

The application is hosted in AWS. The Node.js application is hosted on an AWS Elastic Compute Cloud (EC2) host running Amazon Linux, while the database is hosted on a MySQL 5.7 RDS instance.

User authentication and session handling is handled by Passport.js, a Node.js library for database-backed authentication.
 
Employee recognition certificates are generated with LaTeX using the node-latex module and can be downloaded or emailed to users using SendGrid, a service that allows easy emailing via a REST API. 

Charting that is viewable to administrators was created using the Chart.js library.


_This was a very fun express-hbs project. The hbs templates are in the 'views' folder._

_See app.js and db folder for node.js usage._

_In order to run this app you need a file called `.env` in the project root with the required DB and AWS credentials._

   1. change directory: `cd cs467`

   2. install dependencies: `npm install`

   3. run the app: `npm start`

