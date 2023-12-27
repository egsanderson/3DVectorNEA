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
const bcrypt = require('bcrypt');


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
  
app.post('/add', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const accountType = req.body.account_type;

  if (!email || email.indexOf('@') === -1) {
    req.session.errorMessage = 'Invalid email format. Please enter a valid email address.';
    console.error(req.session.errorMessage);
    res.render('createAccount', { accountType, errorMessage: req.session.errorMessage });
    return;
  }
  
  if (password !== confirmPassword) {
    req.session.errorMessage = 'Passwords do not match. Please enter matching passwords.';
    console.error(req.session.errorMessage);
    res.render('createAccount', { accountType, errorMessage: req.session.errorMessage });
    return;
  }

  try {
    console.log(password);
    const hashedPassword = await hashPassword(password);

    if (accountType === "teacher") {
      const classCode = createClassCode();

      db.serialize(() => {
        db.run(
          'INSERT INTO Teacher(Forename, Surname, Email, Password) VALUES (?, ?, ?, ?)',
          [req.body.forename, req.body.surname, email, hashedPassword],
          function (err) {
            if (err) {
              req.session.errorMessage = err.message.includes('UNIQUE constraint failed') ?
                'The email already exists' : err.message;
              console.error(req.session.errorMessage);
              res.render('createAccount', { accountType, errorMessage: req.session.errorMessage });
            } else {
              getTeacherID(email)
                .then((teacherID) => {
                  db.run('INSERT INTO Classcode(ClasscodeID, TeacherID) VALUES (?, ?)',
                    [classCode, teacherID],
                    (err) => {
                      if (err) {
                        req.session.errorMessage = err.message.includes('UNIQUE constraint failed') ?
                          'The email already exists' : err.message;
                        console.error(req.session.errorMessage);
                        res.render('createAccount', { accountType, errorMessage: req.session.errorMessage });
                      } else {
                        console.log(`New ${accountType} has been added`);
                        //UPDATES
                        req.session.currentUserEmail = email;
                        req.session.forename = req.body.forename;
                        req.session.surname = req.body.surname;
                        req.session.id = teacherID;
                        req.session.classcode = classCode;
                        //UPDATES
                        res.render('Home', { email, role: "Teacher" });
                      }
                    });
                })
                .catch((err) => {
                  req.session.errorMessage = err.message.includes('UNIQUE constraint failed') ?
                    'The email already exists' : err.message;
                  console.error(req.session.errorMessage);
                  res.render('createAccount', { accountType, errorMessage: req.session.errorMessage });
                });
            }
          }
        );
      });
    } else {
      db.run('INSERT INTO Student(Forename, Surname, Email, Password) VALUES (?, ?, ?, ?)',
        [req.body.forename, req.body.surname, email, hashedPassword],
        function (err) {
          if (err) {
            req.session.errorMessage = err.message.includes('UNIQUE constraint failed') ?
              'The email already exists' : err.message;
            console.error(req.session.errorMessage);
            res.render('createAccount', { accountType, errorMessage: req.session.errorMessage });
          } else {
            console.log(`New ${accountType} has been added`);
            req.session.currentUserEmail = email;
            req.session.forename = req.body.forename;
            req.session.surname = req.body.surname;
            req.session.id = this.lastID;
            ProgessDatabase(this.lastID);
            res.render('classroomCodePopup.ejs', { email });
          }
        });
    }
  } catch (err) {
    console.error(err);
    req.session.errorMessage = err.message.includes('UNIQUE constraint failed') ?
      'The email already exists' : err.message;
    console.error(req.session.errorMessage);
    res.render('createAccount', { accountType, errorMessage: req.session.errorMessage });
  }
});


app.post('/login', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const accountType = await studentOrTeacher(email);
    const tableName = (accountType === 'Teacher') ? 'Teacher' : 'Student';
    const user = await getUserByEmail(email, tableName);

    console.log('Stored Hashed Password:', user.Password);

    console.log('Entered Password:', password);
    const match = await checkPassword(password, user.Password);

    if (match) {
      req.session.currentUserEmail = email;
      req.session.forename = user.Forename;
      req.session.surname = user.Surname;
      if (user.StudentID !== undefined) {
        const studentID = await getStudentIDByEmail(email);
        req.session.id = studentID;
        req.session.classcode = user.ClasscodeID;
      } else if (user.TeacherID !== undefined) {
        req.session.id = user.TeacherID
        const classcode = await getClasscodeIDByTeacherID(user.TeacherID);
        req.session.classcode = classcode
      }
      if (accountType && accountType.toLowerCase() === 'student') {
        res.render('home', { email, role: "Student" });
      } else if (accountType && accountType.toLowerCase() === 'teacher') {
        res.render('home', { email, role: "Teacher" });
      } else {
        res.render('login', { errorMessage: 'No Match' });
      }
    } else {
      res.render('login', { errorMessage: 'No Match' });
    }
  } catch (err) {
    console.error(err);
    res.render('login', { errorMessage: 'An error occurred' });
  }
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

app.get('/draw-page', async (req, res) => {
  try {
    const email = req.session.currentUserEmail;
    const role = await studentOrTeacher(email);
    console.log(role)
    req.session.errorMessage = req.session.errorMessage || null;
    res.render('drawVectorGraphic', { errorMessage: req.session.errorMessage, email, role });
  } catch (error) {
    console.error(error);
    req.session.errorMessage = "An error occurred while processing your request.";
    res.redirect('/draw-page');
  }
});

app.post('/studentAddCode', function(req, res) {
  console.log(req.body.classCode)
  const classCode = req.body.classCode
  const email = req.session.currentUserEmail;

  setClassCode(classCode, email)
  res.render('home', { email, role: "Student" });
});

app.get('/studentProfile-page', function(req,res) {
  const email = req.session.currentUserEmail
  //const table = "Student";
  const forename = req.session.forename;
  const surname = req.session.surname;
  res.render("studentProfile", {email, forename, surname})

});

app.get('/teacherProfile-page', async function(req, res) {
    try {
      const email = req.session.currentUserEmail;
      const val = "profile"
      const forename = req.session.forename;
      const surname = req.session.surname;
      const classcode = req.session.classcode

      res.render("teacherProfile", { email, forename, surname, classcode, val, resultString : null});

    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
    }
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
  var val = getRandomBool()
  console.log(val)
  if (val == true) {
    //line and plane
    var vector = new vectorCalculation.Vector()
    const values = vectorCalculation.PlaneVectorOperations.findPlaneIntersectionWithLine(vector);
    const {  formattedVector, formattedPlane, coordinates  } = values;
    const email = req.session.currentUserEmail;
    const result = null;
    res.render("planeQuestion", { email, vector : formattedVector, plane : formattedPlane, coordinates, result, val});
  }
  else if (val == false) {
    //converting equation type
    const email = req.session.currentUserEmail;
    const result = null;
    const values =  vectorCalculation.PlaneVectorOperations.convertFromVectorToCartesian();
    const {vectorPlane, cartesianPlane } = values;

    res.render("planeQuestion", {email, plane: vectorPlane, cartesian: cartesianPlane, result, val});
  }
});

app.post('/plane-check-answer', function(req, res) {
  const email = req.session.currentUserEmail;
  const userInput = req.body.userInput;
  const dbName = "Prog_Planes";
  const val = req.body.val;
  if (val == "true") {
    const coordinates = req.body.coordinates;
    const result = userInput === coordinates ? 'Correct!' : 'Incorrect!';
    if (result == 'Correct!'){
      var check = true;
    }
    else{
      var check = false;
    }
    updateProgTables(dbName, email, check)
    res.render("planeQuestion", { email, result});
  }
  else if (val == "false") {
    const cartesian = req.body.cartesian;
    const result = userInput === cartesian ? 'Correct!' : 'Incorrect!';
    if (result == 'Correct!'){
      var check = true;
    }
    else{
      var check = false;
    }
    updateProgTables(dbName, email, check)
    res.render("planeQuestion", { email, result});
  }

})

app.get('/studentProgress', async (req, res) => {
  const email = req.session.currentUserEmail;
  console.log(req.session.id)
  const studentID = await getStudentIDByEmail(email);
  console.log(studentID)
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

app.get('/HomePage', (req, res) => {
  const email = req.session.currentUserEmail;

  Promise.resolve(studentOrTeacher(email))
      .then((role) => {
          console.log(role);
          res.render('home', { email, role });
      })
      .catch((error) => {
          console.error(error);
          res.render('error', { errorMessage: 'An error occurred while processing the request.' });
      });
});

app.get('/viewStudents', async (req, res) => {
  const email = req.session.currentUserEmail;
  const forename = req.session.forename;
  const surname = req.session.surname;
  const val = "viewStudents";
  try {
      const rows = await getAllStudentDataForTeacher(email);
      console.log(rows)
      if (rows && rows.length > 0) {
        const formattedStrings = rows.map(student => {
          const fullName = `${student.Forename} ${student.Surname}`;
          const email = student.Email;
          return `${fullName} - ${email}`;
        });
        resultString = formattedStrings.join('<br>');
      } else {
        resultString = "You do not have any students linked to you yet";
      }
      console.log(resultString)
      res.render("teacherProfile", { email, forename, surname, val, resultString });
  } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/changeYourPassword', (req, res) => {
  const email = req.session.currentUserEmail;
  const forename = req.session.forename;
  const surname = req.session.surname;
  const val = "changeYourPassword";
  res.render("teacherProfile", { email, forename, surname, val, resultString : null});

});

app.post('/changePassword', async (req, res) => {
  const email = req.body.email;
  const oldPassword = req.body.password;
  const newPassword = req.body.newPassword;
  const confirmNewPassword = req.body.confirmPassword;
  const val = "changeYourPassword";
  var resultString;
  try {
    const accountType = await studentOrTeacher(email);
    const tableName = (accountType === 'Teacher') ? 'Teacher' : 'Student';
    const user = await getUserByEmail(email, tableName);

    console.log('Stored Hashed Password:', user.Password);

    const oldPasswordMatch = await checkPassword(oldPassword, user.Password);

    if (!oldPasswordMatch) {
      resultString = 'Incorrect current password';
      res.render("teacherProfile", { email, forename : req.session.forename, surname : req.session.surname, val, resultString});
      return;
    }

    if (newPassword !== confirmNewPassword) {
      resultString = 'New password and confirm new password do not match';
      res.render("teacherProfile", { email, forename : req.session.forename, surname : req.session.surname, val, resultString});
      return;
    }
    const hashedNewPassword = await hashPassword(newPassword);
    db.get(`UPDATE ${tableName} SET Password = ? WHERE Email = ?`, [hashedNewPassword, email], function(err) {
      if (err) {
        resultString = err.message;
        res.render("teacherProfile", { email, forename : req.session.forename, surname : req.session.surname, val, resultString});
      }
      else {
        console.log('Password has been successfully changed');
        res.render("teacherProfile", { email, forename : req.session.forename, surname : req.session.surname, val, resultString : "Sucessful!"});
      }
    });

  } catch (err) {
    console.error(err);
    resultString = 'An error occurred while changing the password';
    console.error(resultString);
    res.render("teacherProfile", { email, forename : req.session.forename, surname : req.session.surname, val, resultString});
  }
});

app.get('/deleteStudent', (req, res) => {
  const val = "deleteStudent1";
  const email = req.session.currentUserEmail;
  const forename = req.session.forename;
  const surname = req.session.surname;
  res.render("teacherProfile", { email, forename, surname, val, resultString : null});
});

app.post('/deleteStudentCheck', async (req,res) => {
  const studentEmail = req.body.email;
  const email = req.session.currentUserEmail
  const teacherClasscodeID = req.session.classcode;
  const forename = req.session.forename
  const surname = req.session.surname

  try {
    const studentInfo = await getUserByEmail(studentEmail, 'Student');

    if (!studentInfo) {
      const resultString = "That student doesn't exist.";
      const val = "deleteStudent1";
      res.render("teacherProfile", { email, forename, surname, val, resultString });
      return;
    }
    if (studentInfo.ClasscodeID !== teacherClasscodeID) {
      const resultString = "That student is not linked to you.";
      const val = "deleteStudent1";
      res.render("teacherProfile", { email, forename, surname, val, resultString });
      return;
    }
    const formattedString = `${studentInfo.Forename} ${studentInfo.Surname} - ${studentInfo.Email}`;
    const resultString = "Are you sure you wish to delete this student: " + formattedString + "<br>If you wish to continue then reenter students email";
    const val = "deleteStudent2";
    res.render("teacherProfile", { email, forename, surname, val, resultString });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/confirmDeleteStudent', async (req, res) => {
  const confirmation = req.body.confirmation;
  const studentEmail = req.body.Studentemail;
  const forename = req.session.forename;
  const surname = req.session.surname;
  const val = "deleteStudent1";
  const email = req.session.currentUserEmail
  if (confirmation === 'no') {
    const resultString = "Cancelled deletion.";
    res.render("teacherProfile", { email, forename, surname, val, resultString });
    return;
  }
  try {
    db.get("DELETE From Student WHERE Email = ?", [studentEmail], function(err) {
      if (err) {
        resultString = err
        res.render("teacherProfile", { email, forename, surname, val, resultString });
      }
      else {
        const resultString = "Student deleted successfully.";
        res.render("teacherProfile", { email, forename, surname, val, resultString });
      }
    })
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});


const hashPassword = (password) => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        reject(err);
      } else {
        resolve(hash);
      }
    });
  });
};

function getAllStudentDataForTeacher(email) {
  return getTeacherID(email)
    .then((teacherID) => {
      return getClasscodeIDByTeacherID(teacherID);
    })
    .then((classcodeID) => {
      return new Promise((resolve, reject) => {
        if (!classcodeID) {
          reject(new Error('ClasscodeID not found for the teacher.'));
          return;
        }

        db.all(
          'SELECT Forename, Surname, Email FROM Student WHERE ClasscodeID = ?',
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
    })
    .catch((error) => {
      console.error('Error:', error);
      throw error;
    });
}

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

function checkPassword(enteredPassword, storedPassword) {
  return new Promise(async (resolve, reject) => {
    try {
      const match = await bcrypt.compare(enteredPassword, storedPassword);

      console.log('bcrypt.compare Result:', match);

      if (!match) {
        console.log('Password comparison failed. Detailed comparison:');
        console.log('Entered Password (hashed):', await bcrypt.hash(enteredPassword, 10));
        console.log('Stored Password (hashed):', storedPassword);
      }

      resolve(match);
    } catch (err) {
      console.error('Error in checkPassword:', err);
      reject(err);
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

async function getClasscodeIDByTeacherID(teacherID) {
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

function getUserByEmail(email, tableName) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM ${tableName} WHERE Email = ?`;

    db.get(query, [email], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

async function getStudentsProgressData(studentIDs, students) {
  try {
    const progressData = [];
    const tables = ["Progress","Prog_Intersection", "Prog_Distance", "Prog_Planes"];

    for (const studentID of studentIDs) {
      const studentInfo = students.find(student => student.StudentID === studentID);
      
      if (!studentInfo) {
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
