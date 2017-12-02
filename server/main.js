// const express = require('express');
// const http = require('http');
const WebSocketServer = require('ws').Server;
const Session = require('./session');
const Client = require('./client');

// const INDEX = './test.html';
const PORT = 9000;
// const app = express()
//     .use((req, res) => res.sendFile(INDEX) )
    
// const verifyClient = (info) => {
//     console.log('Verify client')
//     return true
// }

// const httpServer = http.createServer(app);
// const server = new WebSocketServer({port: PORT});
const server = new WebSocketServer({ port: PORT });
// const server = new WebSocketServer('ws://epic-tetris-online.herokuapp.com:9000');


// httpServer.listen(PORT+1, function listening() {
//     console.log('Listening on %d', httpServer.address().port);
// });

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
        console.log('Message received', msg);
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
            const session = getSession(data.id) || createSession(data.id);
            session.join(client);

            client.state = data.state;

            broadcastSession(session);
        } else if(data.type === 'state-update') {
            const [prop, value] = data.entry;
            client.state[data.fragment][prop] = value;
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