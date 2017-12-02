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
        [37, 39, 81, 38, 40, 32]    // left right q up down space
    ].forEach( (key, index) => {
        const player = localTetris.player;
        const arena = localTetris.arena;
        if(!player.gameOver) { 
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
                    while(!player.drop()) { }
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
        }
    })
};

document.addEventListener('keydown', keyListener); 
document.addEventListener('keyup', keyListener);