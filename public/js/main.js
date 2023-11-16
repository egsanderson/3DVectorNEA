// public/main.js

document.addEventListener("DOMContentLoaded", function () {
    const loginButton = document.getElementById("loginButton");
    const createAccountButton = document.getElementById("createAccountButton")
    const drawButton = document.getElementById("drawButton")
    const questionButton = document.getElementById("questionsButton")
    const progressButton = document.getElementById("progressButton")
    const profileButton = document.getElementById("profileButton")
    const intersectionButton = document.getElementById("intersectionButton")
  
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
        window.location.href = "/vector-questions"
      })
    }
    if (progressButton) {
      progressButton.addEventListener("click", function () {
        console.log("progressButton ")
      })
    }
    if (profileButton) {
      profileButton.addEventListener("click", function () {
        console.log("profileButton ")
      })
    }
    if (intersectionButton) {
      intersectionButton.addEventListener("click", function () {
        window.location.href = "/intersection-questions"
      })
    }
  });

