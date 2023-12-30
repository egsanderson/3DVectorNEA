document.addEventListener("DOMContentLoaded", function () {
  const loginButton = document.getElementById("loginButton");
  const createAccountButton = document.getElementById("createAccountButton");
  const drawButton = document.getElementById("drawButton");
  const StudentprogressButton = document.getElementById("StudentprogressButton");
  const StudentprofileButton = document.getElementById("StudentprofileButton");
  const Teacherprofilebutton = document.getElementById("Teacherprofilebutton");
  const ViewStudents = document.getElementById("ViewStudents");
  const ChangeYourPassword = document.getElementById("ChangeYourPassword");
  const DeleteStudent = document.getElementById("DeleteStudent");
  const ClassprogressButton = document.getElementById("ClassprogressButton");
  const AddStudent = document.getElementById("AddStudent");
  const intersectionButton = document.getElementById("intersectionButton");
  const distanceButton = document.getElementById("distanceButton");
  const planesButton = document.getElementById("planesButton")
  const ChangeStudentPassword = document.getElementById("ChangeStudentPassword");

  
  
  const logoutButton = document.getElementById('logoutButton')
  if (loginButton) {
    loginButton.addEventListener("click", function () {
      window.location.href = "/login-page";
    });
  }
  if (createAccountButton) {
    createAccountButton.addEventListener("click", function () {
      window.location.href = "/createAccount-page";
    });
  }
  if (StudentprogressButton) {
    StudentprogressButton.addEventListener("click", function() {
      window.location.href = "/studentProgress"
    })
  }
  if (drawButton) {
    drawButton.addEventListener("click", function () {
        window.location.href = "/draw-page";
    });
  }
  if (StudentprofileButton) {
    StudentprofileButton.addEventListener("click", function () {
      window.location.href = "/studentProfile-page";
    });
  }
  if (Teacherprofilebutton) {
    Teacherprofilebutton.addEventListener("click", function () {
      window.location.href = "/teacherProfile-page";
    });
  }
  if (ClassprogressButton) {
    ClassprogressButton.addEventListener("click", function () {
      window.location.href = "/teacherProgress";
    });
  }
  if (intersectionButton) {
    intersectionButton.addEventListener("click", function () {
      window.location.href = "/intersection-questions";
    });
  }
  if (distanceButton) {
    distanceButton.addEventListener("click", function () {
      window.location.href = "/distance-questions";
    });
  }
  if (planesButton) {
    planesButton.addEventListener("click", function () {
      window.location.href = "/plane-questions";
    });
  }
  if (logoutButton) {
    logoutButton.addEventListener('click', function() {
      window.location.href = "/logout";
    });
  }
  if (ViewStudents) {
    ViewStudents.addEventListener('click', function() {
      window.location.href = "/viewStudents";
    });
  }
  if (ChangeYourPassword) {
    ChangeYourPassword.addEventListener('click', function() {
      window.location.href = "/changeYourPassword";
    });
  }
  if (DeleteStudent) {
    DeleteStudent.addEventListener('click', function() {
      window.location.href = "/deleteStudent";
    });
  }
  if (AddStudent) {
    AddStudent.addEventListener('click', function() {
      window.location.href = "/addStudent";
    });
  }
  if (ChangeStudentPassword) {
    ChangeStudentPassword.addEventListener('click', function() {
      window.location.href = "/changeStudentPassword-page";
    });
  }
});

