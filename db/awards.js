var mysql = require('mysql');
var connection = mysql.createConnection({
  host     : process.env.DB_HOST,
  user     : process.env.DB_USER,
  port     : process.env.DB_PORT,
  password : process.env.DB_PASS,
  database : process.env.DB_NAME,
});

exports.findAllAwards = function(cb) {
    connection.query(
      "SELECT * FROM award;",
      function (error, results, fields) {
        if (error) {
          console.log(error);
          cb(error, null);
        }
        else {
          cb(null, results);
        }
      });
  };

exports.findAwardsForUser = function(userId, cb) {
  connection.query(
    "SELECT * FROM award WHERE nominee_user_id = ?;",
    [userId],
    function (error, results, fields) {
      if (error) {
        console.log(error);
        cb(error, null);
      }
      else {
        cb(null, results);
      }
    });
};

exports.findAwardById = function(awardId, cb) {
  connection.query(
    "SELECT * FROM award WHERE id = ?;",
    [awardId],
    function (error, results, fields) {
      if (error) {
        console.log(error);
        cb(error, null);
      }
      else {
        cb(null, results);
      }
    });
};

exports.findAllAwardClasses = function(cb) {
    connection.query(
      "SELECT * FROM award_class;",
      function (error, results, fields) {
        if (error) {
          console.log(error);
          cb(error, null);
        }
        else {
          cb(null, results);
        }
      });
  };

exports.findAwardClassById = function(awardClassId, cb) {
    connection.query(
      "SELECT * FROM award_class WHERE id = ?;",
      [awardClassId],
      function (error, results, fields) {
        if (error) {
          console.log(error);
          cb(error, null);
        }
        else {
          cb(null, results);
        }
      });
  };

exports.createNewAward = function(award, cb) {
  connection.query(
    "INSERT INTO award (award_declaration, created_by_id, award_class_id, created_on, nominee_user_id) values (?, ?, ?, ?, ?);",
    [award.declaration, award.created_by_id, award.award_class, new Date(), award.nominee],
    function (error, results, fields) {
      if (error) {
        console.log(error);
        cb(error, null);
      }
      else {
        cb(null, results.insertId);
      }
    });
}

exports.deleteAward = function(awardId, cb) {
  connection.query(
    "DELETE FROM award WHERE id = ?;",
    [awardId],
    function (error, results, fields) {
      if (error) {
        console.log(error);
        cb(error, null);
      }
      else {
        cb(null, results.insertId);
      }
    });
}


exports.findAllAwardsByUser = function(cb) {
  connection.query(
    "SELECT users.lastname, users.firstname, award_class.title, DATE_FORMAT(award.created_on,'%m/%d/%Y') AS created_on, department.dept_name AS deptname FROM department INNER JOIN users ON department.id = users.dept_id INNER JOIN award ON award.nominee_user_id = users.id INNER JOIN award_class ON award.award_class_id = award_class.id ORDER BY lastname;",
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

exports.findAwardsForSelectedDept = function(rows, cb) {
    connection.query(
      "SELECT users.firstname, users.lastname, award_class.title, DATE_FORMAT(award.created_on,'%m/%d/%Y') AS created_on, department.dept_name AS deptname FROM department INNER JOIN users ON department.id = users.dept_id INNER JOIN award ON award.nominee_user_id = users.id INNER JOIN award_class ON award.award_class_id = award_class.id WHERE department.id = ?;",
	  [rows.department],
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