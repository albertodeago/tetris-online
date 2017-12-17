class TetrisManager {

    constructor(document) {

        this.document = document;
		this.template = document.getElementById('player-template');
		this.playersContainer = document.getElementById('players-wrapper');

        this.instances = new Set;
        
    }

    /**
     * Create a tetris instance in the page, can be the local player or 
     * another player
     * @param {String} clientId 
     */
    createPlayer(clientId) {
        const element = this.document
            .importNode(this.template.content, true)
            .children[0];
        if(clientId)
            element.setAttribute("id", clientId);
        
        const tetris = new Tetris(element);            
        this.instances.add(tetris);

        this.playersContainer.appendChild(tetris.element);
            
        return tetris;
    }

    removePlayer(tetris) {
        this.instances.delete(tetris);
        this.playersContainer.removeChild(tetris.element);
    }
    
    sortPlayers(tetri) {
        tetri.forEach(tetris => {
            this.playersContainer.appendChild(tetris.element);
        });
    }

    /**
     * Set the id assigned by the connection manager to the element 
     * of the Tetris passed as parameter
     * @param {Tetris} tetris 
     */
    setIdToTetris(tetris, clientId) {
        if(!tetris.element.id)
            tetris.element.setAttribute('id', clientId);
    }
}
const debuggingActive = false;

class ConnectionManager {

    constructor (tetrisManager) {
        this.conn = null;
        this.peers = new Map;

        this.tetrisManager = tetrisManager;
        this.localTetris = [...tetrisManager.instances][0];
    }

    connect(address) {
        this.conn = new WebSocket(address);

        this.conn.addEventListener('open', () => {
            console.log('Connection established');
            this.initSession();
            this.watchEvents();
        });

        this.conn.addEventListener('message', event => {
            debuggingActive && console.log('Received message', event.data);
            this.receive(event.data);
        });
    }

    initSession() {
        const sessionId = window.location.hash.split('#')[1];
        const state = this.localTetris.serialize();
        if(sessionId) {
            this.send({
                type: 'join-session',
                id: sessionId,
                state: state
            });
        } else {
            this.send({
                type: 'create-session',
                state: state
            })
        }
    }

    watchEvents() {
        const local = this.localTetris;

        const player = local.player;

        ['pos', 'score', 'matrix', 'gameOver', 'name'].forEach( prop => {
            player.events.listen(prop, value => {

                if(prop === 'gameOver') {
                    this.checkIfTheGameIsOver();
                }

                this.send({
                    type: 'state-update',
                    fragment: 'player',
                    entry: [prop, value]
                });
            });
        });
        player.events.listen('start-game', (val) => {
            this.send({
                type: 'start-game',
                fragment: 'game'
            });
        });
        player.events.listen('send-debuff', (val) => {
            this.send({
                type: 'send-debuff',
                debuffType: val
            });
        });
        player.events.listen('restart-game', () => {
            this.send({
                type: 'restart-game'
            });
        });

        const arena = local.arena;
    
        ['matrix'].forEach( prop => {
            arena.events.listen(prop, value => {
                this.send({
                    type: 'state-update',
                    fragment: 'arena',
                    entry: [prop, value]
                });
            });
        });

    }

    updateManager(peers) {
        const me = peers.you;
        const clients = peers.clients.filter(client => me !== client.id);
        clients.forEach( client => {
            if(!this.peers.has(client.id)) {
                const tetris = this.tetrisManager.createPlayer(client.id);
                tetris.unserialize(client.state);
                this.peers.set(client.id, tetris);
            }
        });

        [...this.peers.entries()].forEach( ([id, tetris]) => {
            if(!clients.some(client => client.id === id)) {
                this.tetrisManager.removePlayer(tetris);
                this.peers.delete(id);
            }
        });

        // const sorted = peers.clients.map(client => this.peers.get(client.id) || this.localTetris); // with this line we "syncronize" all clients to have the same order of tetris appended
        // this.tetrisManager.sortPlayers(sorted);

        // set id of the html element if not already setted
        this.tetrisManager.setIdToTetris(this.localTetris, me); 
    }

    updatePeer(id, fragment, [prop, value]) {
        if(!this.peers.has(id)) {
            console.error("Client is unknown", id);
            return ;
        }

        const tetris = this.peers.get(id);
        tetris[fragment][prop] = value;
        
        if(prop === 'score') {
            tetris.updateScore(value);
        } 
        else if(prop === 'name') {
            tetris.setPlayerName(value);
        } 
        else {
            tetris.draw();
        }

        if(tetris.player.gameOver === true) {
            let el = document.getElementById(id);
            el.classList.add('game-over');

            this.checkIfTheGameIsOver();
        }
    }

    /**
     * Received a message from the server, handle it
     * @param {Object} msg  TODO should create a Message class and a hierarchy
     */
    receive(msg) {
        const data = JSON.parse(msg);
        if(data.type === 'session-created') {
            window.location.hash = data.id;
            document.getElementById('start-game-btn').style.display = "block";
            document.getElementById('waiting-game').style.display = "none";
        } 
        
        else if(data.type === 'session-broadcast') {
            this.updateManager(data.peers);
        } 
        
        else if(data.type === 'state-update') {
            this.updatePeer(data.clientId, data.fragment, data.entry);
        } 
        
        else if(data.type === 'start-game') {
            if(!this.localTetris.isStarted) {
                this.localTetris.run();
                attachEventListeners();
            }
        } 
        
        else if(data.type === 'go-to-session') {
            let newUrl = document.location.protocol +"//"+ document.location.hostname + document.location.pathname + '#' + data.id;
            window.location.href = newUrl;
            window.location.reload();
        } 
        
        else if(data.type === 'apply-debuff') {
            // var targettedPlayer = null;

            // this.tetrisManager.instances.forEach( instance => {
            //     if(instance.element.id === data.targettedClient)
            //         targettedPlayer = instance.player;
            // })

            // const targettedPeer = this.peers.get(data.targettedClient);

            // if(!targettedPeer) {     // no targetted peers, so I am the target
            //     this.localTetris.player.applyDebuff(data.debuffType);
            // } else {
            //     targettedPeer.player.applyDebuff(data.debuffType);
            // }
            this.localTetris.player.applyDebuff(data.debuffType);
        }
    }

    send(data) {
        const msg = JSON.stringify(data);
        debuggingActive && console.log('Sending message ', msg);
        this.conn.send(msg);
    }

    checkIfTheGameIsOver() {
        // Check if the game is over 
        let stillPlaying = [];
        this.peers.forEach( p => {
            if(!p.player.gameOver)
                stillPlaying.push(p.player);
        });
        if(!this.localTetris.player.gameOver){
            stillPlaying.push(this.localTetris.player);
        }

        if(stillPlaying.length === 1) { // that's the winner!
            document.getElementById('winner-label').innerText = "Winner: " + stillPlaying[0].name;
            document.getElementById('restart-game-container').style.display = "block";

            if(stillPlaying[0] === this.localTetris.player){
                document.getElementById('restart-game-btn').style.display = "block";
            }
        }
    }
    
}
/**
 * The arena is the field a player is playing in, basically is a big matrix 
 */
class Arena {
    constructor(w, h) {
        const matrix = [];
        while(h--) {
            matrix.push(new Array(w).fill(0));
        }
        this.matrix = matrix;

        this.events = new Events;
    }

    /**
     * Check if the plyer piece collides with something in the arena.
     * @param {Player} player 
     */
    collide(player) {
        const [m, o] = [player.matrix, player.pos];
        for(let y=0; y<m.length; ++y) {
            for(let x=0; x < m[y].length; ++x) {
                if(m[y][x] !== 0 && (this.matrix[y + o.y] && this.matrix[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Merge the player piece with the arena. Basically is the method that "immobilize" 
     * pieces that collides with the arena
     * @param {Player} player 
     */
    merge(player) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if(value !== 0) {
                    this.matrix[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
        
        this.events.emit('matrix', this.matrix);
    }

    /**
     * Method that checks if there are full rows in the arena and erase them. 
     * It returns a score based on the amount of rows erased.
     * @returns {Integer} the score obtained by the sweep
     */
    sweep() {
        let amountOfRows = 0;   // amount of rows that the sweeps has removed
        let multiplier = 1;     // multiplier for score
        let score = 0;          // score to return
        outer: for(let y=this.matrix.length -1; y>0; --y){
            for(let x = 0; x<this.matrix[y].length; ++x ){
                if(this.matrix[y][x] === 0) {
                    continue outer;   // row not filled, continue to next row (the first for)
                }
            }
            
            // remove the filled row, fill it with 0 and repush onto the ren
            const row = this.matrix.splice(y, 1)[0].fill(0); 
            this.matrix.unshift(row);
            ++y;
    
            amountOfRows++;
            score += multiplier * 10;
            multiplier *= 2;
        }
        
        this.events.emit('matrix', this.matrix);
        return {score: score, rows: amountOfRows};
    }

    /**
     * Clear the arena, game is over!
     */
    clear() {
        this.matrix.forEach( row => { row.fill(0); });
        this.events.emit('matrix', this.matrix);
    }
}
class Events {
    constructor() {
        this._listeners = new Set;
    }

    listen(name, callback) {
        this._listeners.add({
            name, 
            callback
        });
    }

    emit(name, ...data) {
        this._listeners.forEach(listener => {
            if(listener.name === name) {
                listener.callback(...data);
            }
        })
    }
}
/**
 * A player. This includes the matrix (piece) the player is moving, the tetris 
 * he is playing on, the arena he is playing on, the speed of the game and 
 * so on
 */
class Player {
    constructor(tetris){
        
        this.DROP_SLOW = 700;
        this.DROP_FAST = 35;

        this.events = new Events();

        this.score = 0;
        this.amountOfBrokenRows = 0;
        this.pos = {x: 0, y: 0};
        this.matrix = null;            
        this.dropCounter = 0;
        this.dropInterval = this.DROP_SLOW;    // ms

        this.tetris = tetris;
        this.arena = tetris.arena;

        this.gameOver = false;
        this.name = '';

        this.invertedKeys = false;
        this.rotatingPieces = false;

        this.reset();
    }
    
    /**
     * Move a piece left or right
     * @param {Integer} dir +1 | -1 to move the player piece to the right
     * or to the left
     */
    move(dir) {
        this.pos.x += dir;
        if(this.arena.collide(this)) {
            this.pos.x -= dir;
            return;
        }

        this.events.emit('pos', this.pos);
    }

    /**
     * Reset the player piece because the previous piece has collided somewhere.
     * We re-create a piece randomly and position in the top center
     */
    reset() {
        const pieces = 'ILJOTSZ';
        this.matrix = this.createPiece(pieces[pieces.length * Math.random() | 0]);
        this.pos.y = 0;
        this.pos.x = (this.arena.matrix[0].length / 2 | 0) - (this.matrix[0].length / 2 | 0);
    
        if(this.arena.collide(this)) {  
            this.gameOver = true;
            this.events.emit('gameOver', true);

            // update self tetris view
            this.tetris.element.classList.add('game-over');
        }

        this.events.emit('pos', this.pos);
        this.events.emit('matrix', this.matrix);
    }

    /**
     * Rotate the piece of the player to the right or to the left based on dir input.
     * If the player could not rotate the piece due to collision we move left or right
     *  the piece to let it fit rotated.
     * @param {Integer} dir +1 | -1
     */
    rotate(dir) {
        const initialPos = this.pos.x;
        let offset = 1;
        this._rotateMatrix(this.matrix, dir);
        while(this.arena.collide(this)) {
            this.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if(offset > this.matrix[0].length) {
                this._rotateMatrix(this.matrix, -dir);
                this.pos.x = initialPos;
                return;
            }
        }

        this.events.emit('matrix', this.matrix);       
    }

    /**
     * Drop the player piece down by 1. If the piece collide we merge it with the arena
     * and call the reset method. Also if it collides we call an arena sweep and 
     * update the score.
     */
    drop() {
        this.pos.y++;

        if(this.rotatingPieces)
            this.rotate(+1);

        this.dropCounter = 0;
        if(this.arena.collide(this)) {
            
            this.dropInterval = this.DROP_SLOW;     // Fix attempt of weird bug
            
            // update position
            this.pos.y--;
            this.arena.merge(this);
            
            let sweepObj = this.arena.sweep();
            this.score += sweepObj.score;
            
            if(sweepObj.rows > 0) {
                this.amountOfBrokenRows += sweepObj.rows;
                this.changeSpeed(sweepObj.rows);            
            }

            if(sweepObj.rows) {
                // this.testDebuff();
                this.sendDebuff();
            }

            this.events.emit('score', this.score);
            
            this.reset();
            return true;    // return true when we collide (used to implement the space btn)
        }
        
        this.events.emit('pos', this.pos);
    }

    /**
     * Update the view if, from the last time is passed more than
     * "dropInterval" ms
     * @param {Integer} deltaTime passed time in ms
     */
    update(deltaTime) {
        this.dropCounter += deltaTime;
        if(this.dropCounter > this.dropInterval){
            this.drop();
        }
    }

    /**
     * Set the name of the player and emit an event to notify the other clients
     * @param {String} name 
     */
    setName(name) {
        this.name = name;
        this.events.emit('name', name);
    }

    /**
     * Change the speed of the player based on the amount of broken rows of this turn.
     */
    changeSpeed(brokenRows) {
        this.dropInterval -= (2 * brokenRows);
        this.DROP_SLOW = this.dropInterval; // maintain updated the DROP_SLOW constant
        console.log("Speed increased", this.dropInterval);
    }

    /**
     * Generic method to rotate a matrix, used to rotate pieces
     * @param {Array[Array[]]} matrix 
     * @param {Integer} dir +1 | -1 based on wanted rotation
     */
    _rotateMatrix(matrix, dir) {
        for(let y=0; y<matrix.length; ++y) {
            for(let x=0; x<y; ++x) {
                [
                    matrix[x][y],
                    matrix[y][x]
                ] = [
                    matrix[y][x],
                    matrix[x][y]
                ]
            }
        }

        if(dir > 0) 
            matrix.forEach(row => row.reverse());
        else 
            matrix.reverse();
    }

    sendDebuff() {
        const debuffs = [
            'HASTE',
            'KEYS-INVERTED',
            'ARENA-SWING',
            'ROTATING-PIECE',
            'ARENA-MINI'
        ];
        const random = getRandomInt(0, debuffs.length);
        this.events.emit('send-debuff', debuffs[random]);
    }

    askRestartGame() {
        this.events.emit('restart-game');
    }

    applyDebuff(debuffType) {
        let duration = 10000; // 10 sec debuff duration
        
        if(debuffType === 'HASTE') {
            duration = 20000;   // 20 sec of haste
            const factor = 2;   // 2x of speed
            this.dropInterval /= factor;
            this.DROP_FAST /= factor;
            console.log("HASTE START", this.dropInterval);
            setTimeout(() => {
                this.dropInterval *= factor;
                this.DROP_FAST *= factor;    
                console.log('HASTE ENEDED', this.dropInterval);
            }, duration)
        } else if(debuffType === 'KEYS-INVERTED') {
            this.invertedKeys = true;
            setTimeout(() => { this.invertedKeys = false }, duration);  // TODO should base on amount of pieces
        } else if(debuffType === 'ARENA-SWING') {
            var el = this.tetris.element.querySelector('.tetris');
            el.classList.add('swing-debuff');
            setTimeout( () => {
                el.classList.remove('swing-debuff');
            }, duration);
        } else if(debuffType === 'ROTATING-PIECE') {
            this.rotatingPieces = true;
            setTimeout( () => { this.rotatingPieces = false }, duration);            
        } else if(debuffType === 'ARENA-MINI') {
            var el = this.tetris.element.querySelector('.tetris');
            el.classList.add('small-debuff');
            setTimeout( () => {
                el.classList.remove('small-debuff');
            }, duration);
        }

        // debuff bar
        var debuffBar = this.tetris.element.querySelector('.debuff-bar');
        debuffBar.classList.add('debuff-' + duration/1000);

        // timeout to stop the debuff bar
        setTimeout( () => {
            debuffBar.classList.remove('debuff-' + duration/1000);
        }, duration);
        
    }

    /**
     * TODO should implement a new class PieceType and make pieces there.
     * Create a piece of type and return it.
     * @param {String} type 
     */
    createPiece(type) {
        if(type === 'T') {
            return [
                [0,0,0],
                [7,7,7],
                [0,7,0]
            ]
        } else if(type === 'O') {
            return [
                [6,6],
                [6,6]
            ];
        } else if(type === 'L'){
            return [
                [0,5,0],
                [0,5,0],
                [0,5,5]
            ];
        } else if (type === 'J') {
            return [
                [0,4,0],
                [0,4,0],
                [4,4,0]
            ];
        } else if(type === 'I') {
            return [
                [0,3,0,0],
                [0,3,0,0],
                [0,3,0,0],
                [0,3,0,0]
            ];
        } else if(type === 'S'){
            return [
                [0,2,2],
                [2,2,0],
                [0,0,0]
            ];
        } else if(type === 'Z') {
            return [
                [1,1,0],
                [0,1,1],
                [0,0,0]
            ];
        }
    }
}
class Tetris {

    constructor(element) {
        this.element = element;
        this.canvas = element.querySelector('.tetris');;
        this.context = this.canvas.getContext('2d');
        this.context.scale(30,30);
        
        this.arena = new Arena(12, 20);
        this.player = new Player(this);

        this.player.events.listen('score', score => {
            this.updateScore(score);
        });

        this.colors = [
            null, 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'grey'
        ];     

        this.isStarted = false;
        
        this.lastTime = 0;
        this._update = (time = 0) => {
            const deltaTime = time - this.lastTime;
            this.lastTime = time;
    
            if(!this.player.gameOver)
                this.player.update(deltaTime);
    
            this.draw();
            requestAnimationFrame(this._update);
        }

        this.updateScore(0);
    }

    /**
     * Draw both the arena and the player piece
     */
    draw() {    
        this.context.fillStyle = '#000';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawMatrix(this.arena.matrix, {x: 0, y: 0});
        this.drawMatrix(this.player.matrix, this.player.pos);
    }

    /**
     * Draw a piece or the arena in the canvas. It's an helper function 
     * used by Draw method
     * @param {Array[Array[]]} matrix the piece to draw
     * @param {Object} offset an object with x and y properties that
     * determinize the offset (with 0 0 being the top left) of the matrix
     * to draw in the tetris
     */
    drawMatrix(matrix, offset = {x:0,y:0} ) {
        matrix.forEach((row,y) => {
            row.forEach((value, x) => {
                if(value !== 0) {
                    let ctx = this.context;
                    
                    // "shadow" effect
                    // ctx.shadowOffsetX = -1.5;
                    // ctx.shadowOffsetY = -1.5;
                    // ctx.shadowBlur = 0.5;
                    // ctx.shadowColor = "white"; //this.colors[value];

                    ctx.fillStyle = this.colors[value];
                    ctx.fillRect(x+offset.x, y+offset.y, 1, 1);                

                    ctx.lineWidth="0.05";
                    ctx.strokeStyle="#000";
                    ctx.strokeRect(x+offset.x, y+offset.y, 1, 1); 
                }
            });
        });
    }

    /**
     * Function called to start the tetris. We show a message that the 
     * game is starting in 5 seconds and then actually start the tetris.
     */
    run() {
        document.getElementById('waiting-game').style.display = "block";
        document.getElementById('start-game-btn').style.display = "none";
        const maxTime = 7;
        const secondsToWait = [1,2,3,4,5,6,7];
        this.showRemainingTime(maxTime);
        secondsToWait.forEach( (time, index) => {
            setTimeout(() => {
                if(maxTime !== time) 
                    this.showRemainingTime(maxTime - time);
                else {
                    document.getElementById('start-game-container').style.display = "none";
                    this.isStarted = true;
                    this._update();
                    this.setPlayerName(document.getElementById('input-player-name').value);
                }
            }, time*1000);
        })
    }

    /**
     * Helper function to show the countdown before start of game
     * @param {Integer} time number to show in the string "starting in {time}"
     */
    showRemainingTime(time) {
        document.getElementById('waiting-label').innerText = "Starting in " + time;
    }

    /**
     * Serialize objects to send throught websocket
     */
    serialize() {
        return {
            arena: {
                matrix: this.arena.matrix,
            },
            player: {
                matrix:     this.player.matrix,
                pos:        this.player.pos,
                score:      this.player.score,
                gameOver:   this.player.gameOver
            }
        }
    }

    /**
     * Given a state of a tetris serialized, deserialize it and 
     * assign the properties to the instance of tetris (this is used 
     * when a used joins a game)
     * @param {Object} state 
     */
    unserialize(state) {
        this.arena = Object.assign(state.arena);
        this.player = Object.assign(state.player);
        this.updateScore(this.player.score);
        this.draw();
    }
    
    /**
     * Update the score view of the instance tetris
     * @param {Integer} score 
     */
    updateScore(score){
        this.element.querySelector('.score').innerText = score;
    }
    
    /**
     * Set the name of the player or generate a random one if missing parameter
     * @param {String} name 
     */
    setPlayerName(name) {
        name = name || 'Unnamed player';    // TODO create random cool names ?
        this.element.querySelector('.name').innerText = name;
        
        // if the setName function is defined means that the player we are talking about
        // is the local player, so we call the right setName method
        // otherwise is a peer (another player), so we simply set the property
        if(this.player.setName) {
            this.player.setName(name);
        } else {
            this.player.name = name;
        }
    }    

}
function attachEventListeners() {

    let isMobile = false;
    const player = localTetris.player;

    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
        isMobile = true;
    }

    if(isMobile) {

        handleModileLeft = function(e) {
            isMoving = true;
            if(!player.gameOver && localTetris.isStarted && !isDropping) { 
                player.move(-1);
            }
        }
        handleModileRight = function(e) {
            isMoving = true;
            if(!player.gameOver && localTetris.isStarted && !isDropping) { 
                player.move(+1);
            }
        }
        handleMobileDown = function(e) {
            isMoving = true;
            isDropping = true;
            if(!player.gameOver && localTetris.isStarted) { 
                player.drop();
            }
        }
        handleMobileSpaceBar = function(e) {
            isMoving = true;
            if(!player.gameOver && localTetris.isStarted) {
                while(!player.drop()) {}
            }
        }
        handleMobileRotation = function() {
            if(!player.gameOver && localTetris.isStarted) { 
                player.rotate(+1);
            }
        }

        const deviceX = document.documentElement.clientWidth;
        const deviceY = document.documentElement.clientHeight;
        console.log("Mobile viewport:", deviceX, deviceY);

        const nSquareX = 12;
        const nSquareY = 20;
        const minSpaceX = deviceX / (nSquareX * 2);
        const minSpaceY = deviceY / (nSquareY * 2);  // space to drop the piece by 1 
        const dropSpaceY = deviceY / 4;        // space to drop totally the piece

        let firstX = null;
        let firstY = null;
        let isMoving = false;
        let isDropping = false;
        
        var handleTouchStart = function(e) {
            firstX = e.touches[0].clientX;
            firstY = e.touches[0].clientY;
            e.preventDefault();
        }

        var handleTouchEnd = function(e) {
            firstX = null;
            firstY = null;
            if(!isMoving) {
                handleMobileRotation();
            }
            isMoving = false;
            isDropping = false;
        }

        var handleMove = function(e){
            let touch = e.touches[0];
            // console.log("touch move " + touch.clientX + " " + touch.clientY);
            // console.log(touch.clientY, (firstY - dropSpaceY));
            
            if(touch.clientX > (firstX + minSpaceX)) {
                firstX = touch.clientX;
                handleModileRight(e);
            } else if(touch.clientX < (firstX - minSpaceX)) {
                firstX = touch.clientX;
                handleModileLeft(e);
            } else if(touch.clientY > (firstY + minSpaceY)) {
                firstY = touch.clientY;
                handleMobileDown(e);
            } else if(touch.clientY < (firstY - (dropSpaceY/2)) ) {
                isDropping = true;                
                if(touch.clientY < (firstY - dropSpaceY)) {
                    firstY = touch.clientY;
                    handleMobileSpaceBar(e);
                }
            } 
        }

        document.addEventListener('touchstart', handleTouchStart, {passive: false});
        document.addEventListener('touchmove', handleMove, {passive: false});
        document.addEventListener('touchend', handleTouchEnd, {passive: false});

    } else {

        const keys = [37, 39, 81, 38, 40, 32]    // left right q up down space
        const invertedKeys = [39, 37, 81, 40, 38, 32]    // left right q up down space

        function pressedUp(player, e) {
            player.rotate(+1);
        }
        function pressedDown(player, e) {
            if(e.type === 'keydown' && player.dropInterval !== player.DROP_FAST) {
                player.dropInterval = player.DROP_FAST;
                player.drop();
            } 
            else 
                player.dropInterval = player.DROP_SLOW;
        }

        const keyListener = e => {
            [
                keys
            ].forEach( (key, index) => {
                
                if(!player.gameOver && localTetris.isStarted) { 

                    if(player.invertedKeys)
                        key = invertedKeys;

                    if( e.type === 'keydown') {
                        if(e.keyCode === key[0]) { 
                            player.move(-1);
                            e.preventDefault();
                        }
                        else if(e.keyCode === key[1]) { 
                            player.move(+1);
                            e.preventDefault();
                        }
                        else if(e.keyCode === key[2]) {
                            player.rotate(-1);
                            e.preventDefault();
                        }
                        else if(e.keyCode === key[3]) {
                            pressedUp(player, e);
                            e.preventDefault();
                        }
                        else if(e.keyCode === key[5]) {
                            while(!player.drop()) { }
                            e.preventDefault();
                        }
                    }
                    
                    if(e.keyCode === key[4]) {
                        pressedDown(player, e);
                        e.preventDefault();
                    }
                }
            })
        };

        document.addEventListener('keydown', keyListener); 
        document.addEventListener('keyup', keyListener);

    }
}
const tetrisManager = new TetrisManager(document);

const localTetris = tetrisManager.createPlayer();
localTetris.element.classList.add('local');
// localTetris.run();

const connectionManager = new ConnectionManager(tetrisManager);
var HOST = location.origin.replace(/^http/, 'ws')
console.log("connecting to ", HOST);
connectionManager.connect(HOST);


function startGame() {    
    // send a message to other players to start the game
    localTetris.player.events.emit('start-game');

    // start also the local game
    if(!localTetris.isStarted) {
        localTetris.run();
        attachEventListeners();
    }
}

function restartGame() {
    localTetris.player.askRestartGame();
}

// Helper function
// The maximum is exclusive and the minimum is inclusive
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; 
}