const tetrisManager = new TetrisManager(document);

const localTetris = tetrisManager.createPlayer();
localTetris.element.classList.add('local');
localTetris.run();

const connectionManager = new ConnectionManager(tetrisManager);
connectionManager.connect('ws://192.168.1.105:9000');

const keyListener = e => {
    [
        [65, 68, 81, 87, 83],   // a    d     q w  s
        [37, 39, 81, 38, 40]    // left right q up down
    ].forEach( (key, index) => {
        const player = localTetris.player;
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
        }
        
        if(e.keyCode === key[4]) {
            if(e.type === 'keydown' && player.dropInterval !== player.DROP_FAST) {
                player.drop();
                player.dropInterval = player.DROP_FAST;
            } 
            else 
                player.dropInterval = player.DROP_SLOW;
        }
        // TODO add space event
    })
};

document.addEventListener('keydown', keyListener); 
document.addEventListener('keyup', keyListener);