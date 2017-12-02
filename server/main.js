const express = require('express');
const WebSocketServer = require('ws').Server;
const path = require('path');
const Session = require('./session');
const Client = require('./client');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, '../index.html');
const STYLE = path.join(__dirname, '../style.css');
const BUNDLE = path.join(__dirname + '/dist/bundle.js');

const httpServer = express()
    .use('/index.html', (req, res) => res.sendFile(INDEX))
    .use('/dist/style.css', (req, res) => res.sendFile(STYLE))
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

server.on('connection', conn => {
    console.log('Connection established');
    const client = createClient(conn);

    conn.on('message', msg => {
        // console.log('Message received', msg);
        const data = JSON.parse(msg);

        if(data.type === 'create-session') {
            const session = createSession();
            session.join(client);

            client.state = data.state;
            client.send({
                type: 'session-created', 
                id: session.id
            });
        } else if(data.type === 'join-session') {
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
        } else if(data.type === 'state-update') {
            const [prop, value] = data.entry;
            client.state[data.fragment][prop] = value;
            client.broadcast(data);
        } else if(data.type === 'start-game') {
            // we simply send the message to every player
            client.broadcast(data);
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