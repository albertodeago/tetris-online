const express = require('express');
const WebSocketServer = require('ws').Server;
const path = require('path');
const Session = require('./session');
const Client = require('./client');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, '../index.html');
const STYLE = path.join(__dirname, '../style.css');
const STYLE_MOBILE = path.join(__dirname, '../style-mobile.css');
const STYLE_ANIMATIONS = path.join(__dirname, '../style-animations.css');
const DEBUFF_HASTE_IMG = path.join(__dirname, '../images/haste.png');
const DEBUFF_KEYS_INVERTED_IMG = path.join(__dirname, '../images/keys-inverted.png');
const DEBUFF_ARENA_SWING_IMG = path.join(__dirname, '../images/arena-swing.png');
const DEBUFF_ROTATING_PIECE_IMG = path.join(__dirname, '../images/rotating-piece.png');
const DEBUFF_ARENA_MINI_IMG = path.join(__dirname, '../images/arena-mini.png');
const DEBUFF_RANDOM_PIECES_IMG = path.join(__dirname, '../images/random-pieces.png');
const BUNDLE = path.join(__dirname + '/dist/bundle.js');

const httpServer = express()
    .use('/index.html', (req, res) => res.sendFile(INDEX))
    .use('/dist/style.css', (req, res) => res.sendFile(STYLE))
    .use('/dist/style-mobile.css', (req, res) => res.sendFile(STYLE_MOBILE))
    .use('/dist/style-animations.css', (req, res) => res.sendFile(STYLE_ANIMATIONS))
    .use('/dist/images/haste.png', (req, res) => res.sendFile(DEBUFF_HASTE_IMG))
    .use('/dist/images/keys-inverted.png', (req, res) => res.sendFile(DEBUFF_KEYS_INVERTED_IMG))
    .use('/dist/images/arena-swing.png', (req, res) => res.sendFile(DEBUFF_ARENA_SWING_IMG))
    .use('/dist/images/rotating-piece.png', (req, res) => res.sendFile(DEBUFF_ROTATING_PIECE_IMG))
    .use('/dist/images/arena-mini.png', (req, res) => res.sendFile(DEBUFF_ARENA_MINI_IMG))
    .use('/dist/images/random-pieces.png', (req, res) => res.sendFile(DEBUFF_RANDOM_PIECES_IMG))
    .use('/dist/bundle.js', (req, res) => res.sendFile(BUNDLE))
    .listen(PORT, () => console.log('Listening on ' + PORT));

const server = new WebSocketServer({ server: httpServer });

const sessions = new Map;

function createId(len=6, chars='abcdefghijklmnopqrstwxyz123456789') {
    let id = '';
    while(len--) {
        id += chars[Math.random()*chars.length | 0];
    }
    return id;
}

function createClient(conn, id=createId()) {
    return new Client(conn, id);
}

function createSession(id = createId()) {
    if(sessions.has(id)) 
        throw new Error('Session '+ id + ' already exists');
    
    const session = new Session(id);
    console.log("Creating new session", session);
    sessions.set(id, session);

    return session;
}

function getSession(id){
    return sessions.get(id);
}

function broadcastSession(session) {
    const clients = [...session.clients];

    clients.forEach( c => {
        c.send({
            type: 'session-broadcast',
            peers: {
                you: c.id,
                clients: clients.map(client => {
                    return {
                        id: client.id,
                        state: client.state
                    }
                })
            }
        })
    });
}

function sendDebuffToRandomClient(sender, msg) {
    const session = sender.session;
    const clients = [...session.clients]; 
    const possibleClients = clients.filter( (c) => { 
        return (c.id !== sender.id && c.state.player.gameOver !== true) 
    });
    
    const unfortunateClient = possibleClients[ getRandomInt(0, possibleClients.length) ];

    // Send debuff only if there is at least 1 player to send to
    if(unfortunateClient) {  
        unfortunateClient.send(msg);
    }
}

function getRandomClientExceptMe(sender) {
    const session = sender.session;
    const clients = [...session.clients]; 
    const possibleClients = clients.filter( (c) => { 
        return (c.id !== sender.id && c.state.player.gameOver !== true) 
    });

    if(possibleClients.length) {
        return possibleClients[ getRandomInt(0, possibleClients.length) ];
    } 

    return null;
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; 
}

server.on('connection', conn => {
    console.log('Connection established');
    const client = createClient(conn);

    conn.on('message', msg => {
        //console.log('Message received', msg);
        const data = JSON.parse(msg);

        if(data.type !== 'state-update') {
            // console.log("received ", msg);
        }

        if(data.type === 'create-session') {
            const session = createSession();
            session.join(client);

            client.state = data.state;
            client.send({
                type: 'session-created', 
                id: session.id
            });
        } 
        
        else if(data.type === 'join-session') {
            let session = getSession(data.id);
            // if the session is not existend we create new one with tht id
            if(!session) {  
                session = createSession(data.id);
                client.send({
                    type: 'session-created', 
                    id: session.id
                });
            }
            session.join(client);

            client.state = data.state;

            broadcastSession(session);
        } 
        
        else if(data.type === 'state-update') {
            const [prop, value] = data.entry;
            client.state[data.fragment][prop] = value;
            client.broadcast(data);
        } 
        
        else if(data.type === 'start-game') {
            // we simply send the message to every player
            client.broadcast(data);
        } 

        else if(data.type === 'restart-game') {
            let sessionId = client.session.id;
            while(getSession(sessionId)){
                sessionId = createId();
            }

            // got a unique sessionId, send to all clients so then can join new that session
            client.superBroadcast({
                type: 'go-to-session',
                id: sessionId
            });
        }
        
        else if(data.type === 'send-debuff') {
            var targettedClient = getRandomClientExceptMe(client);

            if(targettedClient) {
                // console.log("sending a debuff from " + client.id + ".. target -> " + targettedClient.id);
                const msgToSend = {
                    type: 'apply-debuff',
                    debuffType: data.debuffType,
                    duration: data.duration,
                    targettedClient: targettedClient.id
                };
                client.superBroadcast(msgToSend);
            }
            
            // sendDebuffToRandomClient(client, msgToSend);
        }
    })

    conn.on('close', () => {
        console.log('Connection closed');
        const session = client.session;
        if(session) {
            session.leave(client);
            
            if(session.clients.size === 0) {
                sessions.delete(session.id);
            }
        }

        broadcastSession(session);
    });
})