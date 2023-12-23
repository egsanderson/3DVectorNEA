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
    req.session.errorMessage = 'Invalid email format. Please enter a valid email address.';
    res.render('createAccount', { errorMessage: req.session.errorMessage });
  }

  const accountType = req.body.account_type;

  if (accountType === "teacher") {
    const classCode = createClassCode();

    db.serialize(() => {
      db.run(
        'INSERT INTO Teacher(Forename, Surname, Email, Password) VALUES (?, ?, ?, ?)',
        [req.body.forename, req.body.surname, req.body.email, req.body.password],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              req.session.errorMessage = "The email already exists";
              console.log("The email already exists");
              res.render('createAccount', { accountType, errorMessage: req.session.errorMessage });
            } else {
              req.session.errorMessage = err.message;
              console.log(err.message);
              res.render('createAccount', { accountType, errorMessage: req.session.errorMessage });
            }
          } else {
            getTeacherID(email)
              .then((teacherID) => {
                db.run('INSERT INTO Classcode(ClasscodeID, TeacherID) VALUES (?, ?)',
                  [classCode, teacherID],
                  (err) => {
                    if (err) {
                      req.session.errorMessage = err.message;
                      console.log(err.message);
                      res.render('createAccount', { accountType, errorMessage: req.session.errorMessage });
                    } else {
                      console.log(`New ${req.body.account_type} has been added`);
                      req.session.currentUserEmail = email;
                      res.redirect('/');
                    }
                  });
              })
              .catch((err) => {
                req.session.errorMessage = err.message;
                console.log(err.message);
                res.render('createAccount', { accountType, errorMessage: req.session.errorMessage });
              });
          }
        }
      );
    });
  } else {
    db.run('INSERT INTO Student(Forename, Surname, Email, Password) VALUES (?, ?, ?, ?)',
      [req.body.forename, req.body.surname, req.body.email, req.body.password],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            req.session.errorMessage = "The email already exists";
            console.log("The email already exists");
            res.render('createAccount', { accountType, errorMessage: req.session.errorMessage });
          } else {
            req.session.errorMessage = err.message;
            console.log(err.message);
            res.render('createAccount', { accountType, errorMessage: req.session.errorMessage });
          }
        } else {
          console.log(`New ${req.body.account_type} has been added`);
          req.session.currentUserEmail = email;
          ProgessDatabase(this.lastID);
          res.render('classroomCodePopup.ejs', { email: req.body.email });
        }
      });
  }
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
    .then((accountType) => checkPassword(email, password, accountType).then((match) => ({ accountType, match })))
    .then(({ accountType, match }) => {
      if (match) {
        req.session.currentUserEmail = email;
        if (accountType && accountType.toLowerCase() === 'student') {
          res.render('studentHome', { email });
        } else if (accountType && accountType.toLowerCase() === 'teacher') {
          res.render('teacherHome', { email });
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
  const classCode = req.body.classCode
  const email = req.session.currentUserEmail;

  setClassCode(classCode, email)
 res.render("studentHome", {email : email})
});

app.get('/studentProfile-page', function(req,res) {
  const email = req.session.currentUserEmail
  const table = "Student";
  getName(email, table)
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

app.get('/distance-questions', (req, res) => {
  var val = getRandomBool()
  console.log(val)
  if (val == true) {
    const vector1 = new vectorCalculation.Vector();
    const vector2 = new vectorCalculation.Vector();
    const result = null;
    const email = req.session.currentUserEmail;
  
    const values = vectorCalculation.DistanceVectorOperations.findShortestDistanceBetweenLines(vector1, vector2);
    const {formatVector1, formatVector2, distance} = values;
    res.render("distanceQuestion", { email, vector1 : formatVector1, vector2 : formatVector2, distance, result, val});
  }
  else if (val == false) {
    const vector = new vectorCalculation.Vector();
    const values = vectorCalculation.DistanceVectorOperations.findShortestDistanceToPoint(vector);
    const result = null;

    const { point, distance } = values;
    const email = req.session.currentUserEmail;
    const formattedVector = vector.formatVector("p", "");

    res.render("distanceQuestion", { email, vector : formattedVector, point, distance, result, val});
  }
});

app.post('/distance-check-answer', function(req, res) {
  const email = req.session.currentUserEmail;
  const userInput = req.body.userInput;
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
  res.render("distanceQuestion", { email, result});
})

app.get('/plane-questions', (req, res) => {
  var vector = new vectorCalculation.Vector()
  const values = vectorCalculation.PlaneVectorOperations.findPlaneIntersectionWithLine(vector);
  const {  formattedVector, formattedPlane, coordinates  } = values;
  const email = req.session.currentUserEmail;
  const result = null;

  res.render("planeQuestion", {email, vector: formattedVector, plane: formattedPlane, coordinates, result})
});

app.post('/plane-check-answer', function(req, res) {
  // var val = req.body.val;
  const email = req.session.currentUserEmail;
  const userInput = req.body.userInput;
  const coordinates = req.body.coordinates;
  const dbName = "Prog_Planes";
  
  const result = userInput === coordinates ? 'Correct!' : 'Incorrect!';
  if (result == 'Correct!'){
    var check = true;
  }
  else{
    var check = false;
  }
  updateProgTables(dbName, email, check)
  res.render("planeQuestion", { email, result});
})

app.get('/studentProgress', async (req, res) => {
  const email = req.session.currentUserEmail;

  const studentID = await getStudentIDByEmail(email);

  if (studentID === null) {
    res.status(404).send('Account not found');
    return;
  }

  const progressData = [];
  const tables = ["Progress", "Prog_Intersection", "Prog_Distance", "Prog_Planes"];

  async function getProgressData(table, callback) {
    try {
      const progressID = await getProgressID(studentID);

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

app.get('/teacherProgress', async (req, res) => {
  const email = req.session.currentUserEmail;

  try {
    const students = await getAllStudentsLinkedToTeacher(email);
    console.log("Linked Students:", students);

    const studentIDs = students.map((student) => student.StudentID);
    console.log("Student IDs:", studentIDs);

    const studentProgressData = await getStudentsProgressData(studentIDs, students);
    console.log(studentProgressData);
    res.render('teacherProgressPage', { studentProgressData, email });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/studentHomePage',(req, res) => {
  const email = req.session.currentUserEmail
  res.render('studentHome', {email})
});

function ProgessDatabase(StudentID) {
  let ProgressID;

  db.serialize(() => {
    db.run(
      `INSERT INTO Progress (StudentID, QuestionsAttempted, CorrectAnswers) VALUES (?, ?, ?)`,
      [StudentID, 0, 0],
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
  getStudentIDByEmail(email)
    .then((StudentID) => {
      if (StudentID !== null) {
        console.log(`StudentID for ${email}: ${StudentID}`);
        return getProgressID(StudentID);
      } else {
        console.log(`No StudentID found for ${email}`);
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
  db.run('UPDATE Student SET ClasscodeID = ? WHERE Email = ?',
  [classCode, email], function (err) {
    if (err) {
      console.error(err);
    } else {
      console.log("classcode added")
    }
  });
}

function checkPassword(email, password, tableName) {
  return new Promise((resolve, reject) => {
    if (!tableName) {
      resolve(false);
    } else {
      db.get(`SELECT Password FROM ${tableName} WHERE Email = ?`, [email], (err, row) => {
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
    }
  });
}

function studentOrTeacher(email) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.get('SELECT Password FROM Teacher WHERE Email = ?', [email], (err, teacherRow) => {
        if (err) {
          reject(err);
        } else if (teacherRow) {
          resolve('Teacher');
        } else {
          db.get('SELECT Password FROM Student WHERE Email = ?', [email], (err, studentRow) => {
            if (err) {
              reject(err);
            } else if (studentRow) {
              resolve('Student');
            } else {
              resolve(null);
            }
          });
        }
      });
    });
  });
}

function getName(email, table) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT Forename, Surname FROM ${table} WHERE Email = ?`, [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? { forename: row.Forename, surname: row.Surname } : null);
        }
      });
    });
}

function getProgressID(StudentID) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT ProgressID FROM Progress WHERE StudentID = ?',
      [StudentID],
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

function getStudentIDByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT StudentID FROM Student WHERE Email = ?',
      [email],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.StudentID : null);
        }
      }
    );
  });
}

function getTeacherID(email) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT TeacherID FROM Teacher WHERE Email = ?',
      [email],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.TeacherID : null);
        }
      }
    );
  });
}

async function getAllStudentsLinkedToTeacher(email) {
  return getTeacherID(email)
    .then((teacherID) => {
      if (teacherID) {
        return getClasscodeIDByTeacherID(teacherID)
          .then((classcodeID) => getStudentsByClasscodeID(classcodeID))
          
          .catch((err) => {
            console.log("no students liked")
            throw err;
          });
      } else {
        return null;
      }
    })
    .catch((err) => {
      console.error(err);
      throw err;
    });
}

function getClasscodeIDByTeacherID(teacherID) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT ClasscodeID FROM Classcode WHERE TeacherID = ?',
      [teacherID],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.ClasscodeID : null);
        }
      }
    );
  });
}

function getStudentsByClasscodeID(classcodeID) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT Forename, Surname, StudentID FROM Student WHERE ClasscodeID = ?',
      [classcodeID],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

async function getStudentsProgressData(studentIDs, students) {
  try {
    const progressData = [];
    const tables = ["Progress","Prog_Intersection", "Prog_Distance", "Prog_Planes"];

    for (const studentID of studentIDs) {
      // Find the student information in the array
      const studentInfo = students.find(student => student.StudentID === studentID);
      
      if (!studentInfo) {
        // Handle the case where student information is not found
        console.error(`Student information not found for ID: ${studentID}`);
        continue;
      }

      const progressID = await getProgressID(studentID);

      console.log(`Progress ID for ${studentID}:`, progressID);

      if (progressID !== null) {
        for (const table of tables) {
          const row = await getTableProgressData(table, progressID);
          console.log(`Progress Data for ${table}:`, row);
          if (row) {
            const totalQuestions = row.QuestionsAttempted;
            const correctAnswers = row.CorrectAnswers;
            const incorrectAnswers = totalQuestions - correctAnswers;

            progressData.push({
              studentID,
              forename: studentInfo.Forename,
              surname: studentInfo.Surname,
              table,
              correctAnswers,
              incorrectAnswers,
            });
          }
        }
      }
    }

    return progressData;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
async function getTableProgressData(table, progressID) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT QuestionsAttempted, CorrectAnswers FROM ${table} WHERE ProgressID = ?`,
      [progressID],
      (err, row) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
}

function getRandomBool() {
  const randomDecimal = Math.random();
  const randomNumber = 1 + randomDecimal;
  const randomInteger = Math.round(randomNumber);
  if (randomInteger == 1) {
    return true;
  }
  else {
    return false;
  }
}

server.listen(3000,function(){ 
    console.log("Server listening on port: 3000");
    console.log("Server is running on 'http://localhost:3000/'");
});