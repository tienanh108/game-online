/* =====================================================
   CARO 5 - SMART AI
   4 LEVELS:
   easy / medium / hard / extreme
===================================================== */


/* =====================================================
   MAIN AI
===================================================== */

function getAIMove(boardState, size, difficulty = "medium") {

    const empty = [];

    for (let i = 0; i < boardState.length; i++) {
        if (boardState[i] === "") {
            empty.push(i);
        }
    }

    if (empty.length === 0) {
        return -1;
    }


    /* =========================
       FIRST MOVE
    ========================= */

    if (empty.length === boardState.length) {

        const center = Math.floor(size / 2);

        return center * size + center;
    }


    /* =========================
       ALWAYS CHECK WIN
    ========================= */

    const winningMove = findWinningMove(
        boardState,
        size,
        "O"
    );

    if (winningMove !== -1) {
        return winningMove;
    }


    /* =========================
       ALWAYS BLOCK WIN
    ========================= */

    const blockingMove = findWinningMove(
        boardState,
        size,
        "X"
    );

    if (blockingMove !== -1) {
        return blockingMove;
    }


    /* =========================
       EASY
    ========================= */

    if (difficulty === "easy") {

        return getEasyMove(
            boardState,
            size
        );
    }


    /* =========================
       MEDIUM
    ========================= */

    if (difficulty === "medium") {

        return getBestMove(
            boardState,
            size,
            1,
            18
        );
    }


    /* =========================
       HARD
    ========================= */

    if (difficulty === "hard") {

        return getBestMove(
            boardState,
            size,
            2,
            22
        );
    }


    /* =========================
       EXTREME
    ========================= */

    return getBestMove(
        boardState,
        size,
        3,
        28
    );
}


/* =====================================================
   EASY AI
===================================================== */

function getEasyMove(boardState, size) {

    const candidates =
        getCandidateMoves(
            boardState,
            size,
            2
        );

    if (candidates.length === 0) {
        return getRandomEmpty(boardState);
    }


    /*
       Easy AI sometimes makes a
       random move instead of choosing
       the mathematically best one.
    */

    if (Math.random() < 0.55) {

        return candidates[
            Math.floor(
                Math.random() * candidates.length
            )
        ];
    }


    let bestScore = -Infinity;
    let bestMoves = [];


    for (const move of candidates) {

        boardState[move] = "O";

        const score =
            evaluateMove(
                boardState,
                size,
                move,
                "O"
            );

        boardState[move] = "";


        if (score > bestScore) {

            bestScore = score;
            bestMoves = [move];

        } else if (score === bestScore) {

            bestMoves.push(move);
        }
    }


    return bestMoves[
        Math.floor(
            Math.random() * bestMoves.length
        )
    ];
}


/* =====================================================
   STRONG AI SEARCH
===================================================== */

function getBestMove(
    boardState,
    size,
    depth,
    maxCandidates
) {

    const candidates =
        getCandidateMoves(
            boardState,
            size,
            2
        );


    if (candidates.length === 0) {
        return getRandomEmpty(boardState);
    }


    /*
       Limit candidates so 25x25 boards
       don't become extremely slow.
    */

    const ranked = candidates
        .map(index => {

            boardState[index] = "O";

            const score =
                evaluateMove(
                    boardState,
                    size,
                    index,
                    "O"
                );

            boardState[index] = "";

            return {
                index,
                score
            };
        })
        .sort(
            (a, b) =>
                b.score - a.score
        )
        .slice(0, maxCandidates);


    let bestScore = -Infinity;
    let bestMove = ranked[0].index;


    for (const item of ranked) {

        boardState[item.index] = "O";


        let score;

        if (depth <= 1) {

            score =
                evaluateBoard(
                    boardState,
                    size
                );

        } else {

            score =
                minimax(
                    boardState,
                    size,
                    depth - 1,
                    false,
                    -Infinity,
                    Infinity,
                    maxCandidates
                );
        }


        boardState[item.index] = "";


        if (score > bestScore) {

            bestScore = score;
            bestMove = item.index;
        }
    }


    return bestMove;
}


/* =====================================================
   MINIMAX
===================================================== */

function minimax(
    boardState,
    size,
    depth,
    maximizing,
    alpha,
    beta,
    maxCandidates
) {

    if (depth <= 0) {

        return evaluateBoard(
            boardState,
            size
        );
    }


    const candidates =
        getCandidateMoves(
            boardState,
            size,
            2
        );


    if (candidates.length === 0) {
        return 0;
    }


    const player =
        maximizing ? "O" : "X";


    const ranked = candidates
        .map(index => {

            boardState[index] = player;

            const score =
                evaluateMove(
                    boardState,
                    size,
                    index,
                    player
                );

            boardState[index] = "";

            return {
                index,
                score
            };
        })
        .sort(
            (a, b) =>
                maximizing
                    ? b.score - a.score
                    : a.score - b.score
        )
        .slice(0, maxCandidates);


    if (maximizing) {

        let value = -Infinity;


        for (const item of ranked) {

            boardState[item.index] = "O";


            if (
                aiCheckWin(
                    boardState,
                    size,
                    item.index,
                    "O"
                )
            ) {

                boardState[item.index] = "";

                return 10000000;
            }


            const score =
                minimax(
                    boardState,
                    size,
                    depth - 1,
                    false,
                    alpha,
                    beta,
                    maxCandidates
                );


            boardState[item.index] = "";


            value =
                Math.max(
                    value,
                    score
                );

            alpha =
                Math.max(
                    alpha,
                    value
                );


            if (alpha >= beta) {
                break;
            }
        }


        return value;

    } else {

        let value = Infinity;


        for (const item of ranked) {

            boardState[item.index] = "X";


            if (
                aiCheckWin(
                    boardState,
                    size,
                    item.index,
                    "X"
                )
            ) {

                boardState[item.index] = "";

                return -10000000;
            }


            const score =
                minimax(
                    boardState,
                    size,
                    depth - 1,
                    true,
                    alpha,
                    beta,
                    maxCandidates
                );


            boardState[item.index] = "";


            value =
                Math.min(
                    value,
                    score
                );

            beta =
                Math.min(
                    beta,
                    value
                );


            if (alpha >= beta) {
                break;
            }
        }


        return value;
    }
}


/* =====================================================
   CANDIDATE MOVES
===================================================== */

function getCandidateMoves(
    boardState,
    size,
    distance
) {

    const result = [];
    const used = new Set();


    for (let index = 0; index < boardState.length; index++) {

        if (boardState[index] === "") {
            continue;
        }


        const row =
            Math.floor(index / size);

        const col =
            index % size;


        for (
            let dr = -distance;
            dr <= distance;
            dr++
        ) {

            for (
                let dc = -distance;
                dc <= distance;
                dc++
            ) {

                if (
                    dr === 0 &&
                    dc === 0
                ) {
                    continue;
                }


                const r = row + dr;
                const c = col + dc;


                if (
                    r < 0 ||
                    r >= size ||
                    c < 0 ||
                    c >= size
                ) {
                    continue;
                }


                const candidate =
                    r * size + c;


                if (
                    boardState[candidate] === "" &&
                    !used.has(candidate)
                ) {

                    used.add(candidate);
                    result.push(candidate);
                }
            }
        }
    }


    /*
       If the board is somehow empty,
       use the center.
    */

    if (result.length === 0) {

        const center =
            Math.floor(size / 2);

        return [
            center * size + center
        ];
    }


    return result;
}


/* =====================================================
   FIND WINNING MOVE
===================================================== */

function findWinningMove(
    boardState,
    size,
    player
) {

    const candidates =
        getCandidateMoves(
            boardState,
            size,
            2
        );


    for (const index of candidates) {

        boardState[index] = player;


        const win =
            aiCheckWin(
                boardState,
                size,
                index,
                player
            );


        boardState[index] = "";


        if (win) {
            return index;
        }
    }


    return -1;
}


/* =====================================================
   EVALUATE BOARD
===================================================== */

function evaluateBoard(
    boardState,
    size
) {

    let score = 0;


    for (let index = 0; index < boardState.length; index++) {

        if (boardState[index] === "") {
            continue;
        }


        const player =
            boardState[index];


        const moveScore =
            evaluateMove(
                boardState,
                size,
                index,
                player
            );


        if (player === "O") {
            score += moveScore;
        } else {
            score -= moveScore;
        }
    }


    return score;
}


/* =====================================================
   EVALUATE MOVE
===================================================== */

function evaluateMove(
    boardState,
    size,
    index,
    player
) {

    let total = 0;


    const row =
        Math.floor(index / size);

    const col =
        index % size;


    const directions = [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, -1]
    ];


    for (const [dr, dc] of directions) {

        const info =
            getLineInfo(
                boardState,
                size,
                row,
                col,
                dr,
                dc,
                player
            );


        total +=
            scoreLine(
                info.count,
                info.openEnds
            );
    }


    /*
       Center bonus
    */

    const center =
        (size - 1) / 2;

    const distance =
        Math.abs(row - center) +
        Math.abs(col - center);


    total +=
        Math.max(
            0,
            30 - distance * 2
        );


    return total;
}


/* =====================================================
   LINE INFO
===================================================== */

function getLineInfo(
    boardState,
    size,
    row,
    col,
    dr,
    dc,
    player
) {

    let count = 1;
    let openEnds = 0;


    let r = row + dr;
    let c = col + dc;


    while (
        r >= 0 &&
        r < size &&
        c >= 0 &&
        c < size
    ) {

        const index =
            r * size + c;


        if (
            boardState[index] !== player
        ) {

            if (
                boardState[index] === ""
            ) {
                openEnds++;
            }

            break;
        }


        count++;

        r += dr;
        c += dc;
    }


    r = row - dr;
    c = col - dc;


    while (
        r >= 0 &&
        r < size &&
        c >= 0 &&
        c < size
    ) {

        const index =
            r * size + c;


        if (
            boardState[index] !== player
        ) {

            if (
                boardState[index] === ""
            ) {
                openEnds++;
            }

            break;
        }


        count++;

        r -= dr;
        c -= dc;
    }


    return {
        count,
        openEnds
    };
}


/* =====================================================
   SCORE LINE
===================================================== */

function scoreLine(
    count,
    openEnds
) {

    if (count >= 5) {
        return 10000000;
    }


    if (count === 4) {

        if (openEnds === 2) {
            return 1000000;
        }

        if (openEnds === 1) {
            return 200000;
        }
    }


    if (count === 3) {

        if (openEnds === 2) {
            return 50000;
        }

        if (openEnds === 1) {
            return 5000;
        }
    }


    if (count === 2) {

        if (openEnds === 2) {
            return 1500;
        }

        if (openEnds === 1) {
            return 200;
        }
    }


    if (count === 1) {

        if (openEnds === 2) {
            return 20;
        }
    }


    return 1;
}


/* =====================================================
   RANDOM EMPTY
===================================================== */

function getRandomEmpty(boardState) {

    const empty = [];

    for (
        let i = 0;
        i < boardState.length;
        i++
    ) {

        if (boardState[i] === "") {
            empty.push(i);
        }
    }


    if (empty.length === 0) {
        return -1;
    }


    return empty[
        Math.floor(
            Math.random() * empty.length
        )
    ];
}


/* =====================================================
   WIN CHECK
===================================================== */

function aiCheckWin(
    boardState,
    size,
    index,
    player
) {

    const row =
        Math.floor(index / size);

    const col =
        index % size;


    const directions = [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, -1]
    ];


    for (const [dr, dc] of directions) {

        let count = 1;


        count += aiCount(
            boardState,
            size,
            row,
            col,
            dr,
            dc,
            player
        );


        count += aiCount(
            boardState,
            size,
            row,
            col,
            -dr,
            -dc,
            player
        );


        if (count >= 5) {
            return true;
        }
    }


    return false;
}


/* =====================================================
   COUNT
===================================================== */

function aiCount(
    boardState,
    size,
    row,
    col,
    dr,
    dc,
    player
) {

    let count = 0;

    let r = row + dr;
    let c = col + dc;


    while (
        r >= 0 &&
        r < size &&
        c >= 0 &&
        c < size
    ) {

        const index =
            r * size + c;


        if (
            boardState[index] !== player
        ) {
            break;
        }


        count++;

        r += dr;
        c += dc;
    }


    return count;
}
