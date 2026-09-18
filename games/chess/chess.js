(function () {
    "use strict";

    const FILES = [
        "a", "b", "c", "d",
        "e", "f", "g", "h"
    ];

    const PIECES = {

        w: {
            k: "♔",
            q: "♕",
            r: "♖",
            b: "♗",
            n: "♘",
            p: "♙"
        },

        b: {
            k: "♚",
            q: "♛",
            r: "♜",
            b: "♝",
            n: "♞",
            p: "♟"
        }

    };


    function initialBoard() {

        const board =
            Array(64).fill(null);

        const backRank = [
            "r",
            "n",
            "b",
            "q",
            "k",
            "b",
            "n",
            "r"
        ];


        for (
            let c = 0;
            c < 8;
            c++
        ) {

            board[c] = {
                c: "b",
                t: backRank[c]
            };

            board[8 + c] = {
                c: "b",
                t: "p"
            };


            board[48 + c] = {
                c: "w",
                t: "p"
            };

            board[56 + c] = {
                c: "w",
                t: backRank[c]
            };

        }

        return board;
    }


    function cloneBoard(board) {

        return board.map(
            piece =>
                piece
                    ? { ...piece }
                    : null
        );

    }


    function row(index) {

        return Math.floor(
            index / 8
        );

    }


    function col(index) {

        return index % 8;

    }


    function inside(r, c) {

        return (
            r >= 0 &&
            r < 8 &&
            c >= 0 &&
            c < 8
        );

    }


    function index(r, c) {

        return r * 8 + c;

    }


    function opposite(color) {

        return color === "w"
            ? "b"
            : "w";

    }


    function squareName(index) {

        return (
            FILES[col(index)] +
            (8 - row(index))
        );

    }


    function attacksSquare(
        board,
        from,
        target
    ) {

        const piece = board[from];

        if (!piece) {
            return false;
        }


        const r = row(from);
        const c = col(from);

        const tr = row(target);
        const tc = col(target);

        const dr = tr - r;
        const dc = tc - c;


        /* TỐT */

        if (piece.t === "p") {

            const direction =
                piece.c === "w"
                    ? -1
                    : 1;

            return (
                dr === direction &&
                Math.abs(dc) === 1
            );

        }


        /* MÃ */

        if (piece.t === "n") {

            return (
                (
                    Math.abs(dr) === 2 &&
                    Math.abs(dc) === 1
                ) ||
                (
                    Math.abs(dr) === 1 &&
                    Math.abs(dc) === 2
                )
            );

        }


        /* VUA */

        if (piece.t === "k") {

            return (
                Math.max(
                    Math.abs(dr),
                    Math.abs(dc)
                ) === 1
            );

        }


        const diagonal =
            Math.abs(dr) ===
            Math.abs(dc);

        const straight =
            dr === 0 ||
            dc === 0;


        if (
            (
                piece.t === "b" &&
                !diagonal
            ) ||
            (
                piece.t === "r" &&
                !straight
            ) ||
            (
                piece.t === "q" &&
                !diagonal &&
                !straight
            )
        ) {

            return false;

        }


        const stepR =
            Math.sign(dr);

        const stepC =
            Math.sign(dc);


        let rr = r + stepR;
        let cc = c + stepC;


        while (
            rr !== tr ||
            cc !== tc
        ) {

            if (
                board[index(rr, cc)]
            ) {

                return false;

            }

            rr += stepR;
            cc += stepC;

        }


        return true;

    }


    function isAttacked(
        board,
        target,
        byColor
    ) {

        for (
            let i = 0;
            i < 64;
            i++
        ) {

            if (
                board[i]?.c === byColor &&
                attacksSquare(
                    board,
                    i,
                    target
                )
            ) {

                return true;

            }

        }

        return false;

    }


    function kingIndex(
        board,
        color
    ) {

        return board.findIndex(
            piece =>
                piece?.c === color &&
                piece.t === "k"
        );

    }


    function inCheck(
        board,
        color
    ) {

        const king =
            kingIndex(
                board,
                color
            );

        return (
            king >= 0 &&
            isAttacked(
                board,
                king,
                opposite(color)
            )
        );

    }


    function pseudoMoves(
        state,
        from
    ) {

        const {
            board,
            turn,
            castling,
            enPassant
        } = state;


        const piece =
            board[from];


        if (
            !piece ||
            piece.c !== turn
        ) {

            return [];

        }


        const moves = [];

        const r = row(from);
        const c = col(from);


        function add(
            to,
            extra = {}
        ) {

            if (
                to >= 0 &&
                to < 64 &&
                board[to]?.c !== piece.c
            ) {

                moves.push({
                    from,
                    to,
                    ...extra
                });

            }

        }


        /* TỐT */

        if (piece.t === "p") {

            const direction =
                piece.c === "w"
                    ? -1
                    : 1;

            const startRow =
                piece.c === "w"
                    ? 6
                    : 1;

            const promotionRow =
                piece.c === "w"
                    ? 0
                    : 7;


            const one =
                index(
                    r + direction,
                    c
                );


            if (
                inside(
                    r + direction,
                    c
                ) &&
                !board[one]
            ) {

                moves.push({

                    from,

                    to: one,

                    promotion:
                        row(one) ===
                        promotionRow
                            ? "q"
                            : null

                });


                const two =
                    index(
                        r + 2 * direction,
                        c
                    );


                if (
                    r === startRow &&
                    !board[two]
                ) {

                    moves.push({
                        from,
                        to: two
                    });

                }

            }


            for (
                const dc of [-1, 1]
            ) {

                if (
                    !inside(
                        r + direction,
                        c + dc
                    )
                ) {

                    continue;

                }


                const to =
                    index(
                        r + direction,
                        c + dc
                    );


                if (
                    board[to]?.c ===
                    opposite(piece.c)
                ) {

                    moves.push({

                        from,

                        to,

                        promotion:
                            row(to) ===
                            promotionRow
                                ? "q"
                                : null

                    });

                }

                else if (
                    to === enPassant
                ) {

                    moves.push({

                        from,

                        to,

                        enPassant: true

                    });

                }

            }

        }


        /* MÃ */

        else if (
            piece.t === "n"
        ) {

            const offsets = [

                [-2, -1],
                [-2, 1],

                [-1, -2],
                [-1, 2],

                [1, -2],
                [1, 2],

                [2, -1],
                [2, 1]

            ];


            for (
                const [dr, dc]
                of offsets
            ) {

                if (
                    inside(
                        r + dr,
                        c + dc
                    )
                ) {

                    add(
                        index(
                            r + dr,
                            c + dc
                        )
                    );

                }

            }

        }


        /* TƯỢNG / XE / HẬU */

        else if (
            piece.t === "b" ||
            piece.t === "r" ||
            piece.t === "q"
        ) {

            let directions;


            if (
                piece.t === "b"
            ) {

                directions = [
                    [-1, -1],
                    [-1, 1],
                    [1, -1],
                    [1, 1]
                ];

            }

            else if (
                piece.t === "r"
            ) {

                directions = [
                    [-1, 0],
                    [1, 0],
                    [0, -1],
                    [0, 1]
                ];

            }

            else {

                directions = [

                    [-1, -1],
                    [-1, 1],

                    [1, -1],
                    [1, 1],

                    [-1, 0],
                    [1, 0],

                    [0, -1],
                    [0, 1]

                ];

            }


            for (
                const [dr, dc]
                of directions
            ) {

                let rr = r + dr;
                let cc = c + dc;


                while (
                    inside(rr, cc)
                ) {

                    const to =
                        index(rr, cc);


                    if (!board[to]) {

                        moves.push({
                            from,
                            to
                        });

                    }

                    else {

                        if (
                            board[to].c !==
                            piece.c
                        ) {

                            moves.push({
                                from,
                                to
                            });

                        }

                        break;

                    }


                    rr += dr;
                    cc += dc;

                }

            }

        }


        /* VUA */

        else if (
            piece.t === "k"
        ) {

            for (
                let dr = -1;
                dr <= 1;
                dr++
            ) {

                for (
                    let dc = -1;
                    dc <= 1;
                    dc++
                ) {

                    if (
                        dr === 0 &&
                        dc === 0
                    ) {

                        continue;

                    }


                    if (
                        inside(
                            r + dr,
                            c + dc
                        )
                    ) {

                        add(
                            index(
                                r + dr,
                                c + dc
                            )
                        );

                    }

                }

            }


            const enemy =
                opposite(piece.c);


            /* NHẬP THÀNH */

            if (
                !inCheck(
                    board,
                    piece.c
                )
            ) {

                if (
                    piece.c === "w" &&
                    from === 60
                ) {

                    if (
                        castling.wK &&
                        board[61] === null &&
                        board[62] === null &&
                        !isAttacked(
                            board,
                            61,
                            enemy
                        ) &&
                        !isAttacked(
                            board,
                            62,
                            enemy
                        ) &&
                        board[63]?.t === "r" &&
                        board[63]?.c === "w"
                    ) {

                        moves.push({
                            from,
                            to: 62,
                            castle: "K"
                        });

                    }


                    if (
                        castling.wQ &&
                        board[59] === null &&
                        board[58] === null &&
                        board[57] === null &&
                        !isAttacked(
                            board,
                            59,
                            enemy
                        ) &&
                        !isAttacked(
                            board,
                            58,
                            enemy
                        ) &&
                        board[56]?.t === "r" &&
                        board[56]?.c === "w"
                    ) {

                        moves.push({
                            from,
                            to: 58,
                            castle: "Q"
                        });

                    }

                }


                if (
                    piece.c === "b" &&
                    from === 4
                ) {

                    if (
                        castling.bK &&
                        board[5] === null &&
                        board[6] === null &&
                        !isAttacked(
                            board,
                            5,
                            enemy
                        ) &&
                        !isAttacked(
                            board,
                            6,
                            enemy
                        ) &&
                        board[7]?.t === "r" &&
                        board[7]?.c === "b"
                    ) {

                        moves.push({
                            from,
                            to: 6,
                            castle: "K"
                        });

                    }


                    if (
                        castling.bQ &&
                        board[3] === null &&
                        board[2] === null &&
                        board[1] === null &&
                        !isAttacked(
                            board,
                            3,
                            enemy
                        ) &&
                        !isAttacked(
                            board,
                            2,
                            enemy
                        ) &&
                        board[0]?.t === "r" &&
                        board[0]?.c === "b"
                    ) {

                        moves.push({
                            from,
                            to: 2,
                            castle: "Q"
                        });

                    }

                }

            }

        }


        return moves;

    }


    function applyMove(
        state,
        move
    ) {

        const newState = {

            ...state,

            board:
                cloneBoard(
                    state.board
                ),

            castling:
                {
                    ...state.castling
                }

        };


        const piece =
            newState.board[
                move.from
            ];


        newState.board[
            move.from
        ] = null;


        /* BẮT TỐT QUA ĐƯỜNG */

        if (
            move.enPassant
        ) {

            const captured =
                move.to +
                (
                    piece.c === "w"
                        ? 8
                        : -8
                );

            newState.board[
                captured
            ] = null;

        }


        /* NHẬP THÀNH */

        if (
            move.castle
        ) {

            if (
                move.to === 62
            ) {

                newState.board[61] =
                    newState.board[63];

                newState.board[63] =
                    null;

            }


            if (
                move.to === 58
            ) {

                newState.board[59] =
                    newState.board[56];

                newState.board[56] =
                    null;

            }


            if (
                move.to === 6
            ) {

                newState.board[5] =
                    newState.board[7];

                newState.board[7] =
                    null;

            }


            if (
                move.to === 2
            ) {

                newState.board[3] =
                    newState.board[0];

                newState.board[0] =
                    null;

            }

        }


        const placed =
            {
                ...piece
            };


        /* PHONG CẤP */

        if (
            piece.t === "p" &&
            (
                row(move.to) === 0 ||
                row(move.to) === 7
            )
        ) {

            placed.t =
                move.promotion ||
                "q";

        }


        newState.board[
            move.to
        ] = placed;


        /* CẬP NHẬT NHẬP THÀNH */

        if (
            piece.t === "k"
        ) {

            if (
                piece.c === "w"
            ) {

                newState.castling.wK =
                    false;

                newState.castling.wQ =
                    false;

            }

            else {

                newState.castling.bK =
                    false;

                newState.castling.bQ =
                    false;

            }

        }


        if (
            piece.t === "r"
        ) {

            if (move.from === 63)
                newState.castling.wK = false;

            if (move.from === 56)
                newState.castling.wQ = false;

            if (move.from === 7)
                newState.castling.bK = false;

            if (move.from === 0)
                newState.castling.bQ = false;

        }


        const captured =
            state.board[
                move.to
            ];


        if (
            captured?.t === "r"
        ) {

            if (move.to === 63)
                newState.castling.wK = false;

            if (move.to === 56)
                newState.castling.wQ = false;

            if (move.to === 7)
                newState.castling.bK = false;

            if (move.to === 0)
                newState.castling.bQ = false;

        }


        /* EN PASSANT */

        newState.enPassant =
            null;


        if (
            piece.t === "p" &&
            Math.abs(
                row(move.to) -
                row(move.from)
            ) === 2
        ) {

            newState.enPassant =
                (
                    move.from +
                    move.to
                ) / 2;

        }


        newState.turn =
            opposite(
                state.turn
            );


        return newState;

    }


    function legalMoves(state) {

        const result = [];


        for (
            let i = 0;
            i < 64;
            i++
        ) {

            if (
                state.board[i]?.c !==
                state.turn
            ) {

                continue;

            }


            const pseudo =
                pseudoMoves(
                    state,
                    i
                );


            for (
                const move
                of pseudo
            ) {

                const next =
                    applyMove(
                        state,
                        move
                    );


                if (
                    !inCheck(
                        next.board,
                        state.turn
                    )
                ) {

                    result.push(move);

                }

            }

        }


        return result;

    }


    function legalMovesFrom(
        state,
        from
    ) {

        return legalMoves(
            state
        ).filter(
            move =>
                move.from === from
        );

    }


    function algebraicMove(
        from,
        to,
        promotion
    ) {

        return (
            squareName(from) +
            squareName(to) +
            (
                promotion ||
                ""
            )
        );

    }


   window.ChessCore = {
    initialBoard,
    cloneBoard,
    legalMoves,
    legalMovesFrom,
    applyMove,
    inCheck,
    kingIndex,
    squareName,
    algebraicMove,
    PIECES,
    opposite
};

console.log("=================================");
console.log("✅ CHESS CORE ĐÃ ĐƯỢC TẠO");
console.log("ChessCore:", window.ChessCore);
console.log("=================================");

})();
