/**
 * A player. This includes the matrix (piece) the player is moving, the tetris 
 * he is playing on, the arena he is playing on, the speed of the game and 
 * so on
 */
class Player {
    constructor(tetris){
        
        this.ORIGINAL_DROP_SLOW = 700;
        this.ORIGINAL_DROP_FAST = 35;
        this.DROP_SLOW = 700;
        this.DROP_FAST = 35;

        this.events = new Events();

        this.score = 0;
        this.amountOfBrokenRows = 0;
        this.pos = {x: 0, y: 0};
        this.matrix = null;            
        this.dropCounter = 0;
        this.dropInterval = this.DROP_SLOW;    // ms

        this.tetris = tetris;
        this.arena = tetris.arena;

        this.gameOver = false;
        this.name = '';

        this.invertedKeys = false;
        this.rotatingPieces = false;
        this.randomPieces = false;

        this.reset();
    }
    
    /**
     * Move a piece left or right
     * @param {Integer} dir +1 | -1 to move the player piece to the right
     * or to the left
     */
    move(dir) {
        this.pos.x += dir;
        if(this.arena.collide(this)) {
            this.pos.x -= dir;
            return;
        }

        this.events.emit('pos', this.pos);
    }

    /**
     * Reset the player piece because the previous piece has collided somewhere.
     * We re-create a piece randomly and position in the top center
     */
    reset() {
        let pieces = 'ILJOTSZ';
        this.matrix = this.createPiece(pieces[pieces.length * Math.random() | 0]);
        this.pos.y = 0;
        this.pos.x = (this.arena.matrix[0].length / 2 | 0) - (this.matrix[0].length / 2 | 0);
    
        if(this.arena.collide(this)) {  
            this.gameOver = true;
            this.events.emit('gameOver', true);

            // update self tetris view
            this.tetris.element.classList.add('game-over');
        }

        this.events.emit('pos', this.pos);
        this.events.emit('matrix', this.matrix);
    }

    /**
     * Rotate the piece of the player to the right or to the left based on dir input.
     * If the player could not rotate the piece due to collision we move left or right
     *  the piece to let it fit rotated.
     * @param {Integer} dir +1 | -1
     */
    rotate(dir) {
        const initialPos = this.pos.x;
        let offset = 1;
        this._rotateMatrix(this.matrix, dir);
        while(this.arena.collide(this)) {
            this.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if(offset > this.matrix[0].length) {
                this._rotateMatrix(this.matrix, -dir);
                this.pos.x = initialPos;
                return;
            }
        }

        this.events.emit('matrix', this.matrix);       
    }

    /**
     * Drop the player piece down by 1. If the piece collide we merge it with the arena
     * and call the reset method. Also if it collides we call an arena sweep and 
     * update the score.
     */
    drop() {
        this.pos.y++;

        if(this.rotatingPieces)
            this.rotate(+1);

        this.dropCounter = 0;
        if(this.arena.collide(this)) {
            
            // this.dropInterval = this.DROP_SLOW;     // Fix attempt of weird bug // commented because it "removes" HASTE
            
            // update position
            this.pos.y--;
            this.arena.merge(this);
            
            let sweepObj = this.arena.sweep();
            this.score += sweepObj.score;
            
            if(sweepObj.rows > 0) {
                this.amountOfBrokenRows += sweepObj.rows;
                this.changeSpeed(sweepObj.rows);            
            }

            if(sweepObj.rows) {
                this.sendDebuff(sweepObj.rows);
            }

            this.events.emit('score', this.score);
            
            this.reset();
            return true;    // return true when we collide (used to implement the space btn)
        }
        
        this.events.emit('pos', this.pos);
    }

    /**
     * Update the view if, from the last time is passed more than
     * "dropInterval" ms
     * @param {Integer} deltaTime passed time in ms
     */
    update(deltaTime) {
        this.dropCounter += deltaTime;
        if(this.dropCounter > this.dropInterval){
            this.drop();
        }
    }

    /**
     * Set the name of the player and emit an event to notify the other clients
     * @param {String} name 
     */
    setName(name) {
        this.name = name;
        this.events.emit('name', name);
    }

    // /**
    //  * Change the speed of the player based on the amount of broken rows of this turn.
    //  */
    // changeSpeed(brokenRows) {
    //     this.dropInterval -= (2 * brokenRows);
    //     this.DROP_SLOW -= (2 * brokenRows);  // maintain updated the DROP_SLOW constant
    //     console.log("Speed increased", this.dropInterval);
    // }
    /**
     * Change the speed of the player based on the amount of points that other players have.
     */
    changeSpeed(brokenRows) {
        let points = 0;
        for(let item of tetrisManager.instances.values()) {
            if(item.id !== this.tetris.id) {
                points += item.player.score;
            }
        }

        const speedAmount = points / 2; 
        this.dropInterval = this.ORIGINAL_DROP_SLOW - speedAmount;
        this.DROP_SLOW = this.ORIGINAL_DROP_SLOW - speedAmount;

        const speedAmountFast = Math.round(points / 100);
        this.DROP_FAST = this.ORIGINAL_DROP_FAST - speedAmountFast;
        // this.dropInterval -= (2 * brokenRows);
        // this.DROP_SLOW -= (2 * brokenRows);  // maintain updated the DROP_SLOW constant
        // console.log("Speed increased", this.dropInterval, this.DROP_FAST);
    }

    /**
     * Generic method to rotate a matrix, used to rotate pieces
     * @param {Array[Array[]]} matrix 
     * @param {Integer} dir +1 | -1 based on wanted rotation
     */
    _rotateMatrix(matrix, dir) {
        for(let y=0; y<matrix.length; ++y) {
            for(let x=0; x<y; ++x) {
                [
                    matrix[x][y],
                    matrix[y][x]
                ] = [
                    matrix[y][x],
                    matrix[x][y]
                ]
            }
        }

        if(dir > 0) 
            matrix.forEach(row => row.reverse());
        else 
            matrix.reverse();
    }

    sendDebuff(brokenRows) {
        const debuffs = [
            'HASTE',
            'KEYS-INVERTED',
            'ARENA-SWING',
            'ROTATING-PIECE',
            'ARENA-MINI',
            'RANDOM-PIECES'
        ];
        const durations = [0, 6000, 13000, 21000, 30000];
        const random = getRandomInt(0, debuffs.length);
        let debuff = {
            type: debuffs[random],
            duration: durations[brokenRows]
        }
        this.events.emit('send-debuff', debuff);
    }

    askRestartGame() {
        this.events.emit('restart-game');
    }

    applyDebuff(debuff) {
        let debuffType = debuff.debuffType;
        let duration = debuff.duration;
 
        if(debuffType === 'HASTE') {
            const factor = 2.5;    // 2.5x of speed
            this.dropInterval /= factor;
            this.DROP_FAST /= factor;
            console.log("HASTE START", this.dropInterval);
            setTimeout(() => {
                this.dropInterval *= factor;
                this.DROP_FAST *= factor;    
                console.log('HASTE ENEDED', this.dropInterval);
            }, duration)
        } else if(debuffType === 'KEYS-INVERTED') {
            this.invertedKeys = true;
            setTimeout(() => { this.invertedKeys = false }, duration);
        } else if(debuffType === 'ARENA-SWING') {
            var el = this.tetris.element.querySelector('.tetris');
            el.classList.add('rotate-debuff');
            setTimeout( () => {
                el.classList.remove('rotate-debuff');
            }, duration);
        } else if(debuffType === 'ROTATING-PIECE') {
            this.rotatingPieces = true;
            setTimeout( () => { this.rotatingPieces = false }, duration);            
        } else if(debuffType === 'ARENA-MINI') {
            var el = this.tetris.element.querySelector('.tetris');
            el.classList.add('small-debuff');
            setTimeout( () => {
                el.classList.remove('small-debuff');
            }, duration);
        } else if(debuffType === 'RANDOM-PIECES') {
            this.randomPieces = true;
            setTimeout( () => { this.randomPieces = false; }, duration);
        }

        uxManager.applyUXDebuff(debuff, this.tetris.element);
        
    }

    /**
     * TODO should implement a new class PieceType and make pieces there.
     * Create a piece of type and return it.
     * @param {String} type 
     */
    createPiece(type) {

        if(!this.randomPieces) {
            if(type === 'T') {
                return [
                    [0,7,0],
                    [7,7,7],
                    [0,0,0]
                ]
            } else if(type === 'O') {
                return [
                    [6,6],
                    [6,6]
                ];
            } else if(type === 'L'){
                return [
                    [5,0,0],
                    [5,5,5],
                    [0,0,0]
                ];
            } else if (type === 'J') {
                return [
                    [0,0,4],
                    [4,4,4],
                    [0,0,0]
                ];
            } else if(type === 'I') {
                return [
                    [0,0,0,0],
                    [3,3,3,3],
                    [0,0,0,0],
                    [0,0,0,0]
                ];
            } else if(type === 'S'){
                return [
                    [0,2,2],
                    [2,2,0],
                    [0,0,0]
                ];
            } else if(type === 'Z') {
                return [
                    [1,1,0],
                    [0,1,1],
                    [0,0,0]
                ];
            }
        } else {
            let counter = 8;
            let piece = [[],[],[]];
            let atLeastOne = false;
            while(counter >= 0) {
                const empty = Math.random() < 0.5;
                const num = empty ? 0 : getRandomInt(1,8);

                if(!empty) {
                    atLeastOne = true;
                }

                const row =  Math.floor(counter / 3);
                const column = counter % 3;
                piece[row][column] = num;
                
                counter--;
            }

            if(!atLeastOne) {   // all empty, must insert at least 1 square
                piece[0][0] = 1;
            }
            
            return piece;
        }
    }
}