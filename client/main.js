const tetrisManager = new TetrisManager(document);

const localTetris = tetrisManager.createPlayer();
localTetris.element.classList.add('local');
// localTetris.run();

const connectionManager = new ConnectionManager(tetrisManager);
var HOST = location.origin.replace(/^http/, 'ws')
console.log("connecting to ", HOST);
connectionManager.connect(HOST);

const keys = [37, 39, 81, 38, 40, 32]    // left right q up down space
const invertedKeys = [39, 37, 81, 40, 38, 32]    // left right q up down space
const keyListener = e => {
    [
        keys
    ].forEach( (key, index) => {
        const player = localTetris.player;
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

function startGame() {    
    // send a message to other players to start the game
    localTetris.player.events.emit('start-game');

    // start also the local game
    if(!localTetris.isStarted)
        localTetris.run();
}

//The maximum is exclusive and the minimum is inclusive
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; 
}

var isMobile = false;
if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    isMobile = true;
}

if(isMobile) {
    
    // TODO se è un "tap" player.rotate
    // TODO se è un touchMove e si muove più di un tot player.move
    // TODO se è un touchMove verso il basso di un tot while(!player.drop()) { }

    var mobile_left = document.getElementById('mobile-control-left');
    var mobile_right = document.getElementById('mobile-control-right');
    var mobile_up = document.getElementById('mobile-control-up');
    var mobile_down = document.getElementById('mobile-control-down');
    var mobile_space = document.getElementById('mobile-control-space');
    
    handleModileLeft = function(e) {
        const player = localTetris.player;
        if(!player.gameOver && localTetris.isStarted) { 
            player.move(-1);
            e.preventDefault();
        }
    }
    
    mobile_left.addEventListener("touchend", handleModileLeft, false);

} else {

    document.addEventListener('keydown', keyListener); 
    document.addEventListener('keyup', keyListener);

}