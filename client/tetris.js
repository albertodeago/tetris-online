class Tetris {

    constructor(element, id) {
        this.element = element;
        this.canvas = element.querySelector('.tetris');;
        this.context = this.canvas.getContext('2d');
        this.context.scale(30,30);
        
        this.id = id;

        this.arena = new Arena(12, 20);
        this.player = new Player(this);

        this.player.events.listen('score', score => {
            this.updateScore(score);
        });

        this.colors = this.generateRandomPlayerColors();
        // [
        //     null, 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'grey'
        // ];     

        this.isStarted = false;
        
        this.lastTime = 0;
        this._update = (time = 0) => {
            const deltaTime = time - this.lastTime;
            this.lastTime = time;
    
            if(!this.player.gameOver)
                this.player.update(deltaTime);
    
            this.draw();
            requestAnimationFrame(this._update);
        }

        this.updateScore(0);
    }

    /**
     * Draw both the arena and the player piece
     */
    draw() {    
        this.context.fillStyle = '#000';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawMatrix(this.arena.matrix, {x: 0, y: 0});
        this.drawMatrix(this.player.matrix, this.player.pos);
    }

    /**
     * Draw a piece or the arena in the canvas. It's an helper function 
     * used by Draw method
     * @param {Array[Array[]]} matrix the piece to draw
     * @param {Object} offset an object with x and y properties that
     * determinize the offset (with 0 0 being the top left) of the matrix
     * to draw in the tetris
     */
    drawMatrix(matrix, offset = {x:0,y:0} ) {
        matrix.forEach((row,y) => {
            row.forEach((value, x) => {
                if(value !== 0) {
                    let ctx = this.context;

                    ctx.fillStyle = this.colors[value];
                    ctx.fillRect(x+offset.x, y+offset.y, 1, 1);                

                    ctx.lineWidth="0.05";
                    ctx.strokeStyle="#000";
                    ctx.strokeRect(x+offset.x, y+offset.y, 1, 1); 
                }
            });
        });
    }

    /**
     * Function called to start the tetris. We show a message that the 
     * game is starting in 5 seconds and then actually start the tetris.
     */
    run() {
        document.getElementById('waiting-game').style.display = "block";
        let waitingLabelEl = document.getElementById('waiting-label');
        waitingLabelEl.classList.add('mdl-color-text--accent');
        waitingLabelEl.style.fontSize = '35px';
        document.getElementById('start-game-btn').style.display = "none";

        // check if it's a single player game
        if(tetrisManager.instances.size === 1) {
            connectionManager.debuffForSinglePlayerGame();
        }

        const maxTime = 7;
        const secondsToWait = [1,2,3,4,5,6,7];
        this.showRemainingTime(maxTime);
        secondsToWait.forEach( (time, index) => {
            setTimeout(() => {
                if(maxTime !== time) 
                    this.showRemainingTime(maxTime - time);
                else {
                    document.getElementById('start-game-container').style.display = "none";
                    this.isStarted = true;
                    this._update();
                    this.setPlayerName(document.getElementById('input-player-name').value);
                }
            }, time*1000);
        })
    }

    /**
     * Helper function to show the countdown before start of game
     * @param {Integer} time number to show in the string "starting in {time}"
     */
    showRemainingTime(time) {
        document.getElementById('waiting-label').innerText = "Starting in " + time;
    }

    /**
     * Serialize objects to send throught websocket
     */
    serialize() {
        return {
            arena: {
                matrix: this.arena.matrix,
            },
            player: {
                matrix:     this.player.matrix,
                pos:        this.player.pos,
                score:      this.player.score,
                gameOver:   this.player.gameOver
            }
        }
    }

    /**
     * Given a state of a tetris serialized, deserialize it and 
     * assign the properties to the instance of tetris (this is used 
     * when a used joins a game)
     * @param {Object} state 
     */
    unserialize(state) {
        this.arena = Object.assign(state.arena);
        this.player = Object.assign(state.player);
        this.updateScore(this.player.score);
        this.draw();
    }
    
    /**
     * Update the score view of the instance tetris
     * @param {Integer} score 
     */
    updateScore(score){
        this.element.querySelector('.score').innerText = score;
    }
    
    /**
     * Set the name of the player or generate a random one if missing parameter
     * @param {String} name 
     */
    setPlayerName(name) {
        name = name || 'Unnamed player';    // TODO create random cool names ?
        this.element.querySelector('.name').innerText = name;
        
        // if the setName function is defined means that the player we are talking about
        // is the local player, so we call the right setName method
        // otherwise is a peer (another player), so we simply set the property
        if(this.player.setName) {
            createCookie('player-name', name, 30);
            this.player.setName(name);
        } else {
            this.player.name = name;
        }
    }

    generateRandomPlayerColors() {
        const letters = '0123456789ABCDEF';
        let colors = [null];

        while(colors.length < 8) {
            let chars = [];

            while(chars.length < 3) {
                let color = '';
                color += letters[Math.floor(Math.random() * letters.length)];
                color += letters[Math.floor(Math.random() * letters.length)];
                
                chars.push(color);
            }

            const _1 = parseInt(chars[0], 16);
            const _2 = parseInt(chars[1], 16);
            const _3 = parseInt(chars[2], 16);
            const _min = parseInt('30', 16);
            if(_1 < _min && _2 < _min & _3 < _min) {
                return this.generateRandomPlayerColors();
            }

            colors.push( '#' + chars[0] + chars[1] + chars[2]);
        }

        return colors;
    }

}