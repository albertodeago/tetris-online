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

        ['pos', 'score', 'matrix', 'gameOver'].forEach( prop => {
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
        } else {
            tetris.draw();
        }

        if(tetris.player.gameOver === true) {
            let el = document.getElementById(id);
            el.classList.add('game-over');
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