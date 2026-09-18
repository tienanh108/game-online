/* =========================================================
   CARO 5 - AI
   4 mức độ:
   1. Dễ
   2. Trung bình
   3. Khó
   4. Siêu khó
   ========================================================= */
(function () {
    "use strict";
    /*
     * -------------------------------------------------------
     * CẤU HÌNH
     * -------------------------------------------------------
     */
    const AI_PLAYER = "O";
    const HUMAN_PLAYER = "X";
    const WIN_LENGTH = 5;
    /*
     * Điểm cho các thế cờ.
     * Giá trị càng lớn -> AI càng ưu tiên.
     */
    const SCORE = {
        FIVE: 10000000,
        OPEN_FOUR: 500000,
        FOUR: 100000,
        OPEN_THREE: 15000,
        THREE: 3000,
        OPEN_TWO: 600,
        TWO: 100,
        ONE: 10
    };
    /*
     * -------------------------------------------------------
     * HÀM TIỆN ÍCH
     * -------------------------------------------------------
     */
    function getSize() {
        if (typeof boardSize === "number") {
            return boardSize;
        }
        if (
            typeof window.boardSize === "number" &&
            window.boardSize > 0
        ) {
            return window.boardSize;
        }
        return 15;
    }
    function getBoard() {
        if (typeof board !== "undefined") {
            return board;
        }
        if (Array.isArray(window.board)) {
            return window.board;
        }
        return [];
    }
    function isInside(row, col, size) {
        return (
            row >= 0 &&
            row < size &&
            col >= 0 &&
            col < size
        );
    }
    function indexOf(row, col, size) {
        return row * size + col;
    }
    function isEmptyCell(boardArray, row, col, size) {
        if (!isInside(row, col, size)) {
            return false;
        }
        return boardArray[indexOf(row, col, size)] === "";
    }
    function getCenter(size) {
        return (size - 1) / 2;
    }
    function centerDistance(row, col, size) {
        const center = getCenter(size);
        return (
            Math.abs(row - center) +
            Math.abs(col - center)
        );
    }
    /*
     * -------------------------------------------------------
     * LẤY CÁC Ô ỨNG VIÊN
     * -------------------------------------------------------
     *
     * Không xét toàn bộ 25x25.
     * Chỉ xét các ô gần quân đã đánh.
     */
    function getCandidateMoves(boardArray, size, radius) {
        const candidates = [];
        const occupied = [];
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const index = indexOf(row, col, size);
                if (boardArray[index] !== "") {
                    occupied.push({
                        row,
                        col
                    });
                }
            }
        }
        /*
         * Bàn trống:
         * đánh gần trung tâm.
         */
        if (occupied.length === 0) {
            const center = Math.floor(size / 2);
            return [
                {
                    row: center,
                    col: center
                }
            ];
        }
        const seen = new Set();
        for (const piece of occupied) {
            for (
                let row = piece.row - radius;
                row <= piece.row + radius;
                row++
            ) {
                for (
                    let col = piece.col - radius;
                    col <= piece.col + radius;
                    col++
                ) {
                    if (!isInside(row, col, size)) {
                        continue;
                    }
                    const index = indexOf(row, col, size);
                    if (boardArray[index] !== "") {
                        continue;
                    }
                    if (seen.has(index)) {
                        continue;
                    }
                    seen.add(index);
                    candidates.push({
                        row,
                        col
                    });
                }
            }
        }
        /*
         * Ưu tiên ô gần trung tâm.
         */
        candidates.sort((a, b) => {
            return (
                centerDistance(a.row, a.col, size) -
                centerDistance(b.row, b.col, size)
            );
        });
        return candidates;
    }
    /*
     * -------------------------------------------------------
     * ĐẾM CHUỖI
     * -------------------------------------------------------
     */
    function countDirection(
        boardArray,
        row,
        col,
        dr,
        dc,
        player,
        size
    ) {
        let count = 0;
        let r = row + dr;
        let c = col + dc;
        while (
            isInside(r, c, size) &&
            boardArray[indexOf(r, c, size)] === player
        ) {
            count++;
            r += dr;
            c += dc;
        }
        return count;
    }
    function getLineInfo(
        boardArray,
        row,
        col,
        player,
        size,
        dr,
        dc
    ) {
        let count = 1;
        let r = row + dr;
        let c = col + dc;
        while (
            isInside(r, c, size) &&
            boardArray[indexOf(r, c, size)] === player
        ) {
            count++;
            r += dr;
            c += dc;
        }
        const positiveOpen =
            isInside(r, c, size) &&
            boardArray[indexOf(r, c, size)] === "";
        r = row - dr;
        c = col - dc;
        while (
            isInside(r, c, size) &&
            boardArray[indexOf(r, c, size)] === player
        ) {
            count++;
            r -= dr;
            c -= dc;
        }
        const negativeOpen =
            isInside(r, c, size) &&
            boardArray[indexOf(r, c, size)] === "";
        return {
            count,
            openEnds:
                Number(positiveOpen) +
                Number(negativeOpen)
        };
    }
    /*
     * -------------------------------------------------------
     * ĐÁNH GIÁ MỘT NƯỚC
     * -------------------------------------------------------
     */
    function evaluateSingleMove(
        boardArray,
        row,
        col,
        player,
        size
    ) {
        if (!isEmptyCell(boardArray, row, col, size)) {
            return -Infinity;
        }
        const index = indexOf(row, col, size);
        boardArray[index] = player;
        let total = 0;
        const directions = [
            [1, 0],
            [0, 1],
            [1, 1],
            [1, -1]
        ];
        for (const [dr, dc] of directions) {
            const info = getLineInfo(
                boardArray,
                row,
                col,
                player,
                size,
                dr,
                dc
            );
            if (info.count >= WIN_LENGTH) {
                total += SCORE.FIVE;
            } else if (
                info.count === 4 &&
                info.openEnds === 2
            ) {
                total += SCORE.OPEN_FOUR;
            } else if (info.count === 4) {
                total += SCORE.FOUR;
            } else if (
                info.count === 3 &&
                info.openEnds === 2
            ) {
                total += SCORE.OPEN_THREE;
            } else if (info.count === 3) {
                total += SCORE.THREE;
            } else if (
                info.count === 2 &&
                info.openEnds === 2
            ) {
                total += SCORE.OPEN_TWO;
            } else if (info.count === 2) {
                total += SCORE.TWO;
            } else if (info.count === 1) {
                total += SCORE.ONE;
            }
        }
        /*
         * Thưởng nhẹ cho vị trí gần trung tâm.
         */
        total += Math.max(
            0,
            size - centerDistance(row, col, size)
        );
        boardArray[index] = "";
        return total;
    }
    /*
     * -------------------------------------------------------
     * ĐÁNH GIÁ TOÀN BỘ BÀN
     * -------------------------------------------------------
     */
    function evaluateBoard(boardArray, size) {
        let score = 0;
        /*
         * Chấm các chuỗi theo 4 hướng.
         */
        const directions = [
            [1, 0],
            [0, 1],
            [1, 1],
            [1, -1]
        ];
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const player =
                    boardArray[indexOf(row, col, size)];
                if (
                    player !== AI_PLAYER &&
                    player !== HUMAN_PLAYER
                ) {
                    continue;
                }
                for (const [dr, dc] of directions) {
                    /*
                     * Chỉ bắt đầu đếm tại đầu chuỗi.
                     */
                    const previousRow = row - dr;
                    const previousCol = col - dc;
                    if (
                        isInside(
                            previousRow,
                            previousCol,
                            size
                        ) &&
                        boardArray[
                            indexOf(
                                previousRow,
                                previousCol,
                                size
                            )
                        ] === player
                    ) {
                        continue;
                    }
                    let count = 0;
                    let r = row;
                    let c = col;
                    while (
                        isInside(r, c, size) &&
                        boardArray[
                            indexOf(r, c, size)
                        ] === player
                    ) {
                        count++;
                        r += dr;
                        c += dc;
                    }
                    const openStart =
                        isInside(
                            previousRow,
                            previousCol,
                            size
                        ) &&
                        boardArray[
                            indexOf(
                                previousRow,
                                previousCol,
                                size
                            )
                        ] === "";
                    const openEnd =
                        isInside(r, c, size) &&
                        boardArray[
                            indexOf(r, c, size)
                        ] === "";
                    const openEnds =
                        Number(openStart) +
                        Number(openEnd);
                    let value = 0;
                    if (count >= 5) {
                        value = SCORE.FIVE;
                    } else if (
                        count === 4 &&
                        openEnds === 2
                    ) {
                        value = SCORE.OPEN_FOUR;
                    } else if (count === 4) {
                        value = SCORE.FOUR;
                    } else if (
                        count === 3 &&
                        openEnds === 2
                    ) {
                        value = SCORE.OPEN_THREE;
                    } else if (count === 3) {
                        value = SCORE.THREE;
                    } else if (
                        count === 2 &&
                        openEnds === 2
                    ) {
                        value = SCORE.OPEN_TWO;
                    } else if (count === 2) {
                        value = SCORE.TWO;
                    } else if (count === 1) {
                        value = SCORE.ONE;
                    }
                    if (player === AI_PLAYER) {
                        score += value;
                    } else {
                        score -= value * 1.05;
                    }
                }
            }
        }
        return score;
    }
    /*
     * -------------------------------------------------------
     * KIỂM TRA NƯỚC THẮNG NGAY
     * -------------------------------------------------------
     */
    function findWinningMove(
        boardArray,
        player,
        size,
        candidates
    ) {
        for (const move of candidates) {
            const index = indexOf(
                move.row,
                move.col,
                size
            );
            boardArray[index] = player;
            const won = hasFive(
                boardArray,
                move.row,
                move.col,
                player,
                size
            );
            boardArray[index] = "";
            if (won) {
                return move;
            }
        }
        return null;
    }
    function hasFive(
        boardArray,
        row,
        col,
        player,
        size
    ) {
        const directions = [
            [1, 0],
            [0, 1],
            [1, 1],
            [1, -1]
        ];
        for (const [dr, dc] of directions) {
            const total =
                1 +
                countDirection(
                    boardArray,
                    row,
                    col,
                    dr,
                    dc,
                    player,
                    size
                ) +
                countDirection(
                    boardArray,
                    row,
                    col,
                    -dr,
                    -dc,
                    player,
                    size
                );
            if (total >= WIN_LENGTH) {
                return true;
            }
        }
        return false;
    }
    /*
     * -------------------------------------------------------
     * DOUBLE THREAT
     * -------------------------------------------------------
     *
     * Một nước tạo ra từ 2 nước thắng tiếp theo.
     */
    function createsDoubleThreat(
        boardArray,
        move,
        player,
        size,
        candidates
    ) {
        const index = indexOf(
            move.row,
            move.col,
            size
        );
        boardArray[index] = player;
        let winningReplies = 0;
        const nextCandidates =
            getCandidateMoves(
                boardArray,
                size,
                1
            );
        for (const reply of nextCandidates) {
            const replyIndex = indexOf(
                reply.row,
                reply.col,
                size
            );
            boardArray[replyIndex] = player;
            if (
                hasFive(
                    boardArray,
                    reply.row,
                    reply.col,
                    player,
                    size
                )
            ) {
                winningReplies++;
            }
            boardArray[replyIndex] = "";
            if (winningReplies >= 2) {
                break;
            }
        }
        boardArray[index] = "";
        return winningReplies >= 2;
    }
    /*
     * -------------------------------------------------------
     * TÌM NƯỚC PHÒNG THỦ
     * -------------------------------------------------------
     */
    function findDefensiveMove(
        boardArray,
        size,
        candidates
    ) {
        /*
         * Nếu đối thủ có nước thắng ngay,
         * bắt buộc chặn.
         */
        const winningMove = findWinningMove(
            boardArray,
            HUMAN_PLAYER,
            size,
            candidates
        );
        if (winningMove) {
            return winningMove;
        }
        return null;
    }
    /*
     * -------------------------------------------------------
     * MINIMAX
     * -------------------------------------------------------
     */
    function minimax(
        boardArray,
        size,
        depth,
        maximizing,
        alpha,
        beta
    ) {
        if (depth <= 0) {
            return evaluateBoard(
                boardArray,
                size
            );
        }
        let candidates =
            getCandidateMoves(
                boardArray,
                size,
                1
            );
        /*
         * Chỉ giữ những nước có điểm triển vọng nhất.
         * Đây là phần quan trọng để 25x25 không bị đơ.
         */
        candidates = candidates
            .map(move => {
                const player =
                    maximizing
                        ? AI_PLAYER
                        : HUMAN_PLAYER;
                return {
                    move,
                    score: evaluateSingleMove(
                        boardArray,
                        move.row,
                        move.col,
                        player,
                        size
                    )
                };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(item => item.move);
        if (candidates.length === 0) {
            return 0;
        }
        if (maximizing) {
            let best = -Infinity;
            for (const move of candidates) {
                const index = indexOf(
                    move.row,
                    move.col,
                    size
                );
                boardArray[index] = AI_PLAYER;
                if (
                    hasFive(
                        boardArray,
                        move.row,
                        move.col,
                        AI_PLAYER,
                        size
                    )
                ) {
                    boardArray[index] = "";
                    return SCORE.FIVE;
                }
                const value = minimax(
                    boardArray,
                    size,
                    depth - 1,
                    false,
                    alpha,
                    beta
                );
                boardArray[index] = "";
                best = Math.max(best, value);
                alpha = Math.max(alpha, best);
                if (beta <= alpha) {
                    break;
                }
            }
            return best;
        }
        let best = Infinity;
        for (const move of candidates) {
            const index = indexOf(
                move.row,
                move.col,
                size
            );
            boardArray[index] = HUMAN_PLAYER;
            if (
                hasFive(
                    boardArray,
                    move.row,
                    move.col,
                    HUMAN_PLAYER,
                    size
                )
            ) {
                boardArray[index] = "";
                return -SCORE.FIVE;
            }
            const value = minimax(
                boardArray,
                size,
                depth - 1,
                true,
                alpha,
                beta
            );
            boardArray[index] = "";
            best = Math.min(best, value);
            beta = Math.min(beta, best);
            if (beta <= alpha) {
                break;
            }
        }
        return best;
    }
    /*
     * -------------------------------------------------------
     * AI EASY
     * -------------------------------------------------------
     *
     * Có yếu tố ngẫu nhiên.
     */
    function easyMove(
        boardArray,
        size,
        candidates
    ) {
        /*
         * Chỉ khoảng 30% thời gian AI thực sự
         * chọn nước tốt.
         */
        if (Math.random() < 0.70) {
            const randomIndex =
                Math.floor(
                    Math.random() *
                    candidates.length
                );
            return candidates[randomIndex];
        }
        const scored = candidates
            .map(move => ({
                move,
                score: evaluateSingleMove(
                    boardArray,
                    move.row,
                    move.col,
                    AI_PLAYER,
                    size
                )
            }))
            .sort((a, b) => b.score - a.score);
        /*
         * Lấy ngẫu nhiên trong nhóm đầu.
         */
        const topCount = Math.min(
            5,
            scored.length
        );
        return scored[
            Math.floor(
                Math.random() * topCount
            )
        ].move;
    }
    /*
     * -------------------------------------------------------
     * AI MEDIUM
     * -------------------------------------------------------
     */
    function mediumMove(
        boardArray,
        size,
        candidates
    ) {
        /*
         * 1. Có thể thắng -> thắng.
         */
        const win = findWinningMove(
            boardArray,
            AI_PLAYER,
            size,
            candidates
        );
        if (win) {
            return win;
        }
        /*
         * 2. Đối thủ có thể thắng -> chặn.
         */
        const block = findDefensiveMove(
            boardArray,
            size,
            candidates
        );
        if (block) {
            return block;
        }
        /*
         * 3. Chấm nước tấn công + phòng thủ.
         */
        let bestMove = candidates[0];
        let bestScore = -Infinity;
        for (const move of candidates) {
            const attack =
                evaluateSingleMove(
                    boardArray,
                    move.row,
                    move.col,
                    AI_PLAYER,
                    size
                );
            const defense =
                evaluateSingleMove(
                    boardArray,
                    move.row,
                    move.col,
                    HUMAN_PLAYER,
                    size
                );
            const score =
                attack +
                defense * 0.85;
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        return bestMove;
    }
    /*
     * -------------------------------------------------------
     * AI HARD
     * -------------------------------------------------------
     */
    function hardMove(
        boardArray,
        size,
        candidates
    ) {
        /*
         * Thắng ngay.
         */
        const win = findWinningMove(
            boardArray,
            AI_PLAYER,
            size,
            candidates
        );
        if (win) {
            return win;
        }
        /*
         * Chặn thắng ngay.
         */
        const block = findDefensiveMove(
            boardArray,
            size,
            candidates
        );
        if (block) {
            return block;
        }
        /*
         * Tìm double threat.
         */
        for (const move of candidates) {
            if (
                createsDoubleThreat(
                    boardArray,
                    move,
                    AI_PLAYER,
                    size,
                    candidates
                )
            ) {
                return move;
            }
        }
        /*
         * Chấm cả công lẫn thủ.
         */
        let bestMove = candidates[0];
        let bestScore = -Infinity;
        for (const move of candidates) {
            const attack =
                evaluateSingleMove(
                    boardArray,
                    move.row,
                    move.col,
                    AI_PLAYER,
                    size
                );
            const defense =
                evaluateSingleMove(
                    boardArray,
                    move.row,
                    move.col,
                    HUMAN_PLAYER,
                    size
                );
            /*
             * Hard thiên về tấn công,
             * nhưng vẫn coi trọng phòng thủ.
             */
            const score =
                attack * 1.25 +
                defense * 1.0;
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        return bestMove;
    }
    /*
     * -------------------------------------------------------
     * AI EXTREME
     * -------------------------------------------------------
     */
    function extremeMove(
        boardArray,
        size,
        candidates
    ) {
        /*
         * 1. Thắng ngay.
         */
        const win = findWinningMove(
            boardArray,
            AI_PLAYER,
            size,
            candidates
        );
        if (win) {
            return win;
        }
        /*
         * 2. Chặn thắng ngay.
         */
        const block = findDefensiveMove(
            boardArray,
            size,
            candidates
        );
        if (block) {
            return block;
        }
        /*
         * 3. Double threat.
         */
        for (const move of candidates) {
            if (
                createsDoubleThreat(
                    boardArray,
                    move,
                    AI_PLAYER,
                    size,
                    candidates
                )
            ) {
                return move;
            }
        }
        /*
         * 4. Sắp xếp ứng viên theo điểm.
         */
        const ordered = candidates
            .map(move => {
                const attack =
                    evaluateSingleMove(
                        boardArray,
                        move.row,
                        move.col,
                        AI_PLAYER,
                        size
                    );
                const defense =
                    evaluateSingleMove(
                        boardArray,
                        move.row,
                        move.col,
                        HUMAN_PLAYER,
                        size
                    );
                return {
                    move,
                    score:
                        attack * 1.4 +
                        defense * 1.15
                };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 8);
        /*
         * 5. Minimax.
         *
         * 15x15:
         * depth 3
         *
         * 20x20 / 25x25:
         * depth 2 để tránh lag.
         */
        const depth =
            size <= 15
                ? 3
                : 2;
        let bestMove =
            ordered.length > 0
                ? ordered[0].move
                : candidates[0];
        let bestScore = -Infinity;
        for (const item of ordered) {
            const move = item.move;
            const index = indexOf(
                move.row,
                move.col,
                size
            );
            boardArray[index] = AI_PLAYER;
            const score = minimax(
                boardArray,
                size,
                depth - 1,
                false,
                -Infinity,
                Infinity
            );
            boardArray[index] = "";
            /*
             * Một chút ưu tiên cho nước đánh trực tiếp.
             */
            const finalScore =
                score +
                item.score * 0.15;
            if (finalScore > bestScore) {
                bestScore = finalScore;
                bestMove = move;
            }
        }
        return bestMove;
    }
    /*
     * -------------------------------------------------------
     * HÀM CHÍNH
     * -------------------------------------------------------
     *
     * game.js sẽ gọi:
     *
     * getAIMove(difficulty)
     *
     * hoặc:
     *
     * getAIMove()
     */
    function getAIMove(difficulty) {
        const boardArray = getBoard();
        const size = getSize();
        if (!Array.isArray(boardArray)) {
            return null;
        }
        if (size <= 0) {
            return null;
        }
        const expectedLength =
            size * size;
        if (
            boardArray.length <
            expectedLength
        ) {
            return null;
        }
        /*
         * Lấy ứng viên.
         */
        let candidates =
            getCandidateMoves(
                boardArray,
                size,
                2
            );
        if (candidates.length === 0) {
            return null;
        }
        /*
         * Để AI không bị chậm trên bàn lớn,
         * giới hạn số ứng viên.
         */
        const candidateLimit =
            size >= 25
                ? 30
                : size >= 20
                    ? 35
                    : 45;
        candidates =
            candidates.slice(
                0,
                candidateLimit
            );
        /*
         * Chuẩn hóa tên độ khó.
         */
        let level =
            String(
                difficulty ??
                window.aiDifficulty ??
                "medium"
            ).toLowerCase();
        /*
         * Hỗ trợ cả tiếng Việt lẫn tiếng Anh.
         */
        if (
            level === "easy" ||
            level.includes("dễ")
        ) {
            level = "easy";
        } else if (
            level === "hard" ||
            level.includes("khó")
        ) {
            level = "hard";
        } else if (
            level === "extreme" ||
            level.includes("siêu")
        ) {
            level = "extreme";
        } else {
            level = "medium";
        }
        /*
         * Chọn AI tương ứng.
         */
        switch (level) {
            case "easy":
                return easyMove(
                    boardArray,
                    size,
                    candidates
                );
            case "medium":
                return mediumMove(
                    boardArray,
                    size,
                    candidates
                );
            case "hard":
                return hardMove(
                    boardArray,
                    size,
                    candidates
                );
            case "extreme":
                return extremeMove(
                    boardArray,
                    size,
                    candidates
                );
            default:
                return mediumMove(
                    boardArray,
                    size,
                    candidates
                );
        }
    }
    /*
     * -------------------------------------------------------
     * EXPORT RA GLOBAL
     * -------------------------------------------------------
     */
    window.getAIMove = getAIMove;
    window.CaroAI = {
        getAIMove,
        evaluateBoard,
        evaluateSingleMove,
        getCandidateMoves,
        hasFive
    };
})();
