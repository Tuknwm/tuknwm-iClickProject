// Initialize variables
let nilaiKlik = 0;
let permainanSelesai = false;
let sedangBermain = false;
let waktuPermainan = 5;
let modeKlik = "mouse";
let isPlaying = false;
let spaceKeyPressed = false;

// Get required HTML elements
let tombolMain = document.querySelector(".ButtonPlay");
let tombolUlang = document.querySelector(".BoxRestart");
let tombolMode = document.getElementById("modeButton");
let tombolModeGame = document.getElementById("ModeGameButton");
let textTimer = document.querySelector(".BoxWaktu .time-value");
let textKecepatan = document.querySelector(".BoxKecepatan .speed-value");
let textNilai = document.querySelector(".BoxNilai .score-value");
let modeText = document.getElementById("modeText");

// Click sound effects
const mouseClickSound = new Audio("/sfx/klik2.mp3");
const keyboardClickSound = new Audio("/sfx/spacebar.mp3");
const countdownSound = new Audio("/sfx/countdown.mp3");
const bgMusic = new Audio("/sfx/Lofi.mp3");

function playMouseClickSound() {
  mouseClickSound.currentTime = 0;
  mouseClickSound.play();
}

function playKeyboardClickSound() {
  keyboardClickSound.currentTime = 0;
  keyboardClickSound.play();
}

tombolMain.addEventListener("click", function (event) {
  if (modeKlik === "mouse") {
    playMouseClickSound();
  }
});

document.addEventListener("keydown", function (event) {
  if (modeKlik === "keyboard" && event.code === "Space" && !spaceKeyPressed) {
    spaceKeyPressed = true;
    playKeyboardClickSound();
    buatEfekRippleKeyboard();
    if (sedangBermain) {
      nilaiKlik++;
    }
  }
});


document.addEventListener("keyup", function (event) {
  if (event.code === "Space") {
    spaceKeyPressed = false;
  }
});

tombolUlang.style.display = "none";

// Switch game time mode
function gantiMode() {
  if (!sedangBermain) {
    if (waktuPermainan === 5) {
      waktuPermainan = 10;
    } else if (waktuPermainan === 10) {
      waktuPermainan = 15;
    } else {
      waktuPermainan = 5;
    }
    tombolMode.innerText = waktuPermainan + " Seconds";
  }
}

function gantiModeGame() {
  modeKlik = modeKlik === "mouse" ? "keyboard" : "mouse";
  tombolModeGame.innerText =
    modeKlik === "keyboard" ? "Keyboard (Space)" : "Mouse (Click)";
}

[tombolMode, tombolModeGame].forEach((button) => {
  button.addEventListener("keydown", function (event) {
    if (event.code === "Space") {
      event.preventDefault();
    }
  });
});

// Calculate clicks per second
function hitungKecepatan(klik, waktu) {
  return (klik / waktu).toFixed(2);
}

// Start game with countdown
function mulaiPermainan() {
  if (!sedangBermain && !permainanSelesai) {
    sedangBermain = true;
    tombolMain.innerHTML = "[ 3 ]";

    tombolMode.disabled = true;
    tombolModeGame.disabled = true;

    let countdown = 4;
    let hitungMundur = setInterval(function () {
      countdownSound.currentTime = 0;
      countdownSound.play();
      countdown--;
      if (countdown > 0) {
        tombolMain.innerHTML = "[ " + countdown + " ]";
      } else {
        clearInterval(hitungMundur);
        mulaiGameAsli();
      }
    }, 1000);
  }
}

// Start actual game after countdown
function mulaiGameAsli() {
  nilaiKlik = 0;
  permainanSelesai = false;
  tombolMain.innerHTML = "Click as fast as you can!";
  tombolUlang.style.display = "none";

  let waktuMulai = Date.now();

  let hitungWaktu = setInterval(function () {
    let waktuBerjalan = (Date.now() - waktuMulai) / 1000;
    textTimer.innerHTML = waktuBerjalan.toFixed(2) + "s";
    textKecepatan.innerHTML =
      hitungKecepatan(nilaiKlik, waktuBerjalan) + " clicks/s";
    textNilai.innerHTML = nilaiKlik;

    if (waktuBerjalan >= waktuPermainan) {
      clearInterval(hitungWaktu);
      akhirPermainan();
    }
  }, 100);
}

// Handle button click
function klikDilakukan(event) {
  if (sedangBermain && modeKlik === "mouse" && event.type === "click") {
    nilaiKlik++;
  }
}

// End game
function akhirPermainan() {
  sedangBermain = false;
  permainanSelesai = true;

  tombolMode.disabled = false;
  tombolModeGame.disabled = false;

  console.log(waktuPermainan);
  let gambarPeringkat = "/image/jangkrik.png";
  let teksPeringkat = "Keep going and try again!";

  if (waktuPermainan === 5) {
    if (nilaiKlik >= 50) {
      gambarPeringkat = "/image/cheetah.png";
      teksPeringkat = "Rank = Legend\n Incredible speed!";
    } else if (nilaiKlik >= 30) {
      gambarPeringkat = "/image/kelinci.png";
      teksPeringkat = "Rank = Pro\n Not bad at all! 😁";
    } else if (nilaiKlik >= 10) {
      gambarPeringkat = "/image/kura2.png";
      teksPeringkat = "Rank = Amateur\n Keep going and try again!";
    }
  } else if (waktuPermainan === 10) {
    if (nilaiKlik >= 100) {
      gambarPeringkat = "/image/cheetah.png";
      teksPeringkat = "Rank = Legend\n Incredible speed!";
    } else if (nilaiKlik >= 60) {
      gambarPeringkat = "/image/kelinci.png";
      teksPeringkat = "Rank = Pro\n Not bad at all! 😁";
    } else if (nilaiKlik >= 30) {
      gambarPeringkat = "/image/kura2.png";
      teksPeringkat = "Rank = Amateur\n Keep going and try again!";
    }
  } else if (waktuPermainan === 15) {
    if (nilaiKlik >= 150) {
      gambarPeringkat = "/image/cheetah.png";
      teksPeringkat = "Rank = Legend\n Incredible speed!";
    } else if (nilaiKlik >= 100) {
      gambarPeringkat = "/image/kelinci.png";
      teksPeringkat = "Rank = Pro\n Not bad at all! 😁";
    } else if (nilaiKlik >= 50) {
      gambarPeringkat = "/image/kura2.png";
      teksPeringkat = "Rank = Amateur\n Keep going and try again!";
    }
  }

  tombolMain.innerHTML = "Game Over!";

  let imgRank = document.getElementById("rankImage");
  let textRank = document.getElementById("rankText");

  imgRank.src = gambarPeringkat;
  imgRank.classList.remove("hidden");
  imgRank.classList.add("fade-in");

  textRank.innerText = teksPeringkat;
  textRank.classList.remove("hidden");
  textRank.classList.add("fade-in");

  const scoreData = {
    score: nilaiKlik,
    timemode: waktuPermainan,
    clickmode: modeKlik
  };

  tampilkanHasil();
}

// Show game results and switch to result.css
function tampilkanHasil() {
  document.querySelector(".RoundedBox").classList.add("fade-out");

  setTimeout(() => {
    document.querySelector(".RoundedBox").classList.add("hidden");

    document.getElementById("resultContainer").classList.remove("hidden");
    document.getElementById("resultContainer").classList.remove("fade-out");
    document.getElementById("resultContainer").classList.add("fade-in");

    document.getElementById("speedValue").innerText = hitungKecepatan(
      nilaiKlik,
      waktuPermainan
    );
    document.getElementById("timeValue").innerText = waktuPermainan;
    document.getElementById("scoreValue").innerText = nilaiKlik;

    if (modeKlik === "keyboard") {
      modeText.innerText = "Mode: Keyboard (Space)";
    } else {
      modeText.innerText = "Mode: Mouse (Click)";
    }

    document.getElementById("restartButton").style.display = "flex";

    loadLeaderboard(waktuPermainan, modeKlik);
  }, 500);
}

// Restart game
function ulangPermainan() {
  document.getElementById("resultContainer").classList.add("fade-out");

  setTimeout(() => {
    document.getElementById("resultContainer").classList.add("hidden");

    document.querySelector(".RoundedBox").classList.remove("hidden");
    document.querySelector(".RoundedBox").classList.remove("fade-out");
    document.querySelector(".RoundedBox").classList.add("fade-in");

    textTimer.innerHTML = " ";
    textKecepatan.innerHTML = " ";
    textNilai.innerHTML = " ";
    tombolMain.innerHTML = "Click here to start 🔥";
    nilaiKlik = 0;
    sedangBermain = false;
    permainanSelesai = false;
    
    document.getElementById("restartButton").style.display = "none";
    let imgRank = document.getElementById("rankImage");
    let textRank = document.getElementById("rankText");
    imgRank.classList.add("hidden");
    textRank.classList.add("hidden");
  }, 500);
}

// Ripple effect on button click
function buatEfekRipple(event) {
  let tombol = event.currentTarget;
  let ripple = document.createElement("span");

  ripple.classList.add("ripple");
  ripple.style.width = Math.max(tombol.offsetWidth, tombol.offsetHeight) + "px";
  ripple.style.height =
    Math.max(tombol.offsetWidth, tombol.offsetHeight) + "px";
  ripple.style.left = event.offsetX - ripple.offsetWidth / 2 + "px";
  ripple.style.top = event.offsetY - ripple.offsetHeight / 2 + "px";

  tombol.appendChild(ripple);

  setTimeout(function () {
    ripple.remove();
  }, 600);
}

// Ripple effect on spacebar press
function buatEfekRippleKeyboard() {
  let tombol = tombolMain;
  let ripple = document.createElement("span");

  ripple.classList.add("ripple");
  ripple.style.width = Math.max(tombol.offsetWidth, tombol.offsetHeight) + "px";
  ripple.style.height =
    Math.max(tombol.offsetWidth, tombol.offsetHeight) + "px";

  ripple.style.left = tombol.offsetWidth / 2 - ripple.offsetWidth / 2 + "px";
  ripple.style.top = tombol.offsetHeight / 2 - ripple.offsetHeight / 2 + "px";

  tombol.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 600);
}

document.body.addEventListener("click", function (event) {
  if (permainanSelesai && !event.target.classList.contains("BoxRestart")) {
    return;
  }
});

// Event listeners for game buttons
tombolMain.addEventListener("click", mulaiPermainan);
tombolUlang.addEventListener("click", ulangPermainan);
tombolMode.addEventListener("click", gantiMode);
tombolModeGame.addEventListener("click", gantiModeGame);
tombolMain.addEventListener("click", klikDilakukan);
tombolMain.addEventListener("click", buatEfekRipple);
tombolUlang.addEventListener("click", buatEfekRipple);

function playClickSound() {
  clickSound.currentTime = 0;
  clickSound.play();
}

document
  .getElementById("startButton")
  .addEventListener("click", playClickSound);

// Background music
function toggleMusic() {
  if (isPlaying) {
    bgMusic.pause();
    isPlaying = false;
  } else {
    bgMusic.play();
    isPlaying = true;
    bgMusic.loop = true;
  }
}


// Load leaderboard (no backend — show empty state)
function loadLeaderboard(timeMode, clickMode) {
  const leaderboardContainer = document.querySelector(".BoxLeaderBoard");
  leaderboardContainer.innerHTML = '<p>LeaderBoard</p><div class="leaderboard-empty">No scores available</div>';
}