/**
 * The arena is the field a player is playing in, basically is a big matrix 
 */
class Arena {
    constructor(w, h) {
        const matrix = [];
        while(h--) {
            matrix.push(new Array(w).fill(0));
        }
        this.matrix = matrix;

        this.events = new Events;
    }

    /**
     * Check if the plyer piece collides with something in the arena.
     * @param {Player} player 
     */
    collide(player) {
        const [m, o] = [player.matrix, player.pos];
        for(let y=0; y<m.length; ++y) {
            for(let x=0; x < m[y].length; ++x) {
                if(m[y][x] !== 0 && (this.matrix[y + o.y] && this.matrix[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Merge the player piece with the arena. Basically is the method that "immobilize" 
     * pieces that collides with the arena
     * @param {Player} player 
     */
    merge(player) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if(value !== 0) {
                    this.matrix[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
        
        this.events.emit('matrix', this.matrix);
    }

    /**
     * Method that checks if there are full rows in the arena and erase them. 
     * It returns a score based on the amount of rows erased.
     * @returns {Integer} the score obtained by the sweep
     */
    sweep() {
        let amountOfRows = 0;   // amount of rows that the sweeps has removed
        let multiplier = 1;     // multiplier for score
        let score = 0;          // score to return
        outer: for(let y=this.matrix.length -1; y>0; --y){
            for(let x = 0; x<this.matrix[y].length; ++x ){
                if(this.matrix[y][x] === 0) {
                    continue outer;   // row not filled, continue to next row (the first for)
                }
            }
            
            // remove the filled row, fill it with 0 and repush onto the ren
            const row = this.matrix.splice(y, 1)[0].fill(0); 
            this.matrix.unshift(row);
            ++y;
    
            amountOfRows++;
            score += multiplier * 10;
            multiplier *= 2;
        }
        
        this.events.emit('matrix', this.matrix);
        return {score: score, rows: amountOfRows};
    }

    /**
     * Clear the arena, game is over!
     */
    clear() {
        this.matrix.forEach( row => { row.fill(0); });
        this.events.emit('matrix', this.matrix);
    }
}