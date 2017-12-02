class TetrisManager {

    constructor(document) {

        this.document = document;
        this.template = document.getElementById('player-template');

        this.instances = new Set;
        
    }

    createPlayer() {
        const element = this.document
            .importNode(this.template.content, true)
            .children[0];
        
        const tetris = new Tetris(element);            
        this.instances.add(tetris);

        this.document.body.appendChild(tetris.element);
            
        return tetris;
    }

    removePlayer(tetris) {
        this.instances.delete(tetris);
        this.document.body.removeChild(tetris.element);
    }
    
    sortPlayers(tetri) {
        tetri.forEach(tetris => {
            this.document.body.appendChild(tetris.element);
        });
    }
}
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
            console.log('Received message', event.data);
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

        ['pos', 'score', 'matrix'].forEach( prop => {
            player.events.listen(prop, value => {
                this.send({
                    type: 'state-update',
                    fragment: 'player',
                    entry: [prop, value]
                });
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
                const tetris = this.tetrisManager.createPlayer();
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

        const sorted = peers.clients.map(client => this.peers.get(client.id) || this.localTetris);
        this.tetrisManager.sortPlayers(sorted);
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
        } else {
            tetris.draw();
        }
    }

    receive(msg) {
        const data = JSON.parse(msg);
        if(data.type === 'session-created') {
            window.location.hash = data.id;
        } else if(data.type === 'session-broadcast') {
            this.updateManager(data.peers);
        } else if(data.type === 'state-update') {
            this.updatePeer(data.clientId, data.fragment, data.entry);
        }
    }

    send(data) {
        const msg = JSON.stringify(data);
        console.log('Sending message ', msg);
        this.conn.send(msg);
    }
    
}
class Arena {
    constructor(w, h) {
        const matrix = [];
        while(h--) {
            matrix.push(new Array(w).fill(0));
        }
        this.matrix = matrix;

        this.events = new Events;
    }

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

    sweep() {
        let rowCount = 1;
        let score = 0;
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
    
            score += rowCount * 10;
            rowCount *= 2;
        }
        
        this.events.emit('matrix', this.matrix);
        return score;
    }

    clear() {
        this.matrix.forEach( row => { row.fill(0); });    // game ended
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
class Player {
    constructor(tetris){
        
        this.DROP_SLOW = 1000;
        this.DROP_FAST = 50;

        this.events = new Events();

        this.score = 0;
        this.pos = {x: 0, y: 0};
        this.matrix = null;            
        this.dropCounter = 0;
        this.dropInterval = this.DROP_SLOW;    // ms

        this.tetris = tetris;
        this.arena = tetris.arena;

        this.reset();
    }
    
    move(dir) {
        this.pos.x += dir;
        if(this.arena.collide(this)) {
            this.pos.x -= dir;
            return;
        }

        this.events.emit('pos', this.pos);
    }

    reset() {
        const pieces = 'ILJOTSZ';
        this.matrix = this.createPiece(pieces[pieces.length * Math.random() | 0]);
        this.pos.y = 0;
        this.pos.x = (this.arena.matrix[0].length / 2 | 0) - (this.matrix[0].length / 2 | 0);
    
        if(this.arena.collide(this)) {
            this.arena.clear();
            this.score = 0;
            this.events.emit('score', this.score);
        }

        this.events.emit('pos', this.pos);
        this.events.emit('matrix', this.matrix);
    }

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

    drop() {
        this.pos.y++;
        this.dropCounter = 0;
        if(this.arena.collide(this)) {
            this.pos.y--;
            this.arena.merge(this);
            this.reset();
            this.score += this.arena.sweep();
            this.events.emit('score', this.score);
            return true;    // return true when we collide
        }
        
        this.events.emit('pos', this.pos);
    }

    update(deltaTime) {
        this.dropCounter += deltaTime;
        if(this.dropCounter > this.dropInterval){
            this.drop();
        }
    }

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
        this.context.scale(20,20);
        
        this.arena = new Arena(12, 20);
        this.player = new Player(this);

        this.player.events.listen('score', score => {
            this.updateScore(score);
        });

        this.colors = [
            null, 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'grey'
        ];
        
        this.lastTime = 0;        
        this._update = (time = 0) => {
            const deltaTime = time - this.lastTime;
            this.lastTime = time;
    
            this.player.update(deltaTime);
    
            this.draw();
            requestAnimationFrame(this._update);
        }

        this.updateScore(0);
    }

    draw() {    
        this.context.fillStyle = '#000';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawMatrix(this.arena.matrix, {x: 0, y: 0});
        this.drawMatrix(this.player.matrix, this.player.pos);
    }

    drawMatrix(matrix, offset = {x:0,y:0} ) {
        matrix.forEach((row,y) => {
            row.forEach((value, x) => {
                if(value !== 0) {
                    this.context.fillStyle = this.colors[value];
                    this.context.fillRect(x+offset.x, y+offset.y, 1, 1);
                }
            });
        });
    }

    run() {
        this._update();
    }

    serialize() {
        return {
            arena: {
                matrix: this.arena.matrix,
            },
            player: {
                matrix: this.player.matrix,
                pos:    this.player.pos,
                score:  this.player.score
            }
        }
    }

    unserialize(state) {
        this.arena = Object.assign(state.arena);
        this.player = Object.assign(state.player);
        this.updateScore(this.player.score);
        this.draw();
    }
    
    updateScore(score){
        this.element.querySelector('.score').innerText = score;
    }

}
const tetrisManager = new TetrisManager(document);

const localTetris = tetrisManager.createPlayer();
localTetris.element.classList.add('local');
localTetris.run();

const connectionManager = new ConnectionManager(tetrisManager);
var HOST = location.origin.replace(/^http/, 'ws')
console.log("connecting to ", HOST);
connectionManager.connect(HOST);

const keyListener = e => {
    [
        [65, 68, 81, 87, 83, 32],   // a    d     q w  s    space
        [37, 39, 81, 38, 40, 32]    // left right q up down space
    ].forEach( (key, index) => {
        const player = localTetris.player;
        const arena = localTetris.arena;
        if( e.type === 'keydown') {
            if(e.keyCode === key[0]) { 
                player.move(-1);
            }
            else if(e.keyCode === key[1]) { 
                player.move(+1);
            }
            else if(e.keyCode === key[2]) {
                player.rotate(-1);
            }
            else if(e.keyCode === key[3]) {
                player.rotate(+1);
            }
            else if(e.keyCode === key[5]) {
                while(!player.drop()){
                    player;
                }
            }
        }
        
        if(e.keyCode === key[4]) {
            if(e.type === 'keydown' && player.dropInterval !== player.DROP_FAST) {
                player.drop();
                player.dropInterval = player.DROP_FAST;
            } 
            else 
                player.dropInterval = player.DROP_SLOW;
        }
    })
};

document.addEventListener('keydown', keyListener); 
document.addEventListener('keyup', keyListener);