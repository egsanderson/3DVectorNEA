document.addEventListener("DOMContentLoaded", function () {
  const loginButton = document.getElementById("loginButton");
  const createAccountButton = document.getElementById("createAccountButton");
  const drawButton = document.getElementById("drawButton");
  const StudentprogressButton = document.getElementById("StudentprogressButton");
  //const questionButton = document.getElementById("questionsButton");
  const StudentprofileButton = document.getElementById("StudentprofileButton");
  // const profileButton = document.getElementById("profileButton");
  const intersectionButton = document.getElementById("intersectionButton");
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
      window.location.href = "/Stu-progress"
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
  if (intersectionButton) {
    intersectionButton.addEventListener("click", function () {
      window.location.href = "/intersection-questions";
    });
  }
  if (logoutButton) {
    logoutButton.addEventListener('click', function() {
      window.location.href = "/logout";
    });
  }

});
