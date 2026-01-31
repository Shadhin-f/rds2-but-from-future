const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-display');
const highScoreDisplay = document.getElementById('high-score-display');
const gameOverDiv = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');

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
birdImage.src = 'images/bus.png';
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
const bird = {
    x: 50,
    y: canvas.height / 2,
    width: 50,
    height: 50,
    velocity: 0,
    gravity: 0.15,
    jump: -7
};

const pipes = [];
const pipeWidth = 50;
const pipeGap = 250;
let pipeSpeed = 1;
let score = 0;
let highScore = parseInt(localStorage.getItem('flappyHighScore')) || 0;
let gameRunning = false;let pillarCount = 0;

const pillarTypes = [
    {name: "Rampura", score: 1},
    {name: "Badda", score: 2},
    {name: "Gulshan", score: 1},
    {name: "Banani", score: 1},
    {name: "Banasri", score: 2},
    {name: "Mirpur 10", score: 3},
    {name: "Mirpur 11", score: 3},
    {name: "Agargao", score: 3},
    {name: "Pallabi", score: 2},
    {name: "Uttora", score: 3},
    {name: "Airport", score: 1},
    {name: "Gazipur", score: 4},
    {name: "Narayanganj", score: 4},
    {name: "Tongi", score: 4},
    {name: "Puran Dhaka", score: 2},
    {name: "Gulistan", score: 2},
    {name: "Shahabag", score: 0},
    {name: "New Market", score: 1},
    {name: "NSU", score: 10}
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
    _debugLog(`createPipe #${pillarCount} type=${type.name} pipes=${pipes.length}`);
}

function update() {
    if (!gameRunning) return;

    // Bird physics
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    // Check ground and ceiling
    if (bird.y + bird.height > canvas.height || bird.y < 0) {
        gameOver();
    }

    // Update pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= pipeSpeed;

        // Check collision
        if (bird.x < pipe.x + pipeWidth && bird.x + bird.width > pipe.x) {
            if (bird.y < pipe.topHeight || bird.y + bird.height > canvas.height - pipe.bottomHeight) {
                gameOver();
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

    // Add new pipes
    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 250) {
        createPipe();
    }

    // Safety: limit number of pipes to avoid runaway memory
    while (pipes.length > 7) {
        pipes.shift();
    }

    // Increase speed
    pipeSpeed += 0.0003;
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
}

let animationFrameId = null;
function gameLoop() {
    try {
        update();
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
        bird.velocity = bird.jump;
    }
}

function gameOver() {
    gameRunning = false;
    gameOverDiv.style.display = 'block';
    if (score > highScore) {
        highScore = score;
    }
    localStorage.setItem('flappyHighScore', highScore);
    updateHighScore();
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

function restart() {
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    pipes.length = 0;
    score = 0;
    pillarCount = 0;
    pipeSpeed = 1;
    gameRunning = true;
    gameOverDiv.style.display = 'none';
    updateScore();
    // Ensure previous animation frame is cleared
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    // Only create one pipe at the start
    createPipe();
    requestAnimationFrame(gameLoop);
}

function updateScore() {
    scoreDisplay.textContent = `Score: ${score}`;
    // add pulse animation when score changes
    scoreDisplay.classList.add('score-pulse');
    setTimeout(() => scoreDisplay.classList.remove('score-pulse'), 350);
}

function updateHighScore() {
    highScoreDisplay.textContent = `High Score: ${highScore}`;
    highScoreDisplay.classList.add('score-pulse');
    setTimeout(() => highScoreDisplay.classList.remove('score-pulse'), 350);
}

// Simple runtime diagnostics disabled in production
function _debugLog(msg) {
    // no-op
} 

function startGame() {
    startScreen.style.display = 'none';
    gameRunning = true;
    // Only create one pipe at the start
    pipes.length = 0;
    pillarCount = 0;
    pipeSpeed = 1;
    // Ensure previous animation frame is cleared
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    createPipe();
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
        jump();
    }
});
restartBtn.addEventListener('click', restart);
startBtn.addEventListener('click', startGame);

// Initialize
updateHighScore();