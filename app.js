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

var app = express();
var server = http.createServer(app);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
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
  
app.post('/add', (req, res) => {
  const email = req.body.email;
  if (!email || email.indexOf('@') === -1) {
    req.session.errorMessage = 'Invalid email format. Please enter a valid email address.'
    res.redirect("/createAccount-page")
  }
  db.serialize(() => {
    db.run('INSERT INTO Accounts(Forename, Surname, Email, Password, Classroom, AccountType) VALUES (?, ?, ?, ?, ?, ?)',
    [req.body.forename, req.body.surname, req.body.email, req.body.password, null, req.body.account_type], function(err) {
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

  studentOrTeacher(email)
    .then((accounttype) => checkPassword(email, password).then((match) => ({ accounttype, match })))
    .then(({ accounttype, match }) => {
      if (match) {
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

app.get('/otherforms', (req,res) => {
  if (req.session) {
    const email = req.session.email;
    res.render('otherForms', { email });
  } else {
    res.send('Session not found. Please log in.');
  }
})

app.get('/draw-page', (req,res) => {
  req.session.errorMessage = req.session.errorMessage || null;
  res.render('drawVectorGraphic', { errorMessage: req.session.errorMessage });
})

app.post('/studentAddCode', function(req, res) {
  console.log(req.body.classCode)
  classCode = req.body.classCode
  setClassCode(classCode, req.body.email)
 res.render("studentHome", {email : req.body.email})
});

app.get('/vector-questions', (req, res) => {
  res.render("vectorQuestionPage",)
});

app.get('/intersection-questions', (req, res) => {
  res.render("intersectionQuestion",)
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
  
// function checkPassword(email, password) {
//   var match = false;
//   db.get("SELECT Password FROM Accounts WHERE Email = ?", [email], function(err, row) {
//     if (err) {
//       console.log(err);
//     } else {
//       console.log(password)
//       console.log(row.Password)
//       if (password == row.Password){
//         match = true;
//       }
//       else {
//         match = false
//       }
//     }
//   })
//   console.log(match)
//   return match;
// }

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

// function studentOrTeacher(email){
//   var type = "";
//   db.get("SELECT AccountType FROM Accounts WHERE Email = ?", [email], function(err, row) {
//     if (err) {
//       console.log(err);
//     } else {
//       type = row.AccountType
//       console.log(row.AccountType);
//     }
//   })
//   return type;
// }

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

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

server.listen(3000,function(){ 
    console.log("Server listening on port: 3000");
    console.log("Server is running on 'http://localhost:3000/'");
});