var sqlite3 = require('sqlite3').verbose();
var express = require('express');
var session = require('express-session');
var http = require('http');
const crypto = require('crypto');
const secretKey = crypto.randomBytes(32).toString('hex');
var path = require("path");
var bodyParser = require('body-parser');
var helmet = require('helmet');
var rateLimit = require("express-rate-limit");
const three = require('three');
const nerdamer = require('nerdamer');


const ejs = require("ejs");

ejs.delimiter = '/';
ejs.openDelimiter = '[';
ejs.closeDelimiter = ']';

const vectorCalculation = require('./public/js/vector-calculation.js');

var app = express();
var server = http.createServer(app);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100
});

let currentUserEmail = null;

app.use(express.static("public"));

app.use(session({
  secret: secretKey,
  resave: false,
  saveUninitialized: true,
}));

var db = new sqlite3.Database('./database/UserAccounts');


app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(helmet());
app.use(limiter);


app.get('/', function(req,res){
    res.sendFile(path.join(__dirname,'./public/main.html'));
  });

app.use('/public', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path, stat) => {
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    }
  },
}));

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net");
  next();
});
  
app.post('/add', (req, res) => {
  const email = req.body.email;
  if (!email || email.indexOf('@') === -1) {
    req.session.errorMessage = 'Invalid email format. Please enter a valid email address.'
    res.redirect("/createAccount-page")
  }
  db.serialize(() => {
    db.run(
      'INSERT INTO Accounts(Forename, Surname, Email, Password, Classroom, AccountType) VALUES (?, ?, ?, ?, ?, ?)',
      [req.body.forename, req.body.surname, req.body.email, req.body.password, null, req.body.account_type],
      function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          req.session.errorMessage = "The email already exists"
          console.log("The email already exists")
          res.redirect('/createAccount-page');
        } else {
          req.session.errorMessage = err.message
          console.log(err.message)
          res.redirect('/createAccount-page');
        }
      } else {
        console.log(`New ${req.body.account_type} has been added`);
        req.session.currentUserEmail = email; 

        ProgessDatabase(this.lastID);
        if (req.body.account_type == "teacher"){
          classCode = createClassCode()
          setClassCode(classCode, req.body.email)
        }
        res.render('classroomCodePopup.ejs', { email: req.body.email });
      }
    });
  });
});

// app.post('/update', function (req, res) {
//   if (req.body.password1 != req.body.password2){
//     console.log("No Match with new passwords")
//     return res.send("No Match with new passwords")
//   }
//   else if (req.body.oldpassword == req.body.password1 || req.body.oldpassword == req.body.password2) {
//     console.log("Isn't a new password")
//     return res.send("Isn't a new password")
//   }
//   else {
//     checkPassword(req.body.email, req.body.oldpassword)
//     .then((result) => {
//       if (result == "true") {
//         db.get('UPDATE Accounts SET Password = ? WHERE Email = ?', [req.body.password1, req.body.email], function(err) {
//           if (err) {
//             return console.log(err.message);
//           }
//           else {
//             console.log("Updated")
//             res.send("Updated")
//           }
//         });
//       }
//       else {
//         console.log(result)
//         res.send(result)
//       }
//     })
//     .catch((error) => {
//       console.log(error.message);
//     });
//   }

// });

// app.post('/delete', function(req, res) {
//   if (req.body.password1 != req.body.password2){
//     console.log("These passwords dont match");
//     return res.send("These passwords dont match");
//   }
//   else{
//     checkPassword(req.body.email, req.body.password1)
//     .then((result) => {
//       if (result == "true") {
//         db.get('DELETE FROM Accounts WHERE Email = ?', [req.body.email], function(err) {
//           if (err) {
//             return console.log(err.message);
//           }
//           else {
//             console.log("Updated")
//             res.send("Updated")
//           }
//         });
//       } else {
//         console.log(result)
//         res.send(result)
//       }
//     })
//     .catch((error) => {
//       console.log(error.message)
//     });
//   };
// });

// app.post('/login', function(req, res) {
//   errorMessage = null
//   email = req.body.email
//   password = req.body.password
//   accounttype = studentOrTeacher(email)
//   match = checkPassword(email, password)
//   if (match == true){
//     if (accounttype == "student"){
//       res.render('/studentHome', {email});
//     }
//     if (accounttype == "teacher"){
//       res.render('/otherForms', {email})
//     }
//   }
//   else {
//     res.render('login', {errorMessage : "No Match"})

//   }
// });

app.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  currentUserEmail = email;

  studentOrTeacher(email)
    .then((accounttype) => checkPassword(email, password).then((match) => ({ accounttype, match })))
    .then(({ accounttype, match }) => {
      if (match) {
        req.session.currentUserEmail = email;
        if (accounttype === 'student') {
          res.render('studentHome', { email });
        } else if (accounttype === 'teacher') {
          res.render('otherForms', { email });
        } else {
          res.render('login', { errorMessage: 'No Match' });
        }
      } else {
        res.render('login', { errorMessage: 'No Match' });
      }
    })
    .catch((err) => {
      console.error(err);
      res.render('login', { errorMessage: 'An error occurred' });
    });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect('/');
  });
});

app.get('/login-page', (req, res) => {
  req.session.errorMessage = req.session.errorMessage || null;
  res.render('login', { errorMessage: req.session.errorMessage });
});

app.get('/createAccount-page', (req,res) => {
  req.session.errorMessage = req.session.errorMessage || null;
  res.render('createAccountType', { errorMessage: req.session.errorMessage });
});

app.post('/accountType', function(req, res) {
    req.session.errorMessage = req.session.errorMessage || null;
    const accountType = req.body.account_type;
    res.render('createAccount',{ errorMessage: req.session.errorMessage, accountType });
});

app.get('/draw-page', (req,res) => {
  var email = req.session.currentUserEmail
  req.session.errorMessage = req.session.errorMessage || null;
  res.render('drawVectorGraphic', { errorMessage: req.session.errorMessage, email} );
})

app.post('/studentAddCode', function(req, res) {
  console.log(req.body.classCode)
  classCode = req.body.classCode
  const email = req.session.currentUserEmail;

  setClassCode(classCode, email)
 res.render("studentHome", {email : email})
});

app.get('/studentProfile-page', function(req,res) {
  const email = req.session.currentUserEmail
  getName(email)
  .then(userDetails => {
    if (userDetails) {
      const { forename, surname } = userDetails;
      res.render("studentProfile", {email, forename, surname})
    } else {
      console.log('no details found')
    }
  })
  .catch(error => {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  });
});

app.get('/intersection-questions', (req, res) => {
  const { vector1, vector2, coordinates } = vectorCalculation.IntersectionVectorOperations.getIntersectingVectorsAndCoordinates();
  const result = null;
  const email = req.session.currentUserEmail;
  res.render("intersectionQuestion", { email, vector1, vector2, coordinates, result });
});

app.get('/distance-questions', (req, res) => {
  const vector = new vectorCalculation.Vector();
  const values = vectorCalculation.DistanceVectorOperations.findShortestDistanceToPoint(vector);
  const result = null;

  const { point, distance } = values;
  const email = req.session.currentUserEmail;
  const formattedVector = vectorCalculation.VectorOperations.formatVector(vector);

  res.render("distanceQuestion", { email, vector : formattedVector, point, distance, result});
});

app.post('/distance-check-answer', function(req, res) {
  const email = req.session.currentUserEmail;
  const userInput = req.body.userInput;
  const vector = req.body.vector;
  const point = req.body.point;
  const distance = req.body.distance;
  const dbName = "Prog_Distance";

  const result = userInput === distance ? 'Correct!' : 'Incorrect!';
  if (result == 'Correct!'){
    var check = true;
  }
  else{
    var check = false;
  }
  updateProgTables(dbName, email, check)
  res.render("distanceQuestion", { email, vector, point, distance, result})

})

app.post("/intersection-check-answer", function(req, res) {
  const email = req.session.currentUserEmail;
  const userInput = req.body.userInput;
  const vector1 = req.body.vector1;
  const vector2 = req.body.vector2;
  const coordinates = req.body.coordinates;
  const dbName = "Prog_Intersection";
  const result = userInput === coordinates ? 'Correct!' : 'Incorrect!';
  if (result == 'Correct!'){
    var check = true;
  }
  else{
    var check = false;
  }
  updateProgTables(dbName, email, check)
  res.render("intersectionQuestion", { email, vector1, vector2, coordinates, result})
});

app.get('/close', function(req,res){
  db.close((err) => {
    if (err) {
      res.send('There is some error in closing the database');
      return console.error(err.message);
    }
    console.log('Closing the database connection.');
    res.send('Database connection successfully closed');
  });
});

app.get('/studentProgress', async (req, res) => {
  const email = req.session.currentUserEmail;
  console.log(email);

  const accountID = await getAccountIDByEmail(email);

  if (accountID === null) {
    res.status(404).send('Account not found');
    return;
  }

  const progressData = [];
  const tables = ["Progress", "Prog_Intersection", "Prog_Distance", "Prog_Planes"];

  async function getProgressData(table, callback) {
    try {
      const progressID = await getProgressID(accountID);

      if (progressID !== null) {
        db.get(
          `SELECT QuestionsAttempted, CorrectAnswers FROM ${table} WHERE ProgressID = ?`,
          [progressID],
          (err, row) => {
            if (err) {
              console.log(err);
              callback(err, null);
            } else {
              if (row) {
                const totalQuestions = row.QuestionsAttempted;
                const correctAnswers = row.CorrectAnswers;
                const incorrectAnswers = totalQuestions - correctAnswers;
                progressData.push({ table, correctAnswers, incorrectAnswers });
              }
              callback(null, row);
            }
          }
        );
      } else {
        callback(null, null);
      }
    } catch (error) {
      console.error(error);
      callback(error, null);
    }
  }

  async function getAllProgressData() {
    try {
      for (const table of tables) {
        await new Promise((resolve) => {
          getProgressData(table, resolve);
        });
      }
      res.render('studentProgressPage', { progressData, email });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  }

  getAllProgressData();
});

app.get('/studentHomePage',(req, res) => {
  const email = req.session.currentUserEmail
  res.render('studentHome', {email})
});

function ProgessDatabase(AccountsID) {
  let ProgressID;

  db.serialize(() => {
    db.run(
      `INSERT INTO Progress (AccountID, QuestionsAttempted, CorrectAnswers) VALUES (?, ?, ?)`,
      [AccountsID, 0, 0],
      function (err) {
        if (err) {
          console.log(err);
        } else {
          ProgressID = this.lastID;
          console.log(`Progress Database successful`);
          insertIntoOtherTables(ProgressID);
        }
      }
    );
  });

  function insertIntoOtherTables(ProgressID) {
    const databases = ["Prog_Intersection", "Prog_Distance", "Prog_Planes"];

    for (let i = 0; i < databases.length; i++) {
      const tableName = databases[i];

      db.serialize(() => {
        db.run(
          `INSERT INTO ${tableName}(ProgressID, QuestionsAttempted, CorrectAnswers) VALUES (?, ?, ?)`,
          [ProgressID, 0, 0],
          function (err) {
            if (err) {
              console.log(err);
            } else {
              console.log(`${tableName} Database successful`);
            }
          }
        );
      });
    }
  }
}

function updateProgTables(tableName, email, correct) {
  getAccountIDByEmail(email)
    .then((accountID) => {
      if (accountID !== null) {
        console.log(`AccountID for ${email}: ${accountID}`);
        return getProgressID(accountID);
      } else {
        console.log(`No AccountID found for ${email}`);
        return Promise.resolve(null);
      }
    })
    .then((progressID) => {
      if (progressID !== null) {
        console.log(`ProgressID for ${email}: ${progressID}`);
        const databases = ["Progress", tableName];
        const questionsAttempted = [0, 0];
        const correctAnswers = [0, 0];

        for (var i = 0; i <= 1; i++) {
          const tableName = databases[i];
          db.serialize(() => {
            db.get(
              `SELECT QuestionsAttempted, CorrectAnswers FROM ${tableName} WHERE ProgressID = ?`,
              [progressID],
              (err, row) => {
                if (err) {
                  console.error(err.message);
                  return;
                }
                if (row) {
                  questionsAttempted[i] = row.QuestionsAttempted + 1;
                  correctAnswers[i] = row.CorrectAnswers + (correct ? 1 : 0);

                  db.run(
                    `UPDATE ${tableName} SET QuestionsAttempted = ?, CorrectAnswers = ? WHERE ProgressID = ?`,
                    [questionsAttempted[i], correctAnswers[i], progressID],
                    (err) => {
                      if (err) {
                        console.error(err.message);
                      } else {
                        console.log(`Updated ${tableName} for ProgressID ${progressID}`);
                      }
                    }
                  );
                }
              }
            );
          });
        }
      } else {
        console.log(`No ProgressID found for ${email}`);
      }
    })
    .catch((err) => {
      console.error('Error:', err);
    });
}

function checkPassword(email, password) {
  return new Promise((resolve, reject) => {
    db.get('SELECT Password FROM Accounts WHERE Email = ?', [email], (err, row) => {
      if (err) {
        reject(err);
      } else {
        if (row && password === row.Password) {
          resolve(true);
        } else {
          resolve(false);
        }
      }
    });
  });
}

function createClassCode(){
  characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  code = ''
  for (var i = 0; i< 6; i++){
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }
  return code;
}

function setClassCode(classCode, email){
  db.run('UPDATE Accounts SET Classroom = ? WHERE Email = ?',
  [classCode, email], function (err) {
    if (err) {
      console.error(err);
    } else {
      console.log("classcode added")
    }
  });
}

function studentOrTeacher(email) {
  return new Promise((resolve, reject) => {
    db.get('SELECT AccountType FROM Accounts WHERE Email = ?', [email], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row ? row.AccountType : null);
      }
    });
  });
}

function getName(email) {
    return new Promise((resolve, reject) => {
      db.get('SELECT Forename, Surname FROM Accounts WHERE Email = ?', [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? { forename: row.Forename, surname: row.Surname } : null);
        }
      });
    });
}

function getProgressID(accountID) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT ProgressID FROM Progress WHERE AccountID = ?',
      [accountID],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.ProgressID : null);
        }
      }
    );
  });
}

function getAccountIDByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT AccountID FROM Accounts WHERE Email = ?',
      [email],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.AccountID : null);
        }
      }
    );
  });
}

server.listen(3000,function(){ 
    console.log("Server listening on port: 3000");
    console.log("Server is running on 'http://localhost:3000/'");
});