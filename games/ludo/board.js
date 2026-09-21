/* =========================================================
   LUDO BOARD ENGINE
   CỜ CÁ NGỰA
   ---------------------------------
   Phụ trách:
   - Bàn cờ 4 màu
   - 4 quân / người
   - Xúc xắc
   - Ra chuồng
   - Di chuyển
   - Ăn quân
   - Ô an toàn
   - Về đích
   - Đổi lượt
   - Thưởng khi đổ 6
   - Trạng thái quân
   - AI có thể điều khiển thông qua API
   ---------------------------------
   Firebase KHÔNG nằm trong file này.
========================================================= */

"use strict";


/* =========================================================
   CONFIG
========================================================= */

const LUDO_CONFIG = {

    PLAYER_COUNT: 4,

    PIECES_PER_PLAYER: 4,

    DICE_MIN: 1,

    DICE_MAX: 6,

    EXIT_ROLL: 6,

    EXTRA_TURN_ROLL: 6,

    TRACK_LENGTH: 56,

    // Position 0 is the colored round spawn cell. The 56-cell outer ring
    // includes the four colored arrow cells and the four white corner
    // circles around the center. Home-lane movement starts after the
    // player reaches its own arrow.
    HOME_PATH_START: 56,

    HOME_LENGTH: 6,

    FINISH_POSITION: 61,

    ANIMATION_TIME: 180,

    DISCONNECT_WAIT: 30000

};


/* =========================================================
   PLAYERS
========================================================= */

const LUDO_PLAYERS = [

    // Vàng: cửa ra phía trên
    {
        id: "yellow",
        name: "Vàng",
        color: "#facc15",
        start: 0
    },

    // Xanh lá: cửa ra phía bên phải
    {
        id: "green",
        name: "Xanh lá",
        color: "#22c55e",
        start: 42
    },

    // Đỏ: cửa ra phía dưới
    {
        id: "red",
        name: "Đỏ",
        color: "#ef4444",
        start: 28
    },

    // Xanh dương: cửa ra phía bên trái
    {
        id: "blue",
        name: "Xanh dương",
        color: "#3b82f6",
        start: 14
    }

];


/* =========================================================
   TRACK
========================================================= */

/*
    44 ô đường chính.

    Đây là đường vòng ngoài.
*/

const LUDO_TRACK = [
    [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6],
    [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0],
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 6],
    [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7],
    [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 8],
    [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [7, 14],
    [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], [6, 8],
    [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7]
];


/* =========================================================
   HOME PATH
========================================================= */

/*
    Mỗi màu có 5 ô đường về + 1 ô đích.

    Giá trị position:

    -1      = trong chuồng
     0      = ô cửa xuất quân
     1..43  = các ô còn lại của đường chính
     44..48 = đường về màu
     49      = hoàn thành
*/

const HOME_PATHS = {

    /* Vàng: đi lên theo lane phía trên */
    yellow: [
        [2, 7],
        [3, 7],
        [4, 7],
        [5, 7],
        [6, 7],
        [7, 7]
    ],

    /* Xanh lá: đi sang trái theo lane bên phải */
    green: [
        [7, 12],
        [7, 11],
        [7, 10],
        [7, 9],
        [7, 8],
        [7, 7]
    ],

    /* Đỏ: đi lên theo lane phía dưới */
    red: [
        [12, 7],
        [11, 7],
        [10, 7],
        [9, 7],
        [8, 7],
        [7, 7]
    ],

    /* Xanh dương: đi sang phải theo lane giữa bên trái.
       Ô [7,1] là ô vòng ngoài đầu tiên sau cửa.
       Đường về đích bắt đầu từ [7,2] và kết thúc tại tâm.
    */
    blue: [
        [7, 2],
        [7, 3],
        [7, 4],
        [7, 5],
        [7, 6],
        [7, 7]
    ]

};


/* =========================================================
   HOME PIECES
========================================================= */

const HOME_PIECE_POSITIONS = {

    yellow: [
        [2, 2],
        [2, 4],
        [4, 2],
        [4, 4]
    ],

    green: [
        [2, 10],
        [2, 12],
        [4, 10],
        [4, 12]
    ],

    blue: [
        [10, 2],
        [10, 4],
        [12, 2],
        [12, 4]
    ],

    red: [
        [10, 10],
        [10, 12],
        [12, 10],
        [12, 12]
    ]

};


/* =========================================================
   SAFE CELLS
========================================================= */

const SAFE_TRACK_CELLS = new Set([
    10,
    21,
    32,
    43
]);


/* =========================================================
   GAME STATE
========================================================= */

const LudoBoard = {

    boardElement: null,

    started: false,

    rolling: false,

    diceValue: 0,

    currentPlayer: 0,

    winner: null,

    turnNumber: 1,

    selectedPiece: null,

    players: [],

    pieces: {},

    lastMove: null,

    animationLock: false

};


/* =========================================================
   CREATE PLAYERS
========================================================= */

function createPlayers() {

    LudoBoard.players =
        LUDO_PLAYERS.map(player => ({

            ...player,

            type: "human",

            connected: true,

            isHost: false,

            pieces: [

                createPiece(0),
                createPiece(1),
                createPiece(2),
                createPiece(3)

            ]

        }));

}


/* =========================================================
   CREATE PIECE
========================================================= */

function createPiece(id) {

    return {

        id,

        position: -1,

        finished: false,

        moving: false

    };

}


/* =========================================================
   INIT
========================================================= */

function initLudoBoard() {

    const board =
        document.getElementById(
            "board"
        ) || document.getElementById(
            "ludoBoard"
        );

    if (!board) {

        console.warn(
            "Không tìm thấy #ludoBoard"
        );

        return;

    }

    LudoBoard.boardElement =
        board;

    createPlayers();

    // main.js owns the polished visual board.
    // board.js only owns game state / piece logic.
    window.renderLudoVisualBoard?.();
    createPieces();

    LudoBoard.started = true;

    updateBoardUI();

    updateTurnUI();

    console.log(
        "Ludo board ready"
    );

}


/* =========================================================
   CREATE BOARD
========================================================= */

function createBoard() {

    const board =
        LudoBoard.boardElement;

    board.innerHTML = "";

    board.classList.add(
        "ludo-board"
    );


    for (
        let row = 0;
        row < 15;
        row++
    ) {

        for (
            let col = 0;
            col < 15;
            col++
        ) {

            const cell =
                document.createElement(
                    "div"
                );

            cell.className =
                "ludo-cell";

            cell.dataset.row =
                row;

            cell.dataset.col =
                col;


            const zone =
                getHomeZone(
                    row,
                    col
                );


            if (zone) {

                cell.classList.add(
                    "home-zone"
                );

                cell.classList.add(
                    `home-${zone}`
                );

            }


            const trackIndex =
                getTrackIndex(
                    row,
                    col
                );


            if (
                trackIndex !== -1
            ) {

                cell.classList.add(
                    "path"
                );

                cell.dataset.track =
                    trackIndex;


                if (
                    SAFE_TRACK_CELLS.has(
                        trackIndex
                    )
                ) {

                    cell.classList.add(
                        "safe"
                    );

                    cell.innerHTML =
                        `<span class="safe-star">★</span>`;

                }

            }


            const homeColor =
                getHomePathColor(
                    row,
                    col
                );


            if (homeColor) {

                cell.classList.add(
                    "home-path"
                );

                cell.classList.add(
                    `home-path-${homeColor}`
                );

            }


            board.appendChild(
                cell
            );

        }

    }


    createCenter(board);

}


/* =========================================================
   HOME ZONE
========================================================= */

function getHomeZone(
    row,
    col
) {

    if (
        row <= 5 &&
        col <= 5
    ) {

        return "yellow";

    }


    if (
        row <= 5 &&
        col >= 9
    ) {

        return "green";

    }


    if (
        row >= 9 &&
        col <= 5
    ) {

        return "blue";

    }


    if (
        row >= 9 &&
        col >= 9
    ) {

        return "red";

    }


    return null;

}


/* =========================================================
   TRACK INDEX
========================================================= */

function getTrackIndex(
    row,
    col
) {

    return LUDO_TRACK.findIndex(
        ([r, c]) =>
            r === row &&
            c === col
    );

}


/* =========================================================
   HOME PATH COLOR
========================================================= */

function getHomePathColor(
    row,
    col
) {

    for (
        const [
            color,
            path
        ] of Object.entries(
            HOME_PATHS
        )
    ) {

        for (
            const [
                r,
                c
            ] of path
        ) {

            if (
                r === row &&
                c === col
            ) {

                return color;

            }

        }

    }

    return null;

}


/* =========================================================
   CENTER
========================================================= */

function createCenter(
    board
) {

    const center =
        document.createElement(
            "div"
        );

    center.className =
        "ludo-center";

    center.innerHTML = `

        <div class="center-triangle red"></div>

        <div class="center-triangle green"></div>

        <div class="center-triangle yellow"></div>

        <div class="center-triangle blue"></div>

        <div class="center-finish">
            ★
        </div>

    `;

    board.appendChild(
        center
    );

}


/* =========================================================
   CREATE PIECES
========================================================= */

function createPieces() {

    const board =
        LudoBoard.boardElement;

    board
        .querySelectorAll(
            ".ludo-piece"
        )
        .forEach(
            element =>
                element.remove()
        );


    LudoBoard.pieces = {};


    LudoBoard.players.forEach(
        player => {

            player.pieces.forEach(
                piece => {

                    const element =
                        document.createElement(
                            "button"
                        );

                    element.type =
                        "button";

                    element.className =
                        "ludo-piece piece";

                    element.dataset.player =
                        player.id;

                    element.dataset.piece =
                        piece.id;

                    element.style.background =
                        player.color;

                    element.innerHTML = `
                        <span>
                            ${piece.id + 1}
                        </span>
                    `;


                    element.addEventListener(
                        "click",
                        () => {

                            selectPiece(
                                player.id,
                                piece.id
                            );

                        }
                    );


                    board.appendChild(
                        element
                    );


                    LudoBoard.pieces[
                        `${player.id}-${piece.id}`
                    ] = element;

                }
            );

        }
    );


    updatePiecePositions();

}


/* =========================================================
   SPAWN MAP
========================================================= */

/*
   Ô xuất quân là ô TRÒN cùng màu ngay cạnh khu chuồng:
   - yellow -> [1,6]
   - green  -> [6,13]
   - red    -> [13,8]
   - blue   -> [8,1]

   position = 0 nằm tại ô tròn xuất quân.
   position = 1 mới đi vào ô vòng ngoài kế tiếp.
*/

const LUDO_SPAWN_TRACK_INDEX = {
    yellow: 0,
    green: 42,
    red: 28,
    blue: 14
};

const LUDO_ENTRY_COORDINATES = {
    yellow: [0, 6],
    green: [6, 14],
    red: [14, 8],
    blue: [8, 0]
};

function getPlayerSpawnCoordinate(player) {

    return (
        LUDO_ENTRY_COORDINATES[player.id] ||
        [7, 7]
    );

}


/* =========================================================
   GET PIECE COORDINATES
========================================================= */

function getPieceCoordinates(
    player,
    piece
) {

    if (
        piece.position === -1
    ) {

        return HOME_PIECE_POSITIONS[
            player.id
        ][piece.id];

    }

    /*
        position -1 = chuồng.
        position 0 = ô tròn cùng màu xuất quân trên đường chạy.
        position 1..43 = các ô tiếp theo trên vòng ngoài.
        position 44..49 = đường về đích.
    */

    if (
        piece.position === 0
    ) {
        return getPlayerSpawnCoordinate(player);
    }

    if (
        piece.position >=
        LUDO_CONFIG.HOME_PATH_START
    ) {

        const index =
            piece.position -
            LUDO_CONFIG.HOME_PATH_START;

        return (
            HOME_PATHS[
                player.id
            ][
                Math.min(
                    index,
                    HOME_PATHS[
                        player.id
                    ].length - 1
                )
            ]
        );

    }

    return LUDO_TRACK[
        getAbsoluteTrackIndex(
            player,
            piece.position
        )
    ];

}


/* =========================================================
   ABSOLUTE TRACK POSITION
========================================================= */

function getAbsoluteTrackIndex(
    player,
    relativePosition
) {
    const start = LUDO_SPAWN_TRACK_INDEX[player.id];
    const safeStart = typeof start === "number" ? start : player.start;
    return (safeStart + relativePosition) % LUDO_CONFIG.TRACK_LENGTH;
}


/* =========================================================
   UPDATE PIECES
========================================================= */

function updatePiecePositions() {

    LudoBoard.players.forEach(
        player => {

            player.pieces.forEach(
                piece => {

                    const element =
                        LudoBoard.pieces[
                            `${player.id}-${piece.id}`
                        ];

                    if (!element) {
                        return;
                    }


                    const [
                        row,
                        col
                    ] =
                        getPieceCoordinates(
                            player,
                            piece
                        );


                    positionPiece(
                        element,
                        row,
                        col
                    );


                    element.classList.toggle(
                        "finished",
                        piece.finished
                    );


                    element.classList.toggle(
                        "moving",
                        piece.moving
                    );

                }
            );

        }
    );

}


/* =========================================================
   POSITION PIECE
========================================================= */

function positionPiece(
    element,
    row,
    col
) {

    /*
        Mỗi ô = 1/15 bàn.

        left/top phải là TÂM của ô, không phải góc
        của ô. Trước đây dùng +1.1% khiến quân bị
        lệch lên-trái; đặc biệt quân xanh dương ở
        ô ngoài cùng bị lệch ra khỏi bàn.

        +0.5 ô = đúng tâm ô.
    */

    const size =
        100 / 15;

    element.style.left =
        `${(col + 0.5) * size}%`;

    element.style.top =
        `${(row + 0.5) * size}%`;

}


/* =========================================================
   SELECT PIECE
========================================================= */

function selectPiece(
    playerId,
    pieceId
) {

    if (
        !LudoBoard.started ||
        LudoBoard.animationLock
    ) {

        return;

    }


    const currentPlayer =
        LudoBoard.players[
            LudoBoard.currentPlayer
        ];


    if (!currentPlayer) {
        return;
    }


    if (
        currentPlayer.id !==
        playerId
    ) {

        showBoardMessage(
            "Chưa tới lượt của người này."
        );

        return;

    }


    if (
        LudoBoard.diceValue === 0
    ) {

        showBoardMessage(
            "Hãy tung xúc xắc trước."
        );

        return;

    }


    const piece =
        currentPlayer.pieces.find(
            p =>
                p.id === pieceId
        );


    if (!piece) {
        return;
    }


    if (
        !canMovePiece(
            currentPlayer,
            piece,
            LudoBoard.diceValue
        )
    ) {

        showBoardMessage(
            "Quân này không thể đi."
        );

        return;

    }


    clearSelectedPiece();


    LudoBoard.selectedPiece = {
        playerId,
        pieceId
    };


    const element =
        LudoBoard.pieces[
            `${playerId}-${pieceId}`
        ];


    if (element) {

        element.classList.add(
            "selected"
        );

    }


    movePiece(
        currentPlayer,
        piece,
        LudoBoard.diceValue
    );

}


/* =========================================================
   RULE 1 SHORTCUT / FLY TO NEXT ARROW
========================================================= */

/*
   Luật:
   - Khi đang ở bất kỳ ô nào trên vòng ngoài và đổ 1,
     nếu đường từ vị trí hiện tại tới MŨI TÊN TIẾP THEO
     hoàn toàn không có quân cản, quân được "bay" thẳng tới
     mũi tên đó.
   - Nếu có bất kỳ quân nào trên đường, không bay; đi đúng 1 ô.
   - Luật này áp dụng không giới hạn số lần:
       ô thường -> mũi tên -> đổ 1 -> mũi tên kế tiếp -> ...
   - Khi đã vào đường về đích (position >= HOME_PATH_START),
     tuyệt đối KHÔNG được bay ra ngoài nữa.

   Thứ tự các mũi tên theo chiều di chuyển:
       🔵 -> 🔴 -> 🟢 -> 🟡 -> 🔵
*/

const LUDO_ARROW_TRACK_INDEXES = [
    13, // 🔵 mũi tên bên trái
    27, // 🔴 mũi tên bên dưới
    41, // 🟢 mũi tên bên phải
    55  // 🟡 mũi tên bên trên
];

function getNextArrowTrackIndex(absoluteIndex) {
    if (!Number.isInteger(absoluteIndex)) return null;

    for (const arrowIndex of LUDO_ARROW_TRACK_INDEXES) {
        if (arrowIndex > absoluteIndex) {
            return arrowIndex;
        }
    }

    // Đã đi qua mũi tên cuối vòng -> quay lại mũi tên đầu.
    return LUDO_ARROW_TRACK_INDEXES[0];
}

function getShortcutDestinationPosition(player, piece) {
    if (!player || !piece) return null;

    // Chỉ áp dụng trên vòng ngoài, không áp dụng trong đường về đích.
    if (piece.position < 0 || piece.position >= LUDO_CONFIG.HOME_PATH_START) {
        return null;
    }

    const currentIndex = getAbsoluteTrackIndex(player, piece.position);
    const targetIndex = getNextArrowTrackIndex(currentIndex);

    if (targetIndex === null) return null;

    const distance =
        (targetIndex - currentIndex + LUDO_CONFIG.TRACK_LENGTH) %
        LUDO_CONFIG.TRACK_LENGTH;

    // Nếu đang đứng đúng tại mũi tên thì mũi tên kế tiếp cách 14 ô.
    if (distance <= 0) return null;

    const relativeTarget =
        (piece.position + distance) % LUDO_CONFIG.TRACK_LENGTH;

    return {
        distance,
        targetIndex,
        relativeTarget,
        coordinates: LUDO_TRACK[targetIndex]
    };
}

function getPieceAtAbsoluteTrackIndex(absoluteIndex) {
    for (const player of LudoBoard.players) {
        for (const piece of player.pieces) {
            // position 0 cũng là một ô trên vòng ngoài và phải được tính
            // là vật cản. Chỉ chuồng (-1) và đường về đích mới bỏ qua.
            if (piece.position < 0 || piece.position >= LUDO_CONFIG.HOME_PATH_START) {
                continue;
            }

            if (getAbsoluteTrackIndex(player, piece.position) === absoluteIndex) {
                return { player, piece };
            }
        }
    }

    return null;
}

function canUseSpawnShortcut(player, piece, dice) {
    if (!player || !piece || dice !== 1) return false;

    const shortcut = getShortcutDestinationPosition(player, piece);
    if (!shortcut) return false;

    const startIndex = getAbsoluteTrackIndex(player, piece.position);

    // Nếu ô đích đã có quân cùng màu thì không thể bay đáp xuống đó;
    // quay về nước đi bình thường 1 ô. Quân đối phương ở ô đích vẫn có
    // thể bị ăn như một nước đáp hợp lệ.
    const destinationOccupant = getPieceAtAbsoluteTrackIndex(shortcut.targetIndex);
    if (destinationOccupant && destinationOccupant.player.id === player.id) {
        return false;
    }

    // Chỉ kiểm tra các ô NẰM GIỮA. Bất kỳ quân nào ở giữa, kể cả quân
    // cùng màu, đều chặn đường bay.
    for (let step = 1; step < shortcut.distance; step++) {
        const index = (startIndex + step) % LUDO_CONFIG.TRACK_LENGTH;
        const blocker = getPieceAtAbsoluteTrackIndex(index);

        if (blocker && !(blocker.player.id === player.id && blocker.piece.id === piece.id)) {
            return false;
        }
    }

    return true;
}

function getSpawnShortcutDestination(player, piece, dice) {
    if (!canUseSpawnShortcut(player, piece, dice)) return null;

    const shortcut = getShortcutDestinationPosition(player, piece);
    if (!shortcut) return null;

    return {
        distance: shortcut.distance,
        targetIndex: shortcut.targetIndex,
        relativeTarget: shortcut.relativeTarget,
        coordinates: shortcut.coordinates
    };
}

/* =========================================================
   CAN MOVE
========================================================= */

function getTrackPieceAtRelativePosition(player, relativePosition, excludePiece = null) {
    for (const otherPlayer of LudoBoard.players) {
        for (const otherPiece of otherPlayer.pieces) {
            if (excludePiece && otherPlayer.id === player.id && otherPiece.id === excludePiece.id) continue;
            if (otherPiece.position === relativePosition && relativePosition >= 1 && relativePosition <= 55) {
                return { player: otherPlayer, piece: otherPiece };
            }
        }
    }
    return null;
}

function getHomePieceAtPosition(player, position, excludePiece = null) {
    for (const otherPiece of player.pieces) {
        if (excludePiece && otherPiece.id === excludePiece.id) continue;
        if (otherPiece.position === position) return otherPiece;
    }
    return null;
}

function canPassThroughTrack(player, piece, fromPosition, toPosition) {
    // A piece may capture on the destination, but it may NEVER jump over
    // another piece (including its own) on an intermediate outer-track cell.
    for (let pos = fromPosition + 1; pos < toPosition; pos++) {
        if (getTrackPieceAtRelativePosition(player, pos, piece)) return false;
    }
    return true;
}

function canPassThroughHome(player, piece, fromPosition, toPosition) {
    // Home lane is 1..6. Any piece in an intermediate cell blocks the move.
    const fromHome = Math.max(0, fromPosition - LUDO_CONFIG.HOME_PATH_START + 1);
    const toHome = toPosition - LUDO_CONFIG.HOME_PATH_START + 1;
    for (let homeNo = fromHome + 1; homeNo < toHome; homeNo++) {
        const absolute = LUDO_CONFIG.HOME_PATH_START + homeNo - 1;
        if (getHomePieceAtPosition(player, absolute, piece)) return false;
    }
    return true;
}

function canMovePiece(player, piece, dice) {
    if (!player || !piece || !dice || piece.finished) return false;

    // In the stable: a 6 is required, and the spawn cell itself cannot be occupied.
    if (piece.position === -1) {
        if (dice !== 6) return false;
        return !LudoBoard.players.some(p =>
            p.pieces.some(other => other.position === 0)
        );
    }

    // Rule 1 shortcut: from ANY outer-track cell, rolling 1 may fly
    // directly to the next arrow when every intermediate cell is clear.
    // If blocked, the normal one-cell move remains available.
    if (dice === 1 && piece.position >= 0 && piece.position < LUDO_CONFIG.HOME_PATH_START) {
        const shortcut = getSpawnShortcutDestination(player, piece, dice);
        if (shortcut) return true;
    }

    const newPosition = piece.position + dice;
    if (newPosition > LUDO_CONFIG.FINISH_POSITION) return false;

    // Moving on the outer ring, including entering the player's arrow.
    if (piece.position <= 55 && newPosition <= 55) {
        if (!canPassThroughTrack(player, piece, piece.position, newPosition)) return false;

        // Own piece cannot be landed on; an opponent on the destination may be captured.
        if (getTrackPieceAtRelativePosition(player, newPosition, piece)?.player.id === player.id) return false;
        return true;
    }

    // Entering or moving inside the home lane.
    if (newPosition >= LUDO_CONFIG.HOME_PATH_START) {
        // First reach the player's arrow on the outer ring. Any piece before
        // that arrow also blocks the move. Then check the home-lane cells.
        if (piece.position < 55 && !canPassThroughTrack(player, piece, piece.position, 55)) {
            return false;
        }
        if (!canPassThroughHome(player, piece, piece.position, newPosition)) return false;
        const occupant = getHomePieceAtPosition(player, newPosition, piece);
        if (occupant) return false;
        return true;
    }

    return true;
}

async function movePiece(player, piece, steps) {
    if (LudoBoard.animationLock) return;

    LudoBoard.animationLock = true;
    clearSelectedPiece();

    let actualSteps = steps;
    let usedShortcut = false;
    const wasInHome = piece.position === -1;

    if (wasInHome) {
        // Exit directly onto the colored round spawn cell. A 6 does not
        // consume six movement steps.
        piece.position = 0;
        piece.moving = true;
        updatePiecePositions();
        await wait(LUDO_CONFIG.ANIMATION_TIME);
        piece.moving = false;
    } else {
        const shortcut = steps === 1 && piece.position >= 0 && piece.position < LUDO_CONFIG.HOME_PATH_START
            ? getSpawnShortcutDestination(player, piece, steps)
            : null;

        if (shortcut) {
            actualSteps = shortcut.distance;
            usedShortcut = true;
            piece.position = shortcut.relativeTarget;
            piece.moving = true;
            updatePiecePositions();
            await wait(LUDO_CONFIG.ANIMATION_TIME * 2);
            piece.moving = false;
        } else {
            const targetPosition = piece.position + steps;

            // Home-lane moves jump directly to the rolled number (1..6)
            // instead of visually walking through every home cell.
            if (targetPosition >= LUDO_CONFIG.HOME_PATH_START) {
                piece.position = targetPosition;
                piece.moving = true;
                updatePiecePositions();
                await wait(LUDO_CONFIG.ANIMATION_TIME * 2);
                piece.moving = false;
            } else {
                // Outer-ring movement is animated one cell at a time, but
                // can only be called after canMovePiece() verified there is
                // no piece in any intermediate cell.
                for (let i = 0; i < steps; i++) {
                    piece.position++;
                    piece.moving = true;
                    updatePiecePositions();
                    await wait(LUDO_CONFIG.ANIMATION_TIME);
                }
                piece.moving = false;
            }
        }
    }

    if (piece.position >= LUDO_CONFIG.FINISH_POSITION) {
        piece.position = LUDO_CONFIG.FINISH_POSITION;
        piece.finished = true;
    }

    if (!piece.finished) captureOpponents(player, piece);

    LudoBoard.lastMove = {
        playerId: player.id,
        pieceId: piece.id,
        steps,
        actualSteps,
        usedShortcut
    };

    LudoBoard.diceValue = 0;
    updatePiecePositions();

    if (checkWinner(player)) {
        LudoBoard.winner = player.id;
        LudoBoard.animationLock = false;
        handleWinner(player);
        return;
    }

    LudoBoard.animationLock = false;

    if (steps === LUDO_CONFIG.EXTRA_TURN_ROLL) {
        LudoBoard.diceValue = 0;
        showBoardMessage(`${player.name} được đi thêm lượt!`);
        updateDiceUI();

        // Giữ nguyên lượt khi đổ 6 và báo cho AI/online controller
        // rằng lượt mới đã sẵn sàng. Trước đây hàm return ở đây
        // khiến AI không được kích hoạt lại sau khi vừa đi bằng 6.
        emitBoardEvent(
            "ludo:turnChanged",
            {
                player,
                extraTurn: true,
                reason: "rolled-6-moved"
            }
        );

        return;
    }

    nextTurn();
}


/* =========================================================
   CAPTURE
========================================================= */

function captureOpponents(
    player,
    piece
) {

    if (
        piece.position <= 0 ||
        piece.position >= LUDO_CONFIG.HOME_PATH_START
    ) {

        return;

    }


    const absolutePosition =
        getAbsoluteTrackIndex(
            player,
            piece.position
        );


    /*
        Ô an toàn không bị ăn.
    */

    if (
        SAFE_TRACK_CELLS.has(
            absolutePosition
        )
    ) {

        return;

    }


    LudoBoard.players.forEach(
        opponent => {

            if (
                opponent.id ===
                player.id
            ) {

                return;

            }


            opponent.pieces.forEach(
                opponentPiece => {

                    if (
                        opponentPiece.position <= 0 ||
                        opponentPiece.position >=
                        LUDO_CONFIG.HOME_PATH_START
                    ) {

                        return;

                    }


                    const opponentAbsolute =
                        getAbsoluteTrackIndex(
                            opponent,
                            opponentPiece.position
                        );


                    if (
                        opponentAbsolute ===
                        absolutePosition
                    ) {

                        /*
                            Đưa quân đối thủ
                            về chuồng.
                        */

                        opponentPiece.position =
                            -1;

                        opponentPiece.finished =
                            false;


                        showBoardMessage(
                            `${player.name} ăn một quân ${opponent.name}!`
                        );

                    }

                }
            );

        }
    );

}


/* =========================================================
   NEXT TURN
========================================================= */

function nextTurn() {

    LudoBoard.currentPlayer++;

    if (
        LudoBoard.currentPlayer >=
        LudoBoard.players.length
    ) {

        LudoBoard.currentPlayer = 0;

        LudoBoard.turnNumber++;

    }


    LudoBoard.diceValue =
        0;

    LudoBoard.selectedPiece =
        null;


    updateDiceUI();

    updateTurnUI();

    updateBoardUI();


    /*
        Nếu người hiện tại là AI,
        main.js / AI engine có thể gọi
        rollDice() sau này.
    */

    emitBoardEvent(
        "ludo:turnChanged",
        {
            player:
                LudoBoard.players[
                    LudoBoard.currentPlayer
                ]
        }
    );

}


/* =========================================================
   ROLL DICE
========================================================= */

function rollDice() {

    if (
        !LudoBoard.started ||
        LudoBoard.rolling ||
        LudoBoard.animationLock ||
        LudoBoard.winner
    ) {

        return null;

    }


    /*
        Không cho tung lần 2.
    */

    if (
        LudoBoard.diceValue !== 0
    ) {

        return null;

    }


    LudoBoard.rolling =
        true;


    updateDiceUI();


    let animationCount =
        0;


    const animation =
        setInterval(
            () => {

                const value =
                    randomDice();

                LudoBoard.diceValue =
                    value;

                updateDiceUI();


                animationCount++;


                if (
                    animationCount >=
                    10
                ) {

                    clearInterval(
                        animation
                    );


                    const result =
                        randomDice();


                    LudoBoard.diceValue =
                        result;


                    LudoBoard.rolling =
                        false;


                    updateDiceUI();


                    handleDiceResult(
                        result
                    );

                }

            },
            70
        );


    return true;

}


/* =========================================================
   RANDOM DICE
========================================================= */

function randomDice() {

    return Math.floor(
        Math.random() * 6
    ) + 1;

}


/* =========================================================
   DICE RESULT
========================================================= */

function handleDiceResult(
    value
) {

    const player =
        LudoBoard.players[
            LudoBoard.currentPlayer
        ];


    if (!player) {
        return;
    }


    const movable =
        player.pieces.filter(
            piece =>
                canMovePiece(
                    player,
                    piece,
                    value
                )
        );


    if (
        movable.length === 0
    ) {

        showBoardMessage(
            `${player.name} không có quân có thể đi.`
        );


        /*
            Không có nước đi:
            chuyển lượt sau một khoảng ngắn.
        */

        setTimeout(
            () => {

                if (
                    LudoBoard.diceValue !==
                    value
                ) {
                    return;
                }

                LudoBoard.diceValue = 0;
                updateDiceUI();

                // Theo luật: đổ 6 vẫn được tung tiếp,
                // kể cả khi không có quân hợp lệ để đi.
                if (value === LUDO_CONFIG.EXTRA_TURN_ROLL) {

                    showBoardMessage(
                        `${player.name} được tung lại vì đã đổ 6!`
                    );

                    updateTurnUI();

                    emitBoardEvent(
                        "ludo:turnChanged",
                        {
                            player,
                            extraTurn: true,
                            reason: "rolled-6-no-move"
                        }
                    );

                    return;
                }

                nextTurn();

            },
            700
        );


        return;

    }


    if (
        value === 6 &&
        player.pieces.some(
            piece =>
                piece.position === -1
        )
    ) {

        showBoardMessage(
            `${player.name} đổ 6 — có thể đưa quân ra!`
        );

    } else {

        showBoardMessage(
            `${player.name} đổ ${value} — chọn quân để đi.`
        );

    }


    emitBoardEvent(
        "ludo:diceRolled",
        {
            playerId:
                player.id,

            value,

            movablePieces:
                movable.map(
                    piece =>
                        piece.id
                )

        }
    );

}


/* =========================================================
   CHECK WINNER
========================================================= */

function checkWinner(player) {
    if (!player || !Array.isArray(player.pieces)) return false;

    // Winning formation is exactly the ordered finish queue 3-4-5-6.
    // The first piece may reach 6, the next 5, then 4, then 3.
    // Four pieces sitting only on 1/2/4/5/6 do NOT count as a win.
    const required = new Set([
        LUDO_CONFIG.HOME_PATH_START + 2,
        LUDO_CONFIG.HOME_PATH_START + 3,
        LUDO_CONFIG.HOME_PATH_START + 4,
        LUDO_CONFIG.HOME_PATH_START + 5
    ]);

    const positions = player.pieces.map(piece => piece.position);
    return positions.length === 4 &&
        positions.every(position => required.has(position)) &&
        new Set(positions).size === 4;
}


/* =========================================================
   WINNER
========================================================= */

function handleWinner(
    player
) {

    showBoardMessage(
        `🎉 ${player.name} đã thắng!`
    );


    emitBoardEvent(
        "ludo:gameWon",
        {
            playerId:
                player.id,

            player
        }
    );


    updateBoardUI();

}


/* =========================================================
   UPDATE DICE UI
========================================================= */

function updateDiceUI() {

    const dice =
        document.getElementById(
            "ludoDice"
        ) || document.getElementById(
            "dice"
        );


    if (!dice) {
        return;
    }


    if (
        LudoBoard.rolling
    ) {

        dice.classList.add(
            "rolling"
        );

    } else {

        dice.classList.remove(
            "rolling"
        );

    }


    if (
        LudoBoard.diceValue
    ) {

        dice.textContent =
            LudoBoard.diceValue;

    } else {

        dice.textContent =
            "🎲";

    }

}


/* =========================================================
   UPDATE TURN UI
========================================================= */

function updateTurnUI() {

    const player =
        LudoBoard.players[
            LudoBoard.currentPlayer
        ];


    if (!player) {
        return;
    }


    const element =
        document.getElementById(
            "ludoTurn"
        );


    if (element) {

        element.textContent =
            `Lượt của ${player.name}`;

        element.style.color =
            player.color;

    }


    showBoardMessage(
        `Lượt của ${player.name}`
    );

}


/* =========================================================
   BOARD MESSAGE
========================================================= */

function showBoardMessage(
    message
) {

    const element =
        document.getElementById(
            "ludoBoardMessage"
        );


    if (element) {

        element.textContent =
            message;

    }

}


/* =========================================================
   BOARD UI
========================================================= */

function updateBoardUI() {

    updatePiecePositions();

    updateDiceUI();

    updateTurnUI();

}


/* =========================================================
   CLEAR SELECTION
========================================================= */

function clearSelectedPiece() {

    LudoBoard.selectedPiece =
        null;


    document
        .querySelectorAll(
            ".ludo-piece.selected"
        )
        .forEach(
            element => {

                element.classList.remove(
                    "selected"
                );

            }
        );

}


/* =========================================================
   RESET GAME
========================================================= */

function resetLudoBoard() {

    LudoBoard.started =
        false;

    LudoBoard.rolling =
        false;

    LudoBoard.diceValue =
        0;

    LudoBoard.currentPlayer =
        0;

    LudoBoard.winner =
        null;

    LudoBoard.turnNumber =
        1;

    LudoBoard.selectedPiece =
        null;

    LudoBoard.lastMove =
        null;

    LudoBoard.animationLock =
        false;


    createPlayers();

    createBoard();

    createPieces();


    LudoBoard.started =
        true;


    updateBoardUI();

}


/* =========================================================
   WAIT
========================================================= */

function wait(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );

}


/* =========================================================
   EVENT SYSTEM
========================================================= */

function emitBoardEvent(
    eventName,
    detail = {}
) {

    document.dispatchEvent(
        new CustomEvent(
            eventName,
            {
                detail
            }
        )
    );

}


/* =========================================================
   AI / MULTIPLAYER API
========================================================= */

/*
    Cho phép main.js sau này
    thay đổi loại người chơi.
*/

function setPlayerType(
    playerId,
    type
) {

    const player =
        LudoBoard.players.find(
            p =>
                p.id === playerId
        );


    if (!player) {
        return false;
    }


    player.type =
        type;


    return true;

}


/* =========================================================
   CONNECTION STATE
========================================================= */

function setPlayerConnection(
    playerId,
    connected
) {

    const player =
        LudoBoard.players.find(
            p =>
                p.id === playerId
        );


    if (!player) {
        return false;
    }


    player.connected =
        connected;


    return true;

}


/* =========================================================
   AI TAKEOVER
========================================================= */

function convertPlayerToAI(
    playerId
) {

    const player =
        LudoBoard.players.find(
            p =>
                p.id === playerId
        );


    if (!player) {
        return false;
    }


    /*
        Quan trọng:

        KHÔNG reset pieces.

        AI tiếp quản đúng vị trí
        hiện tại của người chơi.
    */

    player.type =
        "ai";

    player.connected =
        false;


    emitBoardEvent(
        "ludo:aiTakeover",
        {
            playerId,
            player
        }
    );


    return true;

}


/* =========================================================
   RESTORE HUMAN
========================================================= */

function restoreHumanPlayer(
    playerId
) {

    const player =
        LudoBoard.players.find(
            p =>
                p.id === playerId
        );


    if (!player) {
        return false;
    }


    player.type =
        "human";

    player.connected =
        true;


    emitBoardEvent(
        "ludo:playerReconnected",
        {
            playerId,
            player
        }
    );


    return true;

}


/* =========================================================
   GET GAME STATE
========================================================= */

function getLudoState() {

    return {

        currentPlayer:
            LudoBoard.currentPlayer,

        diceValue:
            LudoBoard.diceValue,

        turnNumber:
            LudoBoard.turnNumber,

        winner:
            LudoBoard.winner,

        started:
            LudoBoard.started,

        players:
            LudoBoard.players.map(
                player => ({

                    id:
                        player.id,

                    name:
                        player.name,

                    color:
                        player.color,

                    type:
                        player.type,

                    connected:
                        player.connected,

                    isHost:
                        player.isHost,

                    pieces:
                        player.pieces.map(
                            piece => ({

                                id:
                                    piece.id,

                                position:
                                    piece.position,

                                finished:
                                    piece.finished

                            })
                        )

                })
            )

    };

}


/* =========================================================
   LOAD GAME STATE
========================================================= */

function loadLudoState(
    state
) {

    if (!state) {
        return false;
    }


    if (
        typeof state.currentPlayer ===
        "number"
    ) {

        LudoBoard.currentPlayer =
            state.currentPlayer;

    }


    if (
        typeof state.diceValue ===
        "number"
    ) {

        LudoBoard.diceValue =
            state.diceValue;

    }


    if (
        typeof state.turnNumber ===
        "number"
    ) {

        LudoBoard.turnNumber =
            state.turnNumber;

    }


    if (state.winner) {

        LudoBoard.winner =
            state.winner;

    }


    if (
        Array.isArray(
            state.players
        )
    ) {

        state.players.forEach(
            savedPlayer => {

                const player =
                    LudoBoard.players.find(
                        p =>
                            p.id ===
                            savedPlayer.id
                    );


                if (!player) {
                    return;
                }


                if (
                    savedPlayer.name
                ) {

                    player.name =
                        savedPlayer.name;

                }


                if (
                    savedPlayer.type
                ) {

                    player.type =
                        savedPlayer.type;

                }


                if (
                    typeof
                    savedPlayer.connected ===
                    "boolean"
                ) {

                    player.connected =
                        savedPlayer.connected;

                }


                if (
                    typeof
                    savedPlayer.isHost ===
                    "boolean"
                ) {

                    player.isHost =
                        savedPlayer.isHost;

                }


                if (
                    Array.isArray(
                        savedPlayer.pieces
                    )
                ) {

                    savedPlayer.pieces.forEach(
                        savedPiece => {

                            const piece =
                                player.pieces.find(
                                    p =>
                                        p.id ===
                                        savedPiece.id
                                );


                            if (!piece) {
                                return;
                            }


                            if (
                                typeof
                                savedPiece.position ===
                                "number"
                            ) {

                                piece.position =
                                    savedPiece.position;

                            }


                            piece.finished =
                                !!savedPiece.finished;

                        }
                    );

                }

            }
        );

    }


    updateBoardUI();

    return true;

}


/* =========================================================
   RULE 1 SHORTCUT SELF TEST
========================================================= */

function testLudoShortcutRules() {
    const expectedNextArrows = {
        blue: 27,
        red: 41,
        green: 55,
        yellow: 13
    };

    const results = {};

    for (const player of LUDO_PLAYERS) {
        const spawn = LUDO_SPAWN_TRACK_INDEX[player.id];
        const target = getNextArrowTrackIndex(spawn);
        const distance = (target - spawn + LUDO_CONFIG.TRACK_LENGTH) % LUDO_CONFIG.TRACK_LENGTH;

        results[player.id] = {
            spawn,
            target,
            distance,
            targetOK: target === expectedNextArrows[player.id],
            spawnDistanceOK: distance === 13
        };
    }

    // Một mũi tên phải bay tiếp tới mũi tên kế tiếp đúng 14 ô.
    const arrowChain = {};
    for (const arrowIndex of LUDO_ARROW_TRACK_INDEXES) {
        const target = getNextArrowTrackIndex(arrowIndex);
        arrowChain[arrowIndex] = {
            target,
            distance: (target - arrowIndex + LUDO_CONFIG.TRACK_LENGTH) % LUDO_CONFIG.TRACK_LENGTH
        };
    }

    const passed =
        Object.values(results).every(item => item.targetOK && item.spawnDistanceOK) &&
        Object.values(arrowChain).every(item => item.distance === 14);

    console.log(
        passed ? 'LUDO SHORTCUT TEST: PASS' : 'LUDO SHORTCUT TEST: FAIL',
        { results, arrowChain }
    );

    return { passed, results, arrowChain };
}


/* =========================================================
   LUDO COORDINATE SELF TEST
========================================================= */

function testLudoCoordinates() {

    const expectedSpawns = {
        yellow: [0, 6],
        green: [6, 14],
        red: [14, 8],
        blue: [8, 0]
    };

    const expectedFirstTrack = {
        yellow: [1, 6],
        green: [6, 13],
        red: [13, 8],
        blue: [8, 1]
    };

    const results = {};

    for (const player of LUDO_PLAYERS) {

        const spawn =
            getPlayerSpawnCoordinate(player);

        const first =
            getPieceCoordinates(
                player,
                { id: 0, position: 1 }
            );

        const finishFirst =
            getPieceCoordinates(
                player,
                {
                    id: 0,
                    position:
                        LUDO_CONFIG.HOME_PATH_START
                }
            );

        results[player.id] = {
            spawn,
            first,
            finishFirst,
            spawnOK:
                spawn[0] === expectedSpawns[player.id][0] &&
                spawn[1] === expectedSpawns[player.id][1],
            firstOK:
                first[0] === expectedFirstTrack[player.id][0] &&
                first[1] === expectedFirstTrack[player.id][1]
        };
    }

    results.blue.routeOK =
        results.blue.spawn[0] === 8 &&
        results.blue.spawn[1] === 0 &&
        results.blue.first[0] === 8 &&
        results.blue.first[1] === 1 &&
        results.blue.finishFirst[0] === 2 &&
        results.blue.finishFirst[1] === 7;

    // Kiểm tra điểm chuyển: position 43 là ô cuối đường vòng,
    // position 44 phải là ô đầu tiên của đường về đích.
    const finishTransition = {};
    for (const player of LUDO_PLAYERS) {
        const lastTrack = getPieceCoordinates(player, { id: 0, position: 43 });
        const firstFinish = getPieceCoordinates(player, { id: 0, position: 44 });
        finishTransition[player.id] = { lastTrack, firstFinish };
    }

    results.finishTransition = finishTransition;

    const passed =
        Object.values(results)
            .filter(item => item && typeof item === "object" && "spawnOK" in item)
            .every(
                item =>
                    item.spawnOK &&
                    item.firstOK
            ) &&
        results.blue.routeOK &&
        LUDO_CONFIG.HOME_PATH_START === 56 &&
        LUDO_CONFIG.FINISH_POSITION === 61;

    console.log(
        passed
            ? "LUDO COORDINATE TEST: PASS"
            : "LUDO COORDINATE TEST: FAIL",
        results
    );

    return { passed, results };
}

window.testLudoCoordinates =
    testLudoCoordinates;


/* =========================================================
   PUBLIC API
========================================================= */

window.LudoBoard =
    LudoBoard;

window.renderLudoPieces =
    createPieces;

window.initLudoBoard =
    initLudoBoard;

window.rollLudoDice =
    rollDice;

window.resetLudoBoard =
    resetLudoBoard;

window.selectLudoPiece =
    selectPiece;

window.LudoBoardCanMovePiece =
    canMovePiece;
window.LudoBoardCheckWinner =
    checkWinner;

window.getLudoSpawnShortcut =
    getSpawnShortcutDestination;

window.testLudoShortcutRules =
    testLudoShortcutRules;

window.getLudoAbsoluteTrackIndex =
    getAbsoluteTrackIndex;

window.getLudoState =
    getLudoState;

window.loadLudoState =
    loadLudoState;

window.setLudoPlayerType =
    setPlayerType;

window.setLudoPlayerConnection =
    setPlayerConnection;

window.convertLudoPlayerToAI =
    convertPlayerToAI;

window.restoreLudoHumanPlayer =
    restoreHumanPlayer;


/* =========================================================
   AUTO INIT
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initLudoBoard
    );

} else {

    initLudoBoard();

}