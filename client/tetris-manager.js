class TetrisManager {

    constructor(document) {

        this.document = document;
		this.template = document.getElementById('player-template');
		this.playersContainer = document.getElementById('players-wrapper');

        this.instances = new Set;
        
    }

    /**
     * Create a tetris instance in the page, can be the local player or 
     * another player
     * @param {String} clientId 
     */
    createPlayer(clientId) {
        const element = this.document
            .importNode(this.template.content, true)
            .children[0];
        if(clientId)
            element.setAttribute("id", clientId);
        
        const tetris = new Tetris(element);            
        this.instances.add(tetris);

        this.playersContainer.appendChild(tetris.element);
            
        return tetris;
    }

    removePlayer(tetris) {
        this.instances.delete(tetris);
        this.playersContainer.removeChild(tetris.element);
    }
    
    sortPlayers(tetri) {
        tetri.forEach(tetris => {
            this.playersContainer.appendChild(tetris.element);
        });
    }

    /**
     * Set the id assigned by the connection manager to the element 
     * of the Tetris passed as parameter
     * @param {Tetris} tetris 
     */
    setIdToTetris(tetris, clientId) {
        if(!tetris.element.id)
            tetris.element.setAttribute('id', clientId);
    }
}