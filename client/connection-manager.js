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
        player.events.listen('send-debuff', (debuff) => {
            this.send({
                type: 'send-debuff',
                debuffType: debuff.type,
                duration: debuff.duration
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
            var targettedPlayer = null;

            this.tetrisManager.instances.forEach( instance => {
                if(instance.element.id === data.targettedClient)
                    targettedPlayer = instance.player;
            })

            const targettedPeer = this.peers.get(data.targettedClient);

            if(!targettedPeer) {     // no targetted peers, so I am the target
                this.localTetris.player.applyDebuff(data);
            } else {
                // targettedPeer.player.applyDebuff(data);
                uxManager.applyUXDebuff(data, targettedPeer.element);
            }
            // this.localTetris.player.applyDebuff(data);
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

        if(stillPlaying.length < 2) { // one or zero player, there is a winner!
            const winnerName = stillPlaying.length ? stillPlaying[0].name : this.localTetris.player.name;
            document.getElementById('winner-label').innerText = " " + winnerName;
            document.getElementById('restart-game-container').style.display = "block";

            if(stillPlaying[0] === this.localTetris.player){
                document.getElementById('restart-game-btn').style.display = "block";
            }
        }
    }

    debuffForSinglePlayerGame() {
        const debuffInterval = 35000;
        const debuffs = [
            'HASTE',
            'KEYS-INVERTED',
            'ARENA-SWING',
            'ROTATING-PIECE',
            'ARENA-MINI',
            'RANDOM-PIECES'
        ];
        const durations = [0, 5000, 11000, 17000, 25000];
        window.setTimeout( () => {
            const debuffType = debuffs[getRandomInt(0, debuffs.length)];
            const duration = durations[getRandomInt(1, durations.length)];
            const debuff = {
                debuffType: debuffType,
                duration: duration
            };
            this.localTetris.player.applyDebuff(debuff);
            this.debuffForSinglePlayerGame();
        }, debuffInterval);
    }
    
}