const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-display');
const highScoreDisplay = document.getElementById('high-score-display');
const gameOverDiv = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const menuBtn = document.getElementById('menu-btn');
const finalScoreDisplay = document.getElementById('final-score');
const finalHighScoreDisplay = document.getElementById('final-high-score');
const newRecordIndicator = document.getElementById('new-record');

// Debug overlay element (visible during development)
const debugDiv = document.createElement('div');
debugDiv.id = 'debug-overlay';
document.getElementById('game-container').appendChild(debugDiv);
function updateDebug() {
    // Only show stylized speed info
    debugDiv.textContent = `Speed: ${pipeSpeed.toFixed(2)}`;
    debugDiv.style.fontWeight = '700';
    debugDiv.style.padding = '6px 10px';
    debugDiv.style.background = 'linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))';
    debugDiv.style.borderRadius = '12px';
}

const backgroundImage = new Image();
backgroundImage.src = 'images/sac-nac.jpg';
let backgroundLoaded = false;
backgroundImage.onload = () => {
    backgroundLoaded = true;
};
const birdImage = new Image();
birdImage.src = 'images/register.png';
let birdImageLoaded = false;
birdImage.onload = () => {
    birdImageLoaded = true;
};

// Pipe texture image
const pipeImage = new Image();
pipeImage.src = 'images/piller.png';
let pipeImageLoaded = false;
pipeImage.onload = () => {
    pipeImageLoaded = true;
    _debugLog('pipe texture loaded');
};
// crash sound effect (played on game over)
const crashSound = new Audio('images/faaa.mp3');
crashSound.preload = 'auto';
crashSound.volume = 0.8;
// background music (looped during gameplay)
const bgMusic = new Audio('images/bg.mp3');
bgMusic.loop = true;
bgMusic.preload = 'auto';
bgMusic.volume = 0.45;

// mute state persisted
let isMuted = localStorage.getItem('flappyMuted') === 'true';
if (crashSound) crashSound.muted = isMuted;
if (bgMusic) bgMusic.muted = isMuted;

function updateMuteButton() {
    const b = document.getElementById('mute-btn');
    if (!b) return;
    b.textContent = isMuted ? '🔇' : '🔊';
}

function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('flappyMuted', isMuted);
    if (crashSound) crashSound.muted = isMuted;
    if (bgMusic) {
        bgMusic.muted = isMuted;
        if (isMuted) {
            try { bgMusic.pause(); } catch (e) { }
        } else if (gameRunning) {
            try { const p = bgMusic.play(); if (p && typeof p.catch === 'function') p.catch(() => { }); } catch (e) { }
        }
    }
    updateMuteButton();
}
const bird = {
    x: 50,
    y: canvas.height / 2,
    width: 50,
    height: 50,
    velocity: 0,
    // physics now in px/s and px/s^2
    gravity: 2000, // px/s^2 (slightly stronger)
    jump: -600// px/s instant velocity when jumping (stronger jump)
};

const pipes = [];
const pipeWidth = 50;
const pipeGap = 250;
// pipeSpeed is now in px/s (was per-frame previous behavior)
let pipeSpeed = 250; // start faster for snappier horizontal movement
const pipeAccel = 3; // px/s^2 - stronger gradual speed increase
let score = 0;
let highScore = parseInt(localStorage.getItem('flappyHighScore')) || 0;
let gameRunning = false; let pillarCount = 0;

// ========== COIN SYSTEM ==========
const coins = [];
const coinSize = 30;
let sessionCoins = 0;
let totalCoins = parseInt(localStorage.getItem('flappyTotalCoins')) || 0;

// Coin image
const coinImage = new Image();
coinImage.src = 'images/coin.png';
let coinImageLoaded = false;
coinImage.onload = () => { coinImageLoaded = true; };

// Coin sound
const coinSound = new Audio('images/coin.mp3');
coinSound.preload = 'auto';
coinSound.volume = 0.5;

// ========== SKIN SHOP ==========
const SKINS = [
    { id: 'bus.png', name: 'Bus Bird', price: 0 },
    { id: 'register.png', name: 'Register Bird', price: 50 },
    { id: 'nsu.png', name: 'NSU Bird', price: 100 },
    { id: 'bird.png', name: 'Classic Bird', price: 150 }
];

// Load unlocked skins from localStorage
let unlockedSkins = JSON.parse(localStorage.getItem('flappyUnlockedSkins')) || ['bus.png'];
let selectedSkin = localStorage.getItem('flappySelectedSkin') || 'bus.png';

function saveUnlockedSkins() {
    localStorage.setItem('flappyUnlockedSkins', JSON.stringify(unlockedSkins));
}

function saveTotalCoins() {
    localStorage.setItem('flappyTotalCoins', totalCoins);
}

function saveSelectedSkin() {
    localStorage.setItem('flappySelectedSkin', selectedSkin);
}

const pillarTypes = [
    { name: "Rampura", score: 1 },
    { name: "Badda", score: 2 },
    { name: "Gulshan", score: 1 },
    { name: "Banani", score: 1 },
    { name: "Banasri", score: 2 },
    { name: "Mirpur 10", score: 3 },
    { name: "Mirpur 11", score: 3 },
    { name: "Agargao", score: 3 },
    { name: "Pallabi", score: 2 },
    { name: "Uttora", score: 3 },
    { name: "Airport", score: 1 },
    { name: "Gazipur", score: 4 },
    { name: "Narayanganj", score: 4 },
    { name: "Tongi", score: 4 },
    { name: "Puran Dhaka", score: 2 },
    { name: "Gulistan", score: 2 },
    { name: "Shahabag", score: 0 },
    { name: "New Market", score: 1 },
    { name: "NSU", score: 10 }
];
function createPipe() {
    pillarCount++;
    let type;
    if (pillarCount % 5 === 0) {
        type = pillarTypes.find(t => t.name === "NSU");
    } else {
        const others = pillarTypes.filter(t => t.name !== "NSU");
        type = others[Math.floor(Math.random() * others.length)];
    }
    const topHeight = Math.random() * (canvas.height - pipeGap - 50) + 50;
    const bottomHeight = canvas.height - topHeight - pipeGap;
    const newPipe = {
        x: canvas.width,
        topHeight: topHeight,
        bottomHeight: bottomHeight,
        passed: false,
        type: type
    };
    pipes.push(newPipe);

    // Spawn coin (50% chance)
    if (Math.random() < 0.5) {
        const gapTop = topHeight;
        const gapBottom = canvas.height - bottomHeight;
        const coinY = gapTop + (gapBottom - gapTop) / 2 - coinSize / 2;
        coins.push({
            x: canvas.width + pipeWidth + 50, // Slightly after the pipe
            y: coinY + (Math.random() - 0.5) * 60, // Random vertical offset
            collected: false
        });
    }

    _debugLog(`createPipe #${pillarCount} type=${type.name} pipes=${pipes.length}`);
}

// update now takes delta time in seconds
function update(dt) {
    if (!gameRunning) return;

    // Bird physics (kinematics: v += g*dt; y += v*dt)
    bird.velocity += bird.gravity * dt;
    bird.y += bird.velocity * dt;

    // Check ground and ceiling
    if (bird.y + bird.height > canvas.height || bird.y < 0) {
        gameOver();
        return;
    }

    // Update pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= pipeSpeed * dt;

        // Check collision
        if (bird.x < pipe.x + pipeWidth && bird.x + bird.width > pipe.x) {
            if (bird.y < pipe.topHeight || bird.y + bird.height > canvas.height - pipe.bottomHeight) {
                gameOver();
                return;
            }
        }

        // Score
        if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
            pipe.passed = true;
            const pts = (pipe.type && typeof pipe.type.score === 'number') ? pipe.type.score : 1;
            score += pts;
            _debugLog(`Passed ${pipe.type ? pipe.type.name : 'unknown'} (+${pts}), total=${score}`);
            if (score > highScore) {
                highScore = score;
                updateHighScore();
            }
            updateScore();
        }

        // Remove off-screen pipes
        if (pipe.x + pipeWidth < 0) {
            pipes.splice(i, 1);
        }
    }

    // Safety: limit number of pipes to avoid runaway memory
    while (pipes.length > 7) {
        pipes.shift();
    }

    // Increase speed gradually (per-second)
    pipeSpeed += pipeAccel * dt;

    // Update coins
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        coin.x -= pipeSpeed * dt;

        // Check collision with bird
        if (!coin.collected) {
            const coinCenterX = coin.x + coinSize / 2;
            const coinCenterY = coin.y + coinSize / 2;
            const birdCenterX = bird.x + bird.width / 2;
            const birdCenterY = bird.y + bird.height / 2;
            const dist = Math.sqrt((coinCenterX - birdCenterX) ** 2 + (coinCenterY - birdCenterY) ** 2);

            if (dist < (coinSize / 2 + bird.width / 3)) {
                coin.collected = true;
                sessionCoins++;
                updateCoinDisplay();
                if (!isMuted && coinSound) {
                    coinSound.currentTime = 0;
                    try { coinSound.play(); } catch (e) { }
                }
            }
        }

        // Remove off-screen coins
        if (coin.x + coinSize < 0 || coin.collected) {
            coins.splice(i, 1);
        }
    }

    // Spawn pipes based on time (see lastPipeSpawn/time handling in game loop)
    // createPipe is now driven by time in the game loop
}

function draw() {
    // Draw background
    if (backgroundLoaded) {
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#70c5ce';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw bird
    if (birdImageLoaded) {
        ctx.drawImage(birdImage, bird.x, bird.y, bird.width, bird.height);
    } else {
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
    }

    // Draw pipes (use texture if available)
    pipes.forEach(pipe => {
        if (pipeImageLoaded) {
            // draw texture stretched to pipe bounds
            ctx.drawImage(pipeImage, pipe.x, 0, pipeWidth, pipe.topHeight);
            ctx.drawImage(pipeImage, pipe.x, canvas.height - pipe.bottomHeight, pipeWidth, pipe.bottomHeight);
        } else {
            ctx.fillStyle = '#228b22';
            ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
            ctx.fillRect(pipe.x, canvas.height - pipe.bottomHeight, pipeWidth, pipe.bottomHeight);
        }

        // Draw name with stroke for visibility on textured pipes
        const label = `${pipe.type.name} ${pipe.type.score}`;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.fillStyle = '#fff';
        // top label (if not enough space above, draw inside pipe)
        const labelY = Math.max(12, pipe.topHeight - 6);
        ctx.strokeText(label, pipe.x + pipeWidth / 2, labelY);
        ctx.fillText(label, pipe.x + pipeWidth / 2, labelY);
    });

    // Draw coins
    coins.forEach(coin => {
        if (!coin.collected) {
            if (coinImageLoaded) {
                ctx.drawImage(coinImage, coin.x, coin.y, coinSize, coinSize);
            } else {
                // Fallback: draw golden circle
                ctx.beginPath();
                ctx.arc(coin.x + coinSize / 2, coin.y + coinSize / 2, coinSize / 2, 0, Math.PI * 2);
                ctx.fillStyle = '#ffd700';
                ctx.fill();
                ctx.strokeStyle = '#b8860b';
                ctx.lineWidth = 2;
                ctx.stroke();
                // Draw coin symbol
                ctx.fillStyle = '#b8860b';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('$', coin.x + coinSize / 2, coin.y + coinSize / 2 + 5);
            }
        }
    });
}

let animationFrameId = null;
let lastTimestamp = null;
let lastPipeSpawn = 0; // seconds since last spawn
// desired horizontal spacing between pipe origins in pixels
const desiredPipeSpacing = 200; // px (tunable)

function gameLoop(timestamp) {
    try {
        if (!lastTimestamp) lastTimestamp = timestamp;
        // delta time in seconds, clamp to avoid huge jumps
        let dt = (timestamp - lastTimestamp) / 1000;
        if (dt > 0.1) dt = 0.1;
        lastTimestamp = timestamp;

        // Update spawn timer and create pipe when interval exceeded.
        // Use desired horizontal spacing divided by current speed so spacing
        // remains consistent across devices and FPS rates.
        lastPipeSpawn += dt;
        const spawnInterval = Math.max(0.25, desiredPipeSpacing / Math.max(1, pipeSpeed));
        if (lastPipeSpawn >= spawnInterval) {
            lastPipeSpawn -= spawnInterval;
            // create a single pipe at spawn moment
            createPipe();
        }

        update(dt);
        draw();
        updateDebug();
    } catch (err) {
        console.error('Game loop error:', err);
        // Stop the game on unexpected errors to avoid silent freezes
        gameRunning = false;
        gameOverDiv.style.display = 'block';
        return;
    }

    if (gameRunning) {
        animationFrameId = requestAnimationFrame(gameLoop);
    } else if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

function jump() {
    if (gameRunning) {
        bird.velocity = bird.jump; // now in px/s
    }
}

function gameOver() {
    // play crash sound (safe against play() promise rejection)
    try {
        if (crashSound) {
            crashSound.currentTime = 0;
            const p = crashSound.play();
            if (p && typeof p.catch === 'function') p.catch(() => { });
        }
    } catch (e) {
        // ignore audio errors
    }

    gameRunning = false;

    // Check for new high score before updating
    const isNewRecord = score > highScore;
    if (isNewRecord) {
        highScore = score;
    }

    // Persist coins
    totalCoins += sessionCoins;
    saveTotalCoins();
    updateCoinDisplay();

    // Update game over screen elements
    if (finalScoreDisplay) {
        finalScoreDisplay.textContent = score;
    }
    if (finalHighScoreDisplay) {
        finalHighScoreDisplay.textContent = `Best: ${highScore}`;
    }
    if (newRecordIndicator) {
        newRecordIndicator.style.display = isNewRecord ? 'block' : 'none';
    }

    // Display session coins in game over
    const finalSessionCoins = document.getElementById('final-session-coins');
    if (finalSessionCoins) {
        finalSessionCoins.textContent = sessionCoins;
    }

    gameOverDiv.style.display = 'block';
    localStorage.setItem('flappyHighScore', highScore);
    updateHighScore();

    // stop background music on crash
    try {
        if (bgMusic) {
            bgMusic.pause();
            bgMusic.currentTime = 0;
        }
    } catch (e) { }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

function restart() {
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    pipes.length = 0;
    coins.length = 0; // Clear coins
    score = 0;
    sessionCoins = 0; // Reset session coins
    pillarCount = 0;
    pipeSpeed = 90;
    lastTimestamp = null;
    lastPipeSpawn = 0;
    gameRunning = true;
    gameOverDiv.style.display = 'none';
    updateScore();
    updateCoinDisplay(); // Reset coin counter UI
    // Ensure previous animation frame is cleared
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    // Only create one pipe at the start
    createPipe();
    // start background music if allowed
    try {
        if (bgMusic && !isMuted) {
            bgMusic.currentTime = 0;
            const p = bgMusic.play();
            if (p && typeof p.catch === 'function') p.catch(() => { });
        }
    } catch (e) { }
    requestAnimationFrame(gameLoop);
}

function updateScore() {
    scoreDisplay.textContent = `Score: ${score}`;
    // add pulse animation when score changes
    scoreDisplay.classList.add('score-pulse');
    setTimeout(() => scoreDisplay.classList.remove('score-pulse'), 350);
}

function updateHighScore() {
    highScoreDisplay.textContent = `H Score: ${highScore}`;
    highScoreDisplay.classList.add('score-pulse');
    setTimeout(() => highScoreDisplay.classList.remove('score-pulse'), 350);
}

// Simple runtime diagnostics disabled in production
function _debugLog(msg) {
    // no-op
}

function startGame() {
    birdImage.src = 'images/' + selectedSkin;
    startScreen.style.display = 'none';
    gameRunning = true;
    // Only create one pipe at the start
    pipes.length = 0;
    coins.length = 0; // Clear coins
    sessionCoins = 0; // Reset session coins
    pillarCount = 0;
    pipeSpeed = 60;
    lastTimestamp = null;
    lastPipeSpawn = 0;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    updateCoinDisplay();
    createPipe();
    try {
        if (bgMusic && !isMuted) {
            bgMusic.currentTime = 0;
            const p = bgMusic.play();
            if (p && typeof p.catch === 'function') p.catch(() => { });
        }
    } catch (e) { }
    requestAnimationFrame(gameLoop);
}

// Event listeners
canvas.addEventListener('click', jump);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    jump();
});
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();

        // Check if on start screen - start game
        if (startScreen && startScreen.style.display !== 'none') {
            startGame();
            return;
        }

        // Check if on game over screen - restart game
        if (gameOverDiv && gameOverDiv.style.display !== 'none') {
            restart();
            return;
        }

        // Otherwise, jump during gameplay
        jump();
    }
});
restartBtn.addEventListener('click', restart);
startBtn.addEventListener('click', startGame);

// Main menu button - returns to start screen
if (menuBtn) {
    menuBtn.addEventListener('click', function () {
        gameOverDiv.style.display = 'none';
        startScreen.style.display = 'block';
        // Reset game state
        bird.y = canvas.height / 2;
        bird.velocity = 0;
        pipes.length = 0;
        score = 0;
        pillarCount = 0;
        pipeSpeed = 90;
        lastTimestamp = null;
        lastPipeSpawn = 0;
        updateScore();
    });
}

// hookup mute button and reflect initial state
const muteBtnEl = document.getElementById('mute-btn');
if (muteBtnEl) muteBtnEl.addEventListener('click', toggleMute);
updateMuteButton();

// ========== COIN & SHOP UI FUNCTIONS ==========
function updateCoinDisplay() {
    // Current game counter
    const coinCounter = document.getElementById('coin-counter');
    if (coinCounter) {
        coinCounter.textContent = sessionCoins;
    }

    // Total coins displays (start screen and game over)
    const totalCoinValues = document.querySelectorAll('.total-coin-value');
    totalCoinValues.forEach(el => {
        el.textContent = totalCoins;
    });
}

function renderShop() {
    const shopContainer = document.getElementById('shop-grid');
    if (!shopContainer) return;

    shopContainer.innerHTML = '';

    SKINS.forEach(skin => {
        const isUnlocked = unlockedSkins.includes(skin.id);
        const isSelected = selectedSkin === skin.id;

        const card = document.createElement('div');
        card.className = `skin-card ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`;

        const priceTag = !isUnlocked ? `<div class="price-tag">🪙 ${skin.price}</div>` : '';
        const statusText = isSelected ? 'SELECTED' : (isUnlocked ? 'UNLOCKED' : 'BUY');

        card.innerHTML = `
            <div class="skin-preview">
                <img src="images/${skin.id}" alt="${skin.name}">
            </div>
            <div class="skin-name">${skin.name}</div>
            ${priceTag}
            <button class="shop-btn ${isSelected ? 'active' : ''}" 
                onclick="event.stopPropagation(); handleShopAction('${skin.id}')">
                ${statusText}
            </button>
        `;

        card.onclick = () => handleShopAction(skin.id);
        shopContainer.appendChild(card);
    });
}

window.handleShopAction = function (skinId) {
    const skin = SKINS.find(s => s.id === skinId);
    if (!skin) return;

    const isUnlocked = unlockedSkins.includes(skinId);

    if (isUnlocked) {
        selectedSkin = skinId;
        saveSelectedSkin();
        renderShop();
    } else {
        if (totalCoins >= skin.price) {
            totalCoins -= skin.price;
            unlockedSkins.push(skinId);
            selectedSkin = skinId;
            saveTotalCoins();
            saveUnlockedSkins();
            saveSelectedSkin();
            updateCoinDisplay();
            renderShop();
            if (coinSound) coinSound.play();
        } else {
            // Insufficient coins animation
            const totalDisplays = document.querySelectorAll('.total-coin-display');
            totalDisplays.forEach(el => {
                el.classList.add('shake');
                setTimeout(() => el.classList.remove('shake'), 500);
            });
        }
    }
};

// Initialize
updateHighScore();
updateCoinDisplay();
renderShop();
birdImage.src = 'images/' + selectedSkin;