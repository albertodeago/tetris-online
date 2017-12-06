class Client {
    constructor(conn, id) {
        this.conn = conn;
        this.session = null;
        this.id = id;

        this.state = null;
    }

    broadcast(data) {
        if(!this.session) 
            throw new Exception('Cannot broadcast without a session');
        
        data.clientId = this.id;

        this.session.clients.forEach( client => {
            if(this === client) {   // not sending msg to myself
                return;
            }
            client.send(data);
        })
    }

    // superBroadcast(data) {
    //     if(!this.session) 
    //         throw new Exception('Cannot broadcast without a session');

    //         this.session.clients.forEach( client => { client.send(data) });
    // }

    send(data) {
        const msg = JSON.stringify(data);
        // console.log('Sending message', msg);
        this.conn.send(msg, function ack(err) {
            if(err) {
                console.error('Message failed', msg, err);
            }
        });
    }
}

module.exports = Client;