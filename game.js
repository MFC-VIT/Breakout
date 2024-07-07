const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startButton = document.getElementById('startButton');
const overlay = document.getElementById('overlay');
const overlayMessage = document.getElementById('overlayMessage');
const restartButton = document.getElementById('restartButton');
const scoreDisplay = document.getElementById('scoreDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const levelDisplay = document.getElementById('levelDisplay');

const collisionSound = document.getElementById('collisionSound');
const winSound = document.getElementById('winSound');
const gameOverSound = document.getElementById('gameOverSound');
const powerupSound = document.getElementById('powerupSound');

const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 10;
const BALL_RADIUS = 10;
const BRICK_ROWS = 5;
const BRICK_COLUMNS = 8;
const BRICK_WIDTH = 75;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 10;
const BRICK_OFFSET_TOP = 30;
const BRICK_OFFSET_LEFT = 30;
const BALL_SPEED = 4;

let gameState = {
    playing: false,
    paused: false,
    gameOver: false,
    score: 0,
    lives: 3,
    level: 1,
    highScore: 0
};

let paddleX = (canvas.width - PADDLE_WIDTH) / 2;
const paddleSpeed = 7;
const PADDLE_COLOR = '#3498db';

let ballX, ballY, ballDX, ballDY;
const BALL_COLOR = '#e74c3c';

let bricks = [];
const BRICK_COLORS = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'];
const GOLDEN_BRICK_PROBABILITY = 0.1;
const DISTRACTION_BRICK_PROBABILITY = 0.2;
const POWERUP_PROBABILITY = 0.1;

let distractions = [];
let powerups = [];

let rightPressed = false;
let leftPressed = false;

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', restartLevel);

function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = true;
    } else if (e.key === 'Escape') {
        togglePause();
    }
}

function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = false;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = false;
    }
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, canvas.height - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = PADDLE_COLOR;
    ctx.fill();
    ctx.closePath();
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ballX, ballY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = BALL_COLOR;
    ctx.fill();
    ctx.closePath();
}

function drawBricks() {
    for (let c = 0; c < BRICK_COLUMNS; c++) {
        for (let r = 0; r < BRICK_ROWS; r++) {
            if (bricks[c][r].status > 0) {
                const brickX = (c * (BRICK_WIDTH + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                const brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                ctx.beginPath();
                ctx.rect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT);
                if (bricks[c][r].status === 1) {
                    ctx.fillStyle = BRICK_COLORS[r];
                } else if (bricks[c][r].status === 2) {
                    ctx.fillStyle = '#f1c40f';
                } else if (bricks[c][r].status === 3) {
                    ctx.fillStyle = '#7f8c8d';
                } else if (bricks[c][r].status === 4) {
                    ctx.fillStyle = '#2ecc71';
                }
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

function drawDistractions() {
    distractions.forEach((d, index) => {
        ctx.beginPath();
        ctx.rect(d.x, d.y, BRICK_WIDTH, BRICK_HEIGHT);
        ctx.fillStyle = '#7f8c8d';
        ctx.fill();
        ctx.closePath();
        d.y += d.dy;
        if (d.y + BRICK_HEIGHT > canvas.height) {
            distractions.splice(index, 1);
        } else if (d.x > paddleX && d.x < paddleX + PADDLE_WIDTH && d.y + BRICK_HEIGHT > canvas.height - PADDLE_HEIGHT) {
            distractions.splice(index, 1);
            gameState.lives--;
            updateLivesDisplay();
            if (gameState.lives === 0) {
                endGame(false);
            }
        }
    });
}

function drawPowerups() {
    powerups.forEach((p, index) => {
        ctx.beginPath();
        ctx.rect(p.x, p.y, BRICK_WIDTH / 2, BRICK_HEIGHT / 2);
        ctx.fillStyle = '#2ecc71';
        ctx.fill();
        ctx.closePath();
        p.y += p.dy;
        if (p.y + BRICK_HEIGHT / 2 > canvas.height) {
            powerups.splice(index, 1);
        } else if (p.x > paddleX && p.x < paddleX + PADDLE_WIDTH && p.y + BRICK_HEIGHT / 2 > canvas.height - PADDLE_HEIGHT) {
            powerups.splice(index, 1);
            gameState.lives++;
            updateLivesDisplay();
            powerupSound.play();
        }
    });
}

function collisionDetection() {
    for (let c = 0; c < BRICK_COLUMNS; c++) {
        for (let r = 0; r < BRICK_ROWS; r++) {
            const b = bricks[c][r];
            if (b.status > 0) {
                if (ballX > b.x && ballX < b.x + BRICK_WIDTH && ballY > b.y && ballY < b.y + BRICK_HEIGHT) {
                    ballDY = -ballDY;
                    if (b.status === 2) {
                        gameState.score += 2;
                    } else if (b.status === 3) {
                        distractions.push({ x: b.x, y: b.y, dx: (Math.random() - 0.5) * 2, dy: 2 });
                    } else if (b.status === 4) {
                        powerups.push({ x: b.x, y: b.y, dx: (Math.random() - 0.5) * 2, dy: 2 });
                    } else {
                        gameState.score++;
                    }
                    b.status = 0;
                    updateScoreDisplay();
                    collisionSound.play();
                    if (allBricksCleared()) {
                        nextLevel();
                    }
                }
            }
        }
    }
}

function movePaddle() {
    if (rightPressed && paddleX < canvas.width - PADDLE_WIDTH) {
        paddleX += paddleSpeed;
    } else if (leftPressed && paddleX > 0) {
        paddleX -= paddleSpeed;
    }
}

function moveBall() {
    ballX += ballDX;
    ballY += ballDY;

    if (ballX + BALL_RADIUS > canvas.width || ballX - BALL_RADIUS < 0) {
        ballDX = -ballDX;
    }

    if (ballY - BALL_RADIUS < 0) {
        ballDY = -ballDY;
    } else if (ballY + BALL_RADIUS > canvas.height) {
        if (ballX > paddleX && ballX < paddleX + PADDLE_WIDTH) {
            ballDY = -ballDY;
        } else {
            gameState.lives--;
            updateLivesDisplay();
            if (gameState.lives === 0) {
                endGame(false);
            } else {
                resetBallAndPaddle();
            }
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPaddle();
    drawBall();
    drawBricks();
    drawDistractions();
    drawPowerups();
    movePaddle();
    moveBall();
    collisionDetection();

    if (gameState.playing && !gameState.paused) {
        requestAnimationFrame(draw);
    }
}

function startGame() {
    overlay.style.display = 'none';
    restartButton.style.display = 'none';
    gameState.playing = true;
    draw();
}

function restartLevel() {
    overlay.style.display = 'none';
    gameState.lives = 3;
    updateLivesDisplay();
    gameState.score = 0;
    updateScoreDisplay();
    resetBricks();
    resetBallAndPaddle();
    startGame();
}

function nextLevel() {
    gameState.level++;
    updateLevelDisplay();
    winSound.play();
    resetBricks();
    resetBallAndPaddle();
}

function endGame(won) {
    gameState.playing = false;
    if (won) {
        overlayMessage.textContent = 'You Win!';
        nextLevel();
    } else {
        gameOverSound.play();
        overlayMessage.textContent = 'Game Over';
        restartButton.style.display = 'block';
    }
    overlay.style.display = 'block';
}

function resetBricks() {
    bricks = [];
    for (let c = 0; c < BRICK_COLUMNS; c++) {
        bricks[c] = [];
        for (let r = 0; r < BRICK_ROWS; r++) {
            let status = 1;
            if (Math.random() < GOLDEN_BRICK_PROBABILITY) {
                status = 2;
            } else if (Math.random() < DISTRACTION_BRICK_PROBABILITY) {
                status = 3;
            } else if (Math.random() < POWERUP_PROBABILITY) {
                status = 4;
            }
            bricks[c][r] = { x: 0, y: 0, status: status };
        }
    }
}

function resetBallAndPaddle() {
    ballX = Math.random() * (canvas.width - 2 * BALL_RADIUS) + BALL_RADIUS;
    ballY = canvas.height - 30;
    ballDX = BALL_SPEED * (Math.random() < 0.5 ? -1 : 1);
    ballDY = -BALL_SPEED;
    paddleX = (canvas.width - PADDLE_WIDTH) / 2;
}

function updateScoreDisplay() {
    scoreDisplay.textContent = `Score: ${gameState.score}`;
}

function updateLivesDisplay() {
    livesDisplay.textContent = `Lives: ${gameState.lives}`;
}

function updateLevelDisplay() {
    levelDisplay.textContent = `Level: ${gameState.level}`;
}

function allBricksCleared() {
    return bricks.flat().every(brick => brick.status === 0);
}

function togglePause() {
    gameState.paused = !gameState.paused;
    if (!gameState.paused) {
        draw();
    }
}

resetBricks();
resetBallAndPaddle();
updateScoreDisplay();
updateLivesDisplay();
updateLevelDisplay();
overlay.style.display = 'block';
overlayMessage.textContent = 'Welcome to Ultimate Breakout!';
restartButton.style.display = 'none';
