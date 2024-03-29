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

var db = new sqlite3.Database('./database/UserAccounts.sqlite');

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
                  console.log(`New ${accountType} has been added`);
                  req.session.currentUserEmail = email;
                  req.session.forename = req.body.forename;
                  req.session.surname = req.body.surname;
                  req.session.CurrentId = teacherID;
                  res.render('Home', { email, role: "Teacher" });
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
            req.session.CurrentId = this.lastID;
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
        req.session.CurrentId = studentID;
      } else if (user.TeacherID !== undefined) {
        const teacherID = await getTeacherID(email);
        req.session.CurrentId = teacherID
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
  console.log(req.body.teacherID)
  const teacherID = req.body.teacherID
  const email = req.session.currentUserEmail;
  setUpClassLink(teacherID, email)
  res.render('home', { email, role: "Student" });
});

app.get('/studentProfile-page', function(req,res) {
  const email = req.session.currentUserEmail
  //const table = "Student";
  const forename = req.session.forename;
  const surname = req.session.surname;
  const resultString = null
  res.render("studentProfile", {email, forename, surname, resultString})

});

app.get('/teacherProfile-page', async function(req, res) {
    try {
      const email = req.session.currentUserEmail;
      const val = "profile"
      const forename = req.session.forename;
      const surname = req.session.surname;
      const id = req.session.CurrentId

      res.render("teacherProfile", { email, forename, surname, id, val, resultString : null});

    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
    }
});
  
app.get('/intersection-questions', (req, res) => {
  const { vector1, vector2, coordinates } = vectorCalculation.IntersectionVectorOperations.getIntersectingVectorsAndCoordinates();
  const result = null;
  const hint = null;
  const email = req.session.currentUserEmail;
  console.log(coordinates)
  res.render("intersectionQuestion", { email, vector1, vector2, coordinates, result, hint });
});

app.post("/intersection-check-answer", function(req, res) {
  const email = req.session.currentUserEmail;
  const userInput = req.body.userInput;
  const vector1 = req.body.vector1;
  const vector2 = req.body.vector2;
  const coordinates = req.body.coordinates;
  const dbName = "Prog_Intersection";
  var result = userInput === coordinates ? 'Correct!' : 'Incorrect!';
  if (result == 'Correct!'){
    var check = true;
  }
  else{
    var check = false;
  }
  result = result + " Answer was " + coordinates + " !";
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
    console.log(distance)
    res.render("distanceQuestion", { email, vector1 : formatVector1, vector2 : formatVector2, distance, result, val});
  }
  else if (val == false) {
    const vector = new vectorCalculation.Vector();
    const values = vectorCalculation.DistanceVectorOperations.findShortestDistanceToPoint(vector);
    const result = null;

    const { point, distance } = values;
    const email = req.session.currentUserEmail;
    console.log(distance)
    const formattedVector = vector.formatVector("p", "");

    res.render("distanceQuestion", { email, vector : formattedVector, point, distance, result, val});
  }
});

app.post('/distance-check-answer', function(req, res) {
  const email = req.session.currentUserEmail;
  const userInput = req.body.userInput;
  const distance = req.body.distance;
  const dbName = "Prog_Distance";
  
  var result = userInput === distance ? 'Correct!' : 'Incorrect!';
  if (result == 'Correct!'){
    var check = true;
  }
  else{
    var check = false;
  }
  result = result + " Answer was " + distance + " !";

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
    console.log(coordinates)
    res.render("planeQuestion", { email, vector : formattedVector, plane : formattedPlane, coordinates, result, val});
  }
  else if (val == false) {
    //converting equation type
    const email = req.session.currentUserEmail;
    const result = null;
    const values =  vectorCalculation.PlaneVectorOperations.convertFromVectorToCartesian();
    const {vectorPlane, cartesianPlane } = values;
    console.log(cartesianPlane)
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
    var result = userInput === coordinates ? 'Correct!' : 'Incorrect!';
    if (result == 'Correct!'){
      var check = true;
    }
    else{
      var check = false;
    }
    result = result + " Answer was " + coordinates + " !";
    updateProgTables(dbName, email, check)
    res.render("planeQuestion", { email, result});
  }
  else if (val == "false") {
    const cartesian = req.body.cartesian;
    var result = userInput === cartesian ? 'Correct!' : 'Incorrect!';
    if (result == 'Correct!'){
      var check = true;
    }
    else{
      var check = false;
    }
    result = result + " Answer was " + cartesian + " !";

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
    const teacherID = req.session.CurrentId;
    
    if (!teacherID) {
      console.log("TeacherID not found for the given email");
      return res.status(404).send('Teacher not found');
    }

    const students = await getStudentsByTeacherID(teacherID);

    if (!students || students.length === 0) {
      resultString = "You do not have any students linked to you yet";
    } else {
      const formattedStrings = students.map(student => {
        const fullName = `${student.Forename} ${student.Surname}`;
        const email = student.Email;
        return `${fullName} - ${email}`;
      });

      resultString = formattedStrings.join('<br>');
    }

    console.log(resultString);
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
  const email = req.session.currentUserEmail;
  const teacherID = req.session.CurrentId;
  const forename = req.session.forename;
  const surname = req.session.surname;

  try {
    const studentInfo = await getUserByEmailWithClasscode(studentEmail, 'Student', teacherID);

    if (!studentInfo) {
      const resultString = "That student doesn't exist.";
      const val = "deleteStudent1";
      return res.render("teacherProfile", { email, forename, surname, val, resultString });
    }

    const formattedString = `${studentInfo.Forename} ${studentInfo.Surname} - ${studentInfo.Email}`;
    const resultString = `Are you sure you wish to delete this student: ${formattedString}<br>If you wish to continue then reenter student's email`;
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
  const email = req.session.currentUserEmail;

  if (confirmation === 'no') {
    const resultString = "Cancelled deletion.";
    res.render("teacherProfile", { email, forename, surname, val, resultString });
    return;
  }

  try {
    console.log(`Deleting student with email: ${studentEmail}`);

    db.run("BEGIN TRANSACTION");

    const studentID = await getStudentIDByEmail(studentEmail);

    if (!studentID) {
      throw new Error(`Student not found with email: ${studentEmail}`);
    }

    const progressID = await getProgressID(studentID);
    db.run("DELETE FROM Prog_Intersection WHERE ProgressID = ?", [progressID]);
    db.run("DELETE FROM Prog_Distance WHERE ProgressID = ?", [progressID]);
    db.run("DELETE FROM Prog_Planes WHERE ProgressID = ?", [progressID]);
    db.run("DELETE FROM Progress WHERE StudentID = ?", [studentID]);
    db.run("DELETE FROM Student WHERE Email = ?", [studentEmail]);
    db.run("DELETE FROM Classcode WHERE StudentID = ?", [studentID]);

    console.log(`Deletion successful for student with email: ${studentEmail}`);
    db.run("COMMIT");
    
    const resultString = "Student deleted successfully.";
    res.render("teacherProfile", { email, forename, surname, val, resultString });

  } catch (error) {
    console.error('Error:', error);
    db.run("ROLLBACK");
    res.status(500).send('Internal Server Error');
  }
});

app.get('/addStudent', (req, res) => {
  console.log("Add student")
  const val = "addStudent";
  const email = req.session.currentUserEmail;
  const forename = req.session.forename;
  const surname = req.session.surname;
  res.render("teacherProfile", { email, forename, surname, val, resultString : null });
});

app.post('/addStudentForm', async (req, res) => {
  const currentUserEmail = req.session.currentUserEmail;
  const forename = req.session.forename;
  const surname = req.session.surname;
  const teacherID = req.session.CurrentId;
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const accountType = "student"; 

  if (!email || email.indexOf('@') === -1) {
    const resultString = 'Invalid email format. Please enter a valid email address.';
    res.render("teacherProfile", { email: currentUserEmail, forename, surname, val: "addStudent", resultString });
    return;
  }

  if (password !== confirmPassword) {
    const resultString = 'Passwords do not match. Please enter matching passwords.';
    res.render("teacherProfile", { email: currentUserEmail, forename, surname, val: "addStudent", resultString });
    return;
  }

  try {
    const hashedPassword = await hashPassword(password);

    db.run(
      'INSERT INTO Student(Forename, Surname, Email, Password) VALUES (?, ?, ?, ?)',
      [req.body.forename, req.body.surname, email, hashedPassword],
      async function (err) {
        if (err) {
          const resultString = err.message.includes('UNIQUE constraint failed') ?
            'The email already exists' : err.message;
          res.render("teacherProfile", { email: currentUserEmail, forename, surname, val: "addStudent", resultString });
        } else {
          const studentID = this.lastID;
          ProgessDatabase(this.lastID);

          db.run(
            'INSERT INTO Classcode(TeacherID, StudentID) VALUES (?, ?)',
            [teacherID, studentID],
            function (err) {
              if (err) {
                console.error(err);
                const resultString = 'An error occurred while adding the student.';
                res.render("teacherProfile", { email: currentUserEmail, forename, surname, val: "addStudent", resultString });
              } else {
                const resultString = `New ${accountType} has been added`
                res.render("teacherProfile", { email: currentUserEmail, forename, surname, val: "addStudent", resultString });
              }
            }
          );
        }
      }
    );
  } catch (err) {
    console.error(err);
    const resultString = err.message.includes('UNIQUE constraint failed') ?
      'The email already exists' : err.message;
    res.render("teacherProfile", { email: currentUserEmail, forename, surname, val: "addStudent", resultString });
  }
});

app.post('/changeStudentPassword', async (req, res) => {
  const email = req.body.email;
  const currentUserEmail = req.session.currentUserEmail;
  const newStudentPassword = req.body.newPassword;
  const confirmNewStudentPassword = req.body.confirmPassword;
  const val = "changeStudentPassword";
  let resultString;

  try {
    const user = await getUserByEmailWithClasscode(email, 'Student', req.session.CurrentId);

    if (!user) {
      resultString = 'No student found with the provided email or the student is not linked to you.';
      return res.render("teacherProfile", { email: currentUserEmail, forename: req.session.forename, surname: req.session.surname, val, resultString });
    }

    console.log('Stored Hashed Password:', user.Password);

    if (newStudentPassword !== confirmNewStudentPassword) {
      resultString = 'New password and confirm new password do not match';
      return res.render("teacherProfile", { email: currentUserEmail, forename: req.session.forename, surname: req.session.surname, val, resultString });
    }

    const hashedNewPassword = await hashPassword(newStudentPassword);
    db.run(`UPDATE Student SET Password = ? WHERE Email = ?`, [hashedNewPassword, email], function (err) {
      if (err) {
        console.error(err);
        resultString = 'An error occurred while changing the password';
      } else {
        console.log('Password has been successfully changed');
        resultString = 'Password successfully changed!';
      }
      res.render("teacherProfile", { email: currentUserEmail, forename: req.session.forename, surname: req.session.surname, val, resultString });
    });
  } catch (err) {
    console.error(err);
    resultString = 'An error occurred while changing the password';
    res.render("teacherProfile", { email: currentUserEmail, forename: req.session.forename, surname: req.session.surname, val, resultString });
  }
});

app.get('/changeStudentPassword-page', (req, res) => {
  const val = "changeStudentPassword";
  const email = req.session.currentUserEmail;
  const forename = req.session.forename;
  const surname = req.session.surname;
  res.render("teacherProfile", { email, forename, surname, val, resultString : null });
});

app.post('/changeMyStudentPassword', async (req, res) => {
  const email = req.body.email;
  const forename = req.session.forename;
  const surname = req.session.surname;
  const newStudentPassword = req.body.newPassword;
  const confirmNewStudentPassword = req.body.confirmPassword;
  let resultString;

  try {
    if (newStudentPassword !== confirmNewStudentPassword) {
      resultString = 'New password and confirm new password do not match';
      res.render("studentProfile", { email, forename, surname, resultString });
      return;
    }
    const hashedNewPassword = await hashPassword(newStudentPassword);
    db.run(`UPDATE Student SET Password = ? WHERE Email = ?`, [hashedNewPassword, email], function(err) {
      if (err) {
        console.error(err);
        resultString = 'An error occurred while changing the password';
        res.render("studentProfile", { email, forename, surname, resultString });
      } else {
        resultString = 'Password has been successfully changed';
        res.render("studentProfile", { email, forename, surname, resultString });
      }
    });

  } catch (err) {
    console.error(err);
    resultString = 'An error occurred while changing the password';
    res.render("studentProfile", { email, forename, surname, resultString });
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

async function getStudentsByTeacherID(teacherID) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT Forename, Surname, Email FROM Student WHERE StudentID IN (SELECT StudentID FROM Classcode WHERE TeacherID = ?)',
      [teacherID],
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

function setUpClassLink(TeacherID, email) {
  getStudentIDByEmail(email)
    .then((studentID) => {
      if (studentID !== null) {
        db.run('INSERT INTO Classcode (TeacherID, StudentID) VALUES (?, ?)', [TeacherID, studentID], function (err) {
          if (err) {
            console.error(err);
          } else {
            console.log("Link made");
          }
        });
      } else {
        console.log("Student not found for the given email");
      }
    })
    .catch((err) => {
      console.error(err);
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

function getUserByEmailWithClasscode(email, tableName, teacherID) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM ${tableName} WHERE Email = ?`;

    db.get(query, [email], (err, row) => {
      if (err) {
        reject(err);
      } else {
        if (row) {
          const studentID = row.StudentID; // Assuming you have StudentID in the row
          db.get('SELECT * FROM Classcode WHERE TeacherID = ? AND StudentID = ?', [teacherID, studentID], (err, classcodeRow) => {
            if (err) {
              reject(err);
            } else {
              if (classcodeRow) {
                resolve(row); // Student is linked to the teacher
              } else {
                resolve(null); // Student is not linked to the teacher
              }
            }
          });
        } else {
          resolve(null); 
        }
      }
    });
  });
}

async function getAllStudentsLinkedToTeacher(email) {
  try {
    const teacherID = await getTeacherID(email);
    if (!teacherID) {
      console.log("Teacher not found with email:", email);
      return [];
    }

    const classcodeRows = await getClasscodesByTeacherID(teacherID);
    if (!classcodeRows || classcodeRows.length === 0) {
      console.log("No classcodes found for teacher:", teacherID);
      return [];
    }
    console.log(classcodeRows);
    const studentIDs = classcodeRows.map(row => row.StudentID);
    console.log(studentIDs);
    const students = await getStudentsByIDs(studentIDs);

    return students;
  } catch (error) {
    console.error("Error retrieving students linked to teacher:", error);
    throw error;
  }
}

async function getClasscodesByTeacherID(teacherID) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT StudentID FROM Classcode WHERE TeacherID = ?',
      [teacherID],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          console.log(rows);
          resolve(rows);
        }
      }
    );
  });
}

async function getStudentsByIDs(studentIDs) {
  return new Promise((resolve, reject) => {
    const placeholders = studentIDs.map(() => '?').join(', ');
    const query = `SELECT Forename, Surname, StudentID FROM Student WHERE StudentID IN (${placeholders})`;

    db.all(
      query,
      studentIDs,
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


