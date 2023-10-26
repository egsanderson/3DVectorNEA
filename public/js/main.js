// public/main.js

document.addEventListener("DOMContentLoaded", function () {
    const loginButton = document.getElementById("loginButton");
    const createAccountButton = document.getElementById("createAccountButton")
    const drawButton = document.getElementById("drawButton")
    const questionButton = document.getElementById("questionsButton")
    const progressButton = document.getElementById("progressButton")
    const profileButton = document.getElementById("profileButton")
  
    if (loginButton) {
      loginButton.addEventListener("click", function () {
        window.location.href = "/login-page";
      });
    }
    if (createAccountButton) {
      createAccountButton.addEventListener("click", function () {
        window.location.href = "/createAccount-page"
      })
    }
    if (drawButton) {
      drawButton.addEventListener("click", function() {
        window.location.href = "/draw-page"
      })
    }
    if (questionButton) {
      questionButton.addEventListener("click", function () {
        console.log("question buttons")
      })
    }
    if (progressButton) {
      questionButton.addEventListener("click", function () {
        console.log("progressButton ")
      })
    }
    if (profileButton) {
      questionButton.addEventListener("click", function () {
        console.log("profileButton ")
      })
    }
  });

