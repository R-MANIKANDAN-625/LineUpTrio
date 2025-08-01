document.addEventListener('DOMContentLoaded', () => {
    const status = document.getElementById('status');
    const resetButton = document.getElementById('reset');
    const difficultySelect = document.getElementById('difficulty');
    const cells = document.querySelectorAll('.cell');

    let gameState = Array(9).fill('');
    let currentPlayer = 'X';
    let gameActive = true;
    let gamePhase = 'placement';
    let playerPieces = 0;
    let computerPieces = 0;
    const maxPieces = 3;
    let selectedPieceIndex = null;
    let moveHistory = [];
    let lastPlayerMove = null;
    let computerDifficulty = difficultySelect.value;

    // Movement rules for each position
    const movementRules = {
        0: [3, 4, 1],    // Top-left
        1: [0, 2, 4],    // Top-middle
        2: [1, 4, 5],    // Top-right
        3: [0, 4, 6],    // Middle-left
        4: [0, 1, 2, 3, 5, 6, 7, 8], // Center - most powerful
        5: [2, 4, 8],    // Middle-right
        6: [3, 4, 7],    // Bottom-left
        7: [6, 4, 8],    // Bottom-middle
        8: [5, 4, 7]     // Bottom-right
    };

    // Strategic position values
    const positionValues = {
        4: 10,  // Center is most valuable
        0: 6, 2: 6, 6: 6, 8: 6,  // Corners are valuable
        1: 4, 3: 4, 5: 4, 7: 4   // Edges are less valuable
    };

    const winningCombinations = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
        [0, 4, 8], [2, 4, 6]             // diagonals
    ];

    // Event listeners
    difficultySelect.addEventListener('change', (e) => {
        computerDifficulty = e.target.value;
        resetGame();
    });

    function getValidMoves(fromIndex) {
        return movementRules[fromIndex] || [];
    }

    function evaluatePosition(gameState, player) {
        let score = 0;
        const opponent = player === 'X' ? 'O' : 'X';
        
        // Check for immediate wins
        for (const combo of winningCombinations) {
            const [a, b, c] = combo;
            const playerCount = [gameState[a], gameState[b], gameState[c]].filter(cell => cell === player).length;
            const opponentCount = [gameState[a], gameState[b], gameState[c]].filter(cell => cell === opponent).length;
            const emptyCount = [gameState[a], gameState[b], gameState[c]].filter(cell => cell === '').length;
            
            if (playerCount === 3) score += 1000; // Win
            else if (playerCount === 2 && emptyCount === 1) score += 100; // Almost win
            else if (playerCount === 1 && emptyCount === 2) score += 10; // Potential
            
            if (opponentCount === 3) score -= 1000; // Opponent wins
            else if (opponentCount === 2 && emptyCount === 1) score -= 150; // Must block
            else if (opponentCount === 1 && emptyCount === 2) score -= 5; // Opponent potential
        }
        
        // Position values
        for (let i = 0; i < 9; i++) {
            if (gameState[i] === player) {
                score += positionValues[i];
            } else if (gameState[i] === opponent) {
                score -= positionValues[i];
            }
        }
        
        // Mobility bonus - more moves available is better
        const playerPieces = gameState.map((cell, idx) => cell === player ? idx : -1).filter(idx => idx !== -1);
        const opponentPieces = gameState.map((cell, idx) => cell === opponent ? idx : -1).filter(idx => idx !== -1);
        
        let playerMobility = 0;
        let opponentMobility = 0;
        
        for (const piece of playerPieces) {
            playerMobility += getValidMoves(piece).filter(idx => gameState[idx] === '').length;
        }
        
        for (const piece of opponentPieces) {
            opponentMobility += getValidMoves(piece).filter(idx => gameState[idx] === '').length;
        }
        
        score += (playerMobility - opponentMobility) * 5;
        
        return score;
    }

    function minimax(gameState, depth, isMaximizing, alpha, beta, player) {
        if (depth === 0 || checkWin('X') || checkWin('O')) {
            return evaluatePosition(gameState, 'O');
        }
        
        const currentPlayer = isMaximizing ? 'O' : 'X';
        const pieces = gameState.map((cell, idx) => cell === currentPlayer ? idx : -1).filter(idx => idx !== -1);
        
        if (isMaximizing) {
            let maxEval = -Infinity;
            
            for (const from of pieces) {
                const moves = getValidMoves(from).filter(to => gameState[to] === '');
                
                for (const to of moves) {
                    // Make move
                    gameState[to] = currentPlayer;
                    gameState[from] = '';
                    
                    const eval = minimax(gameState, depth - 1, false, alpha, beta, player);
                    
                    // Undo move
                    gameState[from] = currentPlayer;
                    gameState[to] = '';
                    
                    maxEval = Math.max(maxEval, eval);
                    alpha = Math.max(alpha, eval);
                    
                    if (beta <= alpha) break; // Alpha-beta pruning
                }
                
                if (beta <= alpha) break;
            }
            
            return maxEval;
        } else {
            let minEval = Infinity;
            
            for (const from of pieces) {
                const moves = getValidMoves(from).filter(to => gameState[to] === '');
                
                for (const to of moves) {
                    // Make move
                    gameState[to] = currentPlayer;
                    gameState[from] = '';
                    
                    const eval = minimax(gameState, depth - 1, true, alpha, beta, player);
                    
                    // Undo move
                    gameState[from] = currentPlayer;
                    gameState[to] = '';
                    
                    minEval = Math.min(minEval, eval);
                    beta = Math.min(beta, eval);
                    
                    if (beta <= alpha) break;
                }
                
                if (beta <= alpha) break;
            }
            
            return minEval;
        }
    }

    function render() {
        gameState.forEach((val, idx) => {
            cells[idx].textContent = val;
            cells[idx].className = 'cell';
            if (val === 'X') cells[idx].classList.add('x');
            if (val === 'O') cells[idx].classList.add('o');
        });
        
        if (selectedPieceIndex !== null) {
            cells[selectedPieceIndex].classList.add('selected');
        }
        
        if (gamePhase === 'movement' && selectedPieceIndex !== null) {
            const validMoves = getValidMoves(selectedPieceIndex);
            validMoves.forEach(idx => {
                if (gameState[idx] === '') {
                    cells[idx].classList.add('valid-move');
                }
            });
        }
    }

    function handleCellClick(e) {
        const idx = parseInt(e.target.getAttribute('data-index'));
        
        if (!gameActive) return;
        
        if (gamePhase === 'placement') {
            handlePlacementPhase(idx);
        } else {
            handleMovementPhase(idx);
        }
    }

    function handlePlacementPhase(idx) {
        if (currentPlayer !== 'X') return;
        if (gameState[idx] !== '') return;
        if (playerPieces >= maxPieces) return;
        
        gameState[idx] = 'X';
        playerPieces++;
        lastPlayerMove = idx;
        moveHistory.push({player: 'X', from: null, to: idx, phase: 'placement'});
        
        if (checkWin('X')) {
            endGame('You win!');
            return;
        }
        
        if (playerPieces === maxPieces && computerPieces === maxPieces) {
            gamePhase = 'movement';
            status.textContent = 'Move your piece (X)';
        } else {
            status.textContent = "Computer's turn (O)";
        }
        
        render();
        currentPlayer = 'O';
        setTimeout(computerMove, 600);
    }

    function handleMovementPhase(idx) {
        if (currentPlayer !== 'X') return;
        
        if (selectedPieceIndex === null) {
            if (gameState[idx] === 'X') {
                selectedPieceIndex = idx;
                status.textContent = 'Select destination';
            }
        } else {
            if (idx === selectedPieceIndex) {
                selectedPieceIndex = null;
                status.textContent = 'Move your piece (X)';
            } else if (gameState[idx] === '') {
                const validMoves = getValidMoves(selectedPieceIndex);
                if (validMoves.includes(idx)) {
                    gameState[idx] = 'X';
                    gameState[selectedPieceIndex] = '';
                    moveHistory.push({player: 'X', from: selectedPieceIndex, to: idx, phase: 'movement'});
                    lastPlayerMove = {from: selectedPieceIndex, to: idx};
                    selectedPieceIndex = null;
                    
                    if (checkWin('X')) {
                        endGame('You win!');
                        return;
                    }
                    
                    status.textContent = "Computer's turn (O)";
                    currentPlayer = 'O';
                    setTimeout(computerMove, 600);
                }
            }
        }
        
        render();
    }

    function computerMove() {
        if (!gameActive || currentPlayer !== 'O') return;
        
        let move;
        
        if (gamePhase === 'placement') {
            move = getComputerPlacementMove();
            gameState[move] = 'O';
            computerPieces++;
            moveHistory.push({player: 'O', from: null, to: move, phase: 'placement'});
            
            if (checkWin('O')) {
                endGame('Computer wins!');
                return;
            }
            
            if (playerPieces === maxPieces && computerPieces === maxPieces) {
                gamePhase = 'movement';
                status.textContent = 'Move your piece (X)';
            } else {
                status.textContent = "Your turn (X)";
            }
        } else {
            move = getComputerMovementMove();
            if (move) {
                gameState[move.to] = 'O';
                gameState[move.from] = '';
                moveHistory.push({player: 'O', from: move.from, to: move.to, phase: 'movement'});
                
                if (checkWin('O')) {
                    endGame('Computer wins!');
                    return;
                }
                
                status.textContent = "Your turn (X)";
            }
        }
        
        currentPlayer = 'X';
        render();
    }

    function getComputerPlacementMove() {
        const emptyCells = gameState
            .map((val, idx) => val === '' ? idx : -1)
            .filter(idx => idx !== -1);

        if (computerDifficulty === 'easy') {
            return emptyCells[Math.floor(Math.random() * emptyCells.length)];
        }

        if (computerDifficulty === 'medium') {
            // 1. Block immediate player wins
            for (let i = 0; i < winningCombinations.length; i++) {
                const [a, b, c] = winningCombinations[i];
                if (gameState[a] === 'X' && gameState[b] === 'X' && gameState[c] === '') return c;
                if (gameState[a] === 'X' && gameState[c] === 'X' && gameState[b] === '') return b;
                if (gameState[b] === 'X' && gameState[c] === 'X' && gameState[a] === '') return a;
            }
            
            // 2. Take center if available
            if (emptyCells.includes(4)) return 4;
            
            // 3. Random move
            return emptyCells[Math.floor(Math.random() * emptyCells.length)];
        }

        // Hard difficulty
        // 1. Try to win immediately
        for (let i = 0; i < winningCombinations.length; i++) {
            const [a, b, c] = winningCombinations[i];
            if (gameState[a] === 'O' && gameState[b] === 'O' && gameState[c] === '') return c;
            if (gameState[a] === 'O' && gameState[c] === 'O' && gameState[b] === '') return b;
            if (gameState[b] === 'O' && gameState[c] === 'O' && gameState[a] === '') return a;
        }
        
        // 2. Block immediate player wins
        for (let i = 0; i < winningCombinations.length; i++) {
            const [a, b, c] = winningCombinations[i];
            if (gameState[a] === 'X' && gameState[b] === 'X' && gameState[c] === '') return c;
            if (gameState[a] === 'X' && gameState[c] === 'X' && gameState[b] === '') return b;
            if (gameState[b] === 'X' && gameState[c] === 'X' && gameState[a] === '') return a;
        }
        
        // 3. Create fork opportunities (two ways to win)
        for (const cell of emptyCells) {
            let winningLines = 0;
            for (const combo of winningCombinations) {
                if (combo.includes(cell)) {
                    const otherCells = combo.filter(c => c !== cell);
                    const computerCount = otherCells.filter(c => gameState[c] === 'O').length;
                    const playerCount = otherCells.filter(c => gameState[c] === 'X').length;
                    
                    if (computerCount === 1 && playerCount === 0) {
                        winningLines++;
                    }
                }
            }
            if (winningLines >= 2) return cell; // Fork opportunity
        }
        
        // 4. Counter-fork (prevent player from creating forks)
        for (const cell of emptyCells) {
            let playerWinningLines = 0;
            for (const combo of winningCombinations) {
                if (combo.includes(cell)) {
                    const otherCells = combo.filter(c => c !== cell);
                    const playerCount = otherCells.filter(c => gameState[c] === 'X').length;
                    const computerCount = otherCells.filter(c => gameState[c] === 'O').length;
                    
                    if (playerCount === 1 && computerCount === 0) {
                        playerWinningLines++;
                    }
                }
            }
            if (playerWinningLines >= 2) return cell; // Block fork
        }
        
        // 5. Strategic positioning based on opponent's last move
        if (lastPlayerMove !== null) {
            // If player took center, take a corner
            if (lastPlayerMove === 4 && emptyCells.some(c => [0, 2, 6, 8].includes(c))) {
                const corners = [0, 2, 6, 8].filter(c => emptyCells.includes(c));
                return corners[Math.floor(Math.random() * corners.length)];
            }
            
            // If player took a corner, consider center or opposite corner
            if ([0, 2, 6, 8].includes(lastPlayerMove)) {
                if (emptyCells.includes(4)) return 4; // Take center
                
                // Take opposite corner if available
                const opposites = {0: 8, 2: 6, 6: 2, 8: 0};
                if (emptyCells.includes(opposites[lastPlayerMove])) {
                    return opposites[lastPlayerMove];
                }
            }
        }
        
        // 6. Prefer center, then corners, then edges
        const center = 4;
        const corners = [0, 2, 6, 8];
        const edges = [1, 3, 5, 7];
        
        if (emptyCells.includes(center)) return center;
        
        const availableCorners = corners.filter(idx => emptyCells.includes(idx));
        if (availableCorners.length > 0) {
            return availableCorners[Math.floor(Math.random() * availableCorners.length)];
        }
        
        const availableEdges = edges.filter(idx => emptyCells.includes(idx));
        if (availableEdges.length > 0) {
            return availableEdges[Math.floor(Math.random() * availableEdges.length)];
        }
        
        // 7. Fallback to any empty cell
        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }

    function getComputerMovementMove() {
        const computerPositions = gameState
            .map((val, idx) => val === 'O' ? idx : -1)
            .filter(idx => idx !== -1);
        const playerPositions = gameState
            .map((val, idx) => val === 'X' ? idx : -1)
            .filter(idx => idx !== -1);
        
        // Easy difficulty - random moves
        if (computerDifficulty === 'easy') {
            for (const from of computerPositions) {
                const moves = getValidMoves(from).filter(to => gameState[to] === '');
                if (moves.length) return { from, to: moves[Math.floor(Math.random() * moves.length)] };
            }
        }
        
        // Medium difficulty - basic strategy
        if (computerDifficulty === 'medium') {
            // 1. First check if computer can win immediately
            for (const from of computerPositions) {
                const moves = getValidMoves(from).filter(to => gameState[to] === '');
                for (const to of moves) {
                    // Simulate move
                    gameState[to] = 'O';
                    gameState[from] = '';
                    
                    if (checkWin('O')) {
                        // Undo simulation
                        gameState[from] = 'O';
                        gameState[to] = '';
                        return { from, to };
                    }
                    
                    // Undo simulation
                    gameState[from] = 'O';
                    gameState[to] = '';
                }
            }

            // 2. Check if player can win next move and block them
            const threats = [];
            for (const from of playerPositions) {
                const moves = getValidMoves(from).filter(to => gameState[to] === '');
                for (const to of moves) {
                    // Simulate player move
                    gameState[to] = 'X';
                    gameState[from] = '';
                    
                    if (checkWin('X')) {
                        threats.push(to);
                    }
                    
                    // Undo simulation
                    gameState[from] = 'X';
                    gameState[to] = '';
                }
            }

            // If there are threats, block the first one we can
            if (threats.length > 0) {
                const threatCell = threats[0];
                for (const from of computerPositions) {
                    const moves = getValidMoves(from);
                    if (moves.includes(threatCell) && gameState[threatCell] === '') {
                        return { from, to: threatCell };
                    }
                }
            }

            // 3. Try to create two-in-a-row opportunities
            for (const from of computerPositions) {
                const moves = getValidMoves(from).filter(to => gameState[to] === '');
                for (const to of moves) {
                    // Simulate move
                    gameState[to] = 'O';
                    gameState[from] = '';
                    
                    // Check if this creates multiple two-in-a-row opportunities
                    let twoInARowCount = 0;
                    for (const combo of winningCombinations) {
                        if (combo.includes(to)) {
                            const [a, b, c] = combo;
                            const count = [gameState[a], gameState[b], gameState[c]].filter(cell => cell === 'O').length;
                            if (count === 2) twoInARowCount++;
                        }
                    }
                    
                    // Undo simulation
                    gameState[from] = 'O';
                    gameState[to] = '';
                    
                    if (twoInARowCount >= 1) {
                        return { from, to };
                    }
                }
            }

            // 4. Prefer center position
            for (const from of computerPositions) {
                const moves = getValidMoves(from).filter(to => gameState[to] === '');
                if (moves.includes(4)) {
                    return { from, to: 4 };
                }
            }

            // 5. Make a random valid move
            for (const from of computerPositions) {
                const moves = getValidMoves(from).filter(to => gameState[to] === '');
                if (moves.length > 0) {
                    return { from, to: moves[Math.floor(Math.random() * moves.length)] };
                }
            }
        }
        
        // Hard difficulty - minimax algorithm
        if (computerDifficulty === 'hard') {
            let bestMove = null;
            let bestScore = -Infinity;
            
            for (const from of computerPositions) {
                const moves = getValidMoves(from).filter(to => gameState[to] === '');
                
                for (const to of moves) {
                    // Make move
                    gameState[to] = 'O';
                    gameState[from] = '';
                    
                    const score = minimax(gameState, 3, false, -Infinity, Infinity, 'O');
                    
                    // Undo move
                    gameState[from] = 'O';
                    gameState[to] = '';
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { from, to };
                    }
                }
            }
            
            if (bestMove) return bestMove;
        }
        
        // Fallback to random move if no other move found
        for (const from of computerPositions) {
            const moves = getValidMoves(from).filter(to => gameState[to] === '');
            if (moves.length) return { from, to: moves[Math.floor(Math.random() * moves.length)] };
        }
        
        return null;
    }

    function checkWin(player) {
        for (const combo of winningCombinations) {
            const [a, b, c] = combo;
            if (gameState[a] === player && gameState[b] === player && gameState[c] === player) {
                return true;
            }
        }
        return false;
    }

    function checkStalemate() {
        // Check if current player has any valid moves
        const currentPlayerPositions = gameState
            .map((val, idx) => val === currentPlayer ? idx : -1)
            .filter(idx => idx !== -1);
        
        for (const from of currentPlayerPositions) {
            const moves = getValidMoves(from).filter(to => gameState[to] === '');
            if (moves.length > 0) return false;
        }
        
        return true; // No valid moves = stalemate
    }

    function endGame(message) {
        gameActive = false;
        if (message === 'You win!') {
            launchConfetti();
            showWinOverlay();
        }
        if (message === 'Computer wins!') {
            message = 'You lose!';
            showRedFlash();
            shakeBoard();
            slowCollapseBoard(resetGame);
            status.textContent = message;
        }
        
        status.textContent = message;
        setTimeout(resetGame, 1000);
    }

    function resetGame() {
        gameState = Array(9).fill('');
        currentPlayer = 'X';
        gameActive = true;
        gamePhase = 'placement';
        playerPieces = 0;
        computerPieces = 0;
        selectedPieceIndex = null;
        moveHistory = [];
        lastPlayerMove = null;
        status.textContent = 'Place your piece (X)';
        render();
    }

    // Initialize event listeners
    cells.forEach(cell => cell.addEventListener('click', handleCellClick));
    resetButton.addEventListener('click', resetGame);
    
    // Initialize the game
    resetGame();
});

// Animation functions
function launchConfetti() {
    const jsConfetti = new JSConfetti();

    const canvas = document.querySelector('canvas');
    if (canvas) {
        canvas.style.zIndex = '9999';
        canvas.style.position = 'fixed';
        canvas.style.pointerEvents = 'none';
    }

    jsConfetti.addConfetti({
        emojis: ['🎉', '🎊', '🥳', '😄', '🏆', '🥇', '💯'],
        emojiSize: 50,
        confettiRadius: 5,
        confettiNumber: 50,
    });

    setTimeout(() => {
        jsConfetti.addConfetti({
            confettiColors: ['#ff0', '#0ff', '#0f0', '#f0f', '#f00'],
            confettiRadius: 5,
            confettiNumber: 100,
        });
    }, 300);
}

function showRedFlash() {
    const overlay = document.getElementById('lose-overlay');
    overlay.style.opacity = '1';
    setTimeout(() => overlay.style.opacity = '0', 700);
}

function shakeBoard() {
    const board = document.getElementById('board');
    board.classList.add('shake');
    setTimeout(() => board.classList.remove('shake'), 400);
}

function slowCollapseBoard(callback) {
    const board = document.getElementById('board');
    board.classList.add('collapse-animation');

    setTimeout(() => {
        board.classList.remove('collapse-animation');
        callback();
    }, 1000);
}

function showWinOverlay() {
    const overlay = document.getElementById('win-overlay');
    overlay.classList.add('show');

    setTimeout(() => {
        overlay.classList.remove('show');
    }, 2000);
}