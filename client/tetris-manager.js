class TetrisManager {

    constructor(document) {

        this.document = document;
		this.template = document.getElementById('player-template');
        this.playersContainer = document.getElementById('players-wrapper');
        this.localPlayerContainer = document.getElementById('local-player');
        this.otherPlayersContainer = document.getElementById('other-players');

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
        
        const tetris = new Tetris(element, clientId);
        this.instances.add(tetris);

        if(clientId) {
            this.otherPlayersContainer.appendChild(tetris.element);
            this.recalculateTetriHeights();
        } else {
            this.localPlayerContainer.appendChild(tetris.element);
        }
            
        return tetris;
    }

    removePlayer(tetris) {
        this.instances.delete(tetris);
        this.otherPlayersContainer.removeChild(tetris.element);
        this.recalculateTetriHeights();
    }
    
    // sortPlayers(tetri) {
    //     tetri.forEach(tetris => {
    //         this.playersContainer.appendChild(tetris.element);
    //     });
    // }

    /**
     * Set the id assigned by the connection manager to the element 
     * of the Tetris passed as parameter
     * @param {Tetris} tetris 
     */
    setIdToTetris(tetris, clientId) {
        if(!tetris.element.id) {
            tetris.element.setAttribute('id', clientId);
            tetris.id = clientId;
        }
    }

    recalculateTetriHeights() {
        let otherPlayersTetri = document.querySelectorAll('.player:not(.local)');
        let newHeight = '';
        if(otherPlayersTetri.length === 1) {    // TODO move this logic into a "ViewHandler" function
            newHeight = '85%';
        } else if(otherPlayersTetri.length < 5) {
            newHeight = '50%';
        } else if(otherPlayersTetri.length < 10) {
            newHeight = '33%';
        } else {
            newHeight = '30%';
        }
        otherPlayersTetri.forEach( el => el.style.height = newHeight );
    }
}