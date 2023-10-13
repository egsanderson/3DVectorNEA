// public/main.js

document.addEventListener("DOMContentLoaded", function () {
    const loginButton = document.getElementById("loginButton");
    const createAccountButton = document.getElementById("createAccountButton")
    const drawButton = document.getElementById("drawButton")
  
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
  });

