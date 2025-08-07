let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let totalFlips = 0;
let gameStarted = false;
let startTime;
let timerInterval;
let images = [];
let volume = 0.5; // Default volume
let matchSoundCooldown = false;
let touchLock = false; // Prevent rapid touch events

// DOM Elements
const gameBoard = document.getElementById('gameBoard');
const timeDisplay = document.getElementById('time');
const flipsDisplay = document.getElementById('flips');
const matchesDisplay = document.getElementById('matches');
const instructionText = document.getElementById('instructionText');
const instructionBtn = document.getElementById('instructionBtn');
const startText = document.getElementById('startText');
const winText = document.getElementById('winText');
const scoreText = document.getElementById('scoreText');
const restartBtn = document.getElementById('restartBtn');
const levelSelect = document.getElementById('level');
const volumeControl = document.getElementById('volume');

// Sound Effects
const flipSound = new Audio('Assets/sound/flip.mp3');
const matchSound = new Audio('Assets/sound/match.mp3');
const wrongSound = new Audio('Assets/sound/wrong.mp3');
const winSound = new Audio('Assets/sound/win.mp3');

// Apply initial volume
[flipSound, matchSound, wrongSound, winSound].forEach(sound => {
    sound.volume = volume;
});

// Prevent overlapping sounds and manage match sound timer
function playSound(sound) {
    if (sound === matchSound && matchSoundCooldown) return; // Skip if match sound is in cooldown
    if (sound.paused || sound.ended) { // Only play if sound is not currently playing
        sound.volume = volume; // Apply current volume
        sound.pause();
        sound.currentTime = 0;
        sound.play().catch((error) => {
            console.error('Error playing sound:', error);
        });
        if (sound === matchSound) {
            matchSoundCooldown = true;
            setTimeout(() => {
                sound.pause(); // Stop match sound after 3 seconds
                setTimeout(() => {
                    matchSoundCooldown = false; // Allow replay after 2-second cooldown
                }, 2000);
            }, 3000);
        }
    }
}

// Fisher-Yates Shuffle
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Calculate total score
function calculateScore() {
    const elapsedSeconds = Math.floor((new Date() - startTime) / 1000);
    const baseScore = 1000;
    const flipPenalty = totalFlips * 10;
    const timePenalty = elapsedSeconds * 5;
    return Math.max(0, baseScore - flipPenalty - timePenalty);
}

// Start the game
function startGame(difficulty) {
    const imageCounts = {
        easy: 3,    // 3 unique images (6 cards)
        medium: 4,  // 4 unique images (8 cards)
        hard: 5,    // 5 unique images (10 cards)
        expert: 6   // 6 unique images (12 cards)
    };

    const selectedCount = imageCounts[difficulty] || 6; // Default to expert
    const folder = `images/${difficulty}`;
    images = [];

    for (let i = 1; i <= selectedCount; i++) {
        images.push(`img${i}.png`);
    }

    // Create 12 cards (fill with duplicates if needed)
    const totalCards = 12; // 4 columns x 3 rows
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

    renderGameBoard(shuffledImages, folder);
}

// Render all cards
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
                    <img src="${folder}/${imgSrc}" alt="Card Image">
                </div>
            </div>
        `;

        // Add both click and touchstart events for cards
        card.addEventListener('click', () => flipCard(card));
        card.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent default touch behaviors
            flipCard(card);
        });
        gameBoard.appendChild(card);
        cards.push(card);
    });
}

// Handle flipping cards
function flipCard(card) {
    if (
        touchLock ||
        flippedCards.length === 2 ||
        card.classList.contains('flipped') ||
        card.classList.contains('matched')
    ) return;

    touchLock = true; // Lock touch/click events
    setTimeout(() => { touchLock = false; }, 300); // Release lock after 300ms

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

                if (matchedPairs === 6) { // 6 pairs in 12 cards
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

// Update stats
function updateStats() {
    flipsDisplay.textContent = `🔁 Flips: ${totalFlips}`;
    matchesDisplay.textContent = `✅ Matches: ${matchedPairs}`;
}

// Update timer
function updateTimer() {
    const now = new Date();
    const elapsed = new Date(now - startTime);
    const mins = elapsed.getUTCMinutes().toString().padStart(2, '0');
    const secs = elapsed.getUTCSeconds().toString().padStart(2, '0');
    timeDisplay.textContent = `⏱ Time: ${mins}:${secs}`;
}

// End game
function endGame() {
    clearInterval(timerInterval);
    setTimeout(() => {
        playSound(winSound); // Stagger win sound to avoid overlap
        winText.classList.add('visible');
        setTimeout(() => {
            winText.classList.remove('visible');
            const totalScore = calculateScore();
            scoreText.textContent = `Total Score: ${totalScore}`;
            scoreText.classList.add('visible');
        }, 2000); // Show score after 2 seconds
    }, 500); // Delay win sound by 500ms
}

// Event listeners
function addInteractionListeners(element, handler) {
    element.addEventListener('click', handler);
    element.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent default touch behaviors
        handler();
    });
}

addInteractionListeners(instructionBtn, () => {
    instructionText.classList.remove('visible');
    startGame(levelSelect.value); // Start game directly
});

addInteractionListeners(restartBtn, () => {
    winText.classList.remove('visible');
    scoreText.classList.remove('visible');
    instructionText.classList.add('visible');
    startGame(levelSelect.value); // Restart with selected difficulty
});

addInteractionListeners(levelSelect, () => {
    instructionText.classList.add('visible');
    startGame(levelSelect.value); // Restart with new difficulty
});

volumeControl.addEventListener('input', () => {
    volume = parseFloat(volumeControl.value);
    [flipSound, matchSound, wrongSound, winSound].forEach(sound => {
        sound.volume = volume;
    });
});

// Initialize instruction overlay on page load
instructionText.classList.add('visible');