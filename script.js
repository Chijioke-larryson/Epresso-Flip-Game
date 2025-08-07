let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let totalFlips = 0;
let gameStarted = false;
let startTime;
let timerInterval;
let images = [];
let volume = 0.5;
let matchSoundCooldown = false;
let touchLock = false;
let playerName = '';
let currentDifficulty = 'expert';


const gameBoard = document.getElementById('gameBoard');
const timeDisplay = document.getElementById('time');
const flipsDisplay = document.getElementById('flips');
const matchesDisplay = document.getElementById('matches');
const instructionText = document.getElementById('instructionText');
const instructionBtn = document.getElementById('instructionBtn');
const playerNameInput = document.getElementById('playerName');
const startText = document.getElementById('startText');
const winText = document.getElementById('winText');
const scoreText = document.getElementById('scoreText');
const leaderboard = document.getElementById('leaderboard');
const leaderboardBodies = {
    easy: document.getElementById('leaderboardBody-easy'),
    medium: document.getElementById('leaderboardBody-medium'),
    hard: document.getElementById('leaderboardBody-hard'),
    expert: document.getElementById('leaderboardBody-expert')
};
const restartBtn = document.getElementById('restartBtn');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
const levelSelect = document.getElementById('level');
const volumeControl = document.getElementById('volume');

const flipSound = new Audio('Assets/sound/flip.mp3');
const matchSound = new Audio('Assets/sound/match.mp3');
const wrongSound = new Audio('Assets/sound/wrong.mp3');
const winSound = new Audio('Assets/sound/win.mp3');


[flipSound, matchSound, wrongSound, winSound].forEach(sound => {
    sound.volume = volume;
});


function playSound(sound) {
    if (sound === matchSound && matchSoundCooldown) return;
    if (sound.paused || sound.ended) {
        sound.volume = volume;
        sound.pause();
        sound.currentTime = 0;
        sound.play().catch((error) => {
            console.error('Error playing sound:', error);
        });
        if (sound === matchSound) {
            matchSoundCooldown = true;
            setTimeout(() => {
                sound.pause();
                setTimeout(() => {
                    matchSoundCooldown = false;
                }, 2000);
            }, 3000);
        }
    }
}


function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


function calculateScore(difficulty) {
    const elapsedSeconds = Math.floor((new Date() - startTime) / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const targetMinutes = 100;
    let baseScore = 0;

    if (elapsedMinutes <= targetMinutes) {
        baseScore = 100 - elapsedMinutes;
    } else {
        baseScore = (elapsedMinutes - targetMinutes) * 0.5;
    }

    const difficultyMultipliers = {
        easy: 1,
        medium: 1.2,
        hard: 1.5,
        expert: 2
    };

    const multiplier = difficultyMultipliers[difficulty] || 1;
    const finalScore = Math.max(0, Math.round(baseScore * multiplier));
    return finalScore;
}


function saveScore(name, score, difficulty, timestamp) {
    const key = `leaderboard_${difficulty}`;
    const scores = JSON.parse(localStorage.getItem(key) || '[]');
    scores.push({ name, score, timestamp });
    localStorage.setItem(key, JSON.stringify(scores));
    updateLeaderboard();
}


function updateLeaderboard() {
    const difficulties = ['easy', 'medium', 'hard', 'expert'];
    const allScores = {};

    difficulties.forEach(diff => {
        const key = `leaderboard_${diff}`;
        allScores[diff] = JSON.parse(localStorage.getItem(key) || '[]');
        allScores[diff].sort((a, b) => b.score - a.score || a.timestamp - b.timestamp);
    });

    displayLeaderboard(allScores);
}


function displayLeaderboard(allScores) {
    const difficulties = ['easy', 'medium', 'hard', 'expert'];
    difficulties.forEach(diff => {
        const tbody = leaderboardBodies[diff];
        tbody.innerHTML = '';
        const scores = allScores[diff].slice(0, 5); // Top 5 per difficulty
        scores.forEach((entry, index) => {
            const row = document.createElement('tr');
            if (index === 0) {
                row.classList.add('leader-row');
            }
            const date = new Date(entry.timestamp);
            const timeStr = `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.name}</td>
                <td>${entry.score}</td>
                <td>${timeStr}</td>
            `;
            tbody.appendChild(row);
        });
    });
    leaderboard.classList.add('visible');
}

// Start the game
function startGame(difficulty) {
    currentDifficulty = difficulty;
    const imageCounts = {
        easy: 3,
        medium: 4,
        hard: 5,
        expert: 6
    };

    const selectedCount = imageCounts[difficulty] || 6;
    const folder = `images/${difficulty}`;
    images = [];

    for (let i = 1; i <= selectedCount; i++) {
        images.push(`coffee${i}.png`);
    }

    const totalCards = 12;
    const pairedImages = [];
    const uniqueImages = images.slice(0, Math.min(selectedCount, totalCards / 2));
    const duplicates = [...uniqueImages, ...uniqueImages];
    while (duplicates.length < totalCards) {
        duplicates.push(uniqueImages[Math.floor(Math.random() * uniqueImages.length)]);
    }
    const shuffledImages = shuffle(duplicates.slice(0, totalCards));

    cards = [];
    flippedCards = [];
    matchedPairs = 0;
    totalFlips = 0;
    gameStarted = false;
    matchSoundCooldown = false;
    touchLock = false;
    clearInterval(timerInterval);
    timeDisplay.textContent = '⏱ Time: 00:00';
    flipsDisplay.textContent = '🔁 Flips: 0';
    matchesDisplay.textContent = '✅ Matches: 0';
    scoreText.classList.remove('visible');
    winText.classList.remove('visible');
    instructionText.classList.remove('visible');
    startText.classList.remove('visible');
    leaderboard.classList.remove('visible');

    renderGameBoard(shuffledImages, folder);
}


function renderGameBoard(imageList, folder) {
    gameBoard.innerHTML = '';

    imageList.forEach((imgSrc) => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.dataset.image = imgSrc;

        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front"></div>
                <div class="card-back">
                    <img src="${folder}/${imgSrc}" alt="Espresso Image">
                </div>
            </div>
        `;

        card.addEventListener('click', () => flipCard(card));
        card.addEventListener('touchstart', (e) => {
            e.preventDefault();
            flipCard(card);
        });
        gameBoard.appendChild(card);
        cards.push(card);
    });
}


function flipCard(card) {
    if (
        touchLock ||
        flippedCards.length === 2 ||
        card.classList.contains('flipped') ||
        card.classList.contains('matched')
    ) return;

    touchLock = true;
    setTimeout(() => { touchLock = false; }, 300);

    if (!gameStarted) {
        gameStarted = true;
        startTime = new Date();
        timerInterval = setInterval(updateTimer, 1000);
    }

    playSound(flipSound);
    card.classList.add('flipped');
    flippedCards.push(card);
    totalFlips++;
    updateStats();

    if (flippedCards.length === 2) {
        const [card1, card2] = flippedCards;
        const isMatch = card1.dataset.image === card2.dataset.image;

        setTimeout(() => {
            if (isMatch) {
                card1.classList.add('matched');
                card2.classList.add('matched');
                matchedPairs++;
                playSound(matchSound);
                updateStats();

                if (matchedPairs === 6) {
                    endGame();
                }
            } else {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
                playSound(wrongSound);
            }
            flippedCards = [];
        }, 800);
    }
}


function updateStats() {
    flipsDisplay.textContent = `🔁 Flips: ${totalFlips}`;
    matchesDisplay.textContent = `✅ Matches: ${matchedPairs}`;
}

function updateTimer() {
    const now = new Date();
    const elapsed = new Date(now - startTime);
    const mins = elapsed.getUTCMinutes().toString().padStart(2, '0');
    const secs = elapsed.getUTCSeconds().toString().padStart(2, '0');
    timeDisplay.textContent = `⏱ Time: ${mins}:${secs}`;
}


function endGame() {
    clearInterval(timerInterval);
    setTimeout(() => {
        playSound(winSound);
        winText.classList.add('visible');
        setTimeout(() => {
            winText.classList.remove('visible');
            const totalScore = calculateScore(currentDifficulty);
            scoreText.textContent = `Total Score: ${totalScore}`;
            scoreText.classList.add('visible');
            saveScore(playerName, totalScore, currentDifficulty, Date.now());
        }, 2000);
    }, 500);
}

function addInteractionListeners(element, handler) {
    element.addEventListener('click', handler);
    element.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handler();
    });
}

addInteractionListeners(instructionBtn, () => {
    const name = playerNameInput.value.trim();
    if (name === '') {
        alert('Please enter a nickname to start the game.');
        return;
    }
    playerName = name;
    instructionText.classList.remove('visible');
    startGame(levelSelect.value);
});

addInteractionListeners(restartBtn, () => {
    winText.classList.remove('visible');
    scoreText.classList.remove('visible');
    leaderboard.classList.remove('visible');
    instructionText.classList.add('visible');
    playerNameInput.value = '';
    startGame(levelSelect.value);
});

addInteractionListeners(levelSelect, () => {
    instructionText.classList.add('visible');
    playerNameInput.value = '';
    startGame(levelSelect.value);
});

addInteractionListeners(leaderboardBtn, () => {
    updateLeaderboard();
});

addInteractionListeners(closeLeaderboardBtn, () => {
    leaderboard.classList.remove('visible');
});

volumeControl.addEventListener('input', () => {
    volume = parseFloat(volumeControl.value);
    [flipSound, matchSound, wrongSound, winSound].forEach(sound => {
        sound.volume = volume;
    });
});


instructionText.classList.add('visible');
['easy', 'medium', 'hard', 'expert'].forEach(diff => {
    const key = `leaderboard_${diff}`;
    if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
    }
});