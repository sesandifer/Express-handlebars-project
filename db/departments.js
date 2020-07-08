var mysql = require('mysql');
var connection = mysql.createConnection({
  host     : process.env.DB_HOST,
  user     : process.env.DB_USER,
  port     : process.env.DB_PORT,
  password : process.env.DB_PASS,
  database : process.env.DB_NAME,
});

exports.findDeptAwardCounts = function(cb) {
    connection.query(
      "SELECT department.dept_name AS department, department.manager AS manager, COUNT(award.id) AS awardcount FROM award INNER JOIN users ON award.created_by_id = users.id INNER JOIN department ON users.dept_id = department.id GROUP BY department ORDER BY awardcount DESC;",
      function (error, results, fields) {
        if (error) {
          console.log(error);
          cb(error, null);
        }
        else {
          cb(null, results);
        }
      });
  }
  
  
exports.findRegionAwardCounts = function(cb) {
    connection.query(
      "SELECT region.region_name AS region, COUNT(award.id) AS awardcount FROM award INNER JOIN users ON award.created_by_id = users.id INNER JOIN department ON users.dept_id = department.id INNER JOIN region ON region.id = department.region_id GROUP BY region ORDER BY awardcount DESC;",
      function (error, results, fields) {
        if (error) {
          console.log(error);
          cb(error, null);
        }
        else {
          cb(null, results);
        }
      });
  }  
  
  
  
