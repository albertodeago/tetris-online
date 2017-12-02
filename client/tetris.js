class Tetris {

    constructor(element) {
        this.element = element;
        this.canvas = element.querySelector('.tetris');;
        this.context = this.canvas.getContext('2d');
        this.context.scale(30,30);
        
        this.arena = new Arena(12, 20);
        this.player = new Player(this);

        this.player.events.listen('score', score => {
            this.updateScore(score);
        });

        this.colors = [
            null, 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'grey'
        ];

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
                    this.context.fillStyle = this.colors[value];
                    this.context.fillRect(x+offset.x, y+offset.y, 1, 1);
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
        document.getElementById('start-game-btn').style.display = "none";
        const maxTime = 5;
        const secondsToWait = [1,2,3,4,5];
        this.showRemainingTime(5);
        secondsToWait.forEach( (time, index) => {
            setTimeout(() => {
                if(maxTime !== time) 
                    this.showRemainingTime(maxTime - time);
                else {
                    document.getElementById('start-game-container').style.display = "none";
                    this.isStarted = true;
                    this._update();
                }
            }, time*1000);
        })
    }

    /**
     * Helper function to show the countdown before start of game
     * @param {Integer} time number to show in the string "starting in {time}"
     */
    showRemainingTime(time) {
        document.getElementById('waiting-game').innerText = "Starting in " + time;
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

}