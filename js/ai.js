/* =====================================================
   CARO 5 - SIMPLE AI
===================================================== */

function getAIMove(boardState, size) {

    const empty = [];

    for (let i = 0; i < boardState.length; i++) {

        if (boardState[i] === "") {
            empty.push(i);
        }
    }


    if (empty.length === 0) {
        return -1;
    }


    /* =================
       First move
    ================= */

    const occupied =
        boardState.length - empty.length;

    if (occupied === 0) {

        const center =
            Math.floor(size / 2);

        return center * size + center;
    }


    /* =================
       Win
    ================= */

    for (const index of empty) {

        boardState[index] = "O";

        if (aiCheckWin(
            boardState,
            size,
            index,
            "O"
        )) {

            boardState[index] = "";

            return index;
        }

        boardState[index] = "";
    }


    /* =================
       Block
    ================= */

    for (const index of empty) {

        boardState[index] = "X";

        if (aiCheckWin(
            boardState,
            size,
            index,
            "X"
        )) {

            boardState[index] = "";

            return index;
        }

        boardState[index] = "";
    }


    /* =================
       Nearby cells
    ================= */

    const nearby = [];

    for (const index of empty) {

        const row =
            Math.floor(index / size);

        const col =
            index % size;


        let close = false;


        for (let r = -2; r <= 2; r++) {

            for (let c = -2; c <= 2; c++) {

                if (r === 0 && c === 0) {
                    continue;
                }

                const nr = row + r;
                const nc = col + c;


                if (
                    nr < 0 ||
                    nr >= size ||
                    nc < 0 ||
                    nc >= size
                ) {
                    continue;
                }


                const ni =
                    nr * size + nc;


                if (boardState[ni] !== "") {
                    close = true;
                }
            }
        }


        if (close) {
            nearby.push(index);
        }
    }


    if (nearby.length > 0) {

        return nearby[
            Math.floor(
                Math.random() * nearby.length
            )
        ];
    }


    /* =================
       Random
    ================= */

    return empty[
        Math.floor(
            Math.random() * empty.length
        )
    ];
}


/* ================= WIN CHECK ================= */

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


        if (boardState[index] !== player) {
            break;
        }


        count++;

        r += dr;
        c += dc;
    }


    return count;
}
