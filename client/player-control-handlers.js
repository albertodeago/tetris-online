function attachEventListeners() {

    const player = localTetris.player;

    if(!window.isMobile) {

        const keys = [37, 39, 81, 38, 40, 32]            // left  right q up   down space
        const invertedKeys = [39, 37, 81, 40, 38, 32]    // right left  q down up   space

        function pressedUp(player, e) {
            player.rotate(+1);
        }
        function pressedDown(player, e) {
            if(e.type === 'keydown' && player.dropInterval !== player.DROP_FAST) {
                player.dropInterval = player.DROP_FAST;
                player.drop();
            } 
            else {
                player.dropInterval = player.DROP_SLOW;
            }
        }

        const keyListener = e => {
            [
                keys
            ].forEach( (key, index) => {
                
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

        document.addEventListener('keydown', keyListener); 
        document.addEventListener('keyup', keyListener);

    } else {    

        /******************* MOBILE CONTROLS ********************/
        
        handleModileLeft = function(e) {
            isMoving = true;
            if(!player.gameOver && localTetris.isStarted && !isDropping) { 
                player.move(-1);
            }
        }
        handleModileRight = function(e) {
            isMoving = true;
            if(!player.gameOver && localTetris.isStarted && !isDropping) { 
                player.move(+1);
            }
        }
        handleMobileDown = function(e) {
            isMoving = true;
            isDropping = true;
            if(!player.gameOver && localTetris.isStarted) { 
                const collided = player.drop();
                if(collided) {
                    // "reset" values to prevent multiple pieces to go down
                    firstX = null;
                    firstY = null;
                }
            }
        }
        handleMobileSpaceBar = function(e) {
            isMoving = true;
            if(!player.gameOver && localTetris.isStarted) {
                while(!player.drop()) {}
                // "reset" values to prevent multiple pieces to go down
                firstX = null;
                firstY = null;
            }
        }
        handleMobileRotation = function() {
            if(!player.gameOver && localTetris.isStarted) { 
                player.rotate(+1);
            }
        }

        const deviceX = document.documentElement.clientWidth;
        const deviceY = document.documentElement.clientHeight;
        console.log("Mobile viewport:", deviceX, deviceY);

        const nSquareX = 12;
        const nSquareY = 20;
        const minSpaceX = deviceX / (nSquareX * 2);
        const minSpaceY = deviceY / (nSquareY * 2);  // space to drop the piece by 1 
        const dropSpaceY = deviceY / 4;        // space to drop totally the piece

        let firstX = null;
        let firstY = null;
        let isMoving = false;
        let isDropping = false;
        
        /**
         * touch start, if the element is not 'clickable' we save the coordinates of 
         * the touch and then prevent the propagation of the event, otherwise
         * just normal touch behviour
         * @param {Event} e 
         */
        var handleTouchStart = function(e) {
            if(!e.target.classList.contains('clickable') && !e.target.classList.contains('mdl-button__ripple-container')) {
                firstX = e.touches[0].clientX;
                firstY = e.touches[0].clientY;
                e.preventDefault();
            }
        }

        var handleTouchEnd = function(e) {
            firstX = null;
            firstY = null;
            if(!isMoving) {
                handleMobileRotation();
            }
            isMoving = false;
            isDropping = false;
        }

        var handleMove = function(e){
            let touch = e.touches[0];
            
            if(firstX && firstY) {
                if(touch.clientX > (firstX + minSpaceX)) {
                    firstX = touch.clientX;
                    if(!player.invertedKeys) {
                        handleModileRight(e);
                    } else {
                        handleModileLeft(e);
                    }
                } else if(touch.clientX < (firstX - minSpaceX)) {
                    firstX = touch.clientX;
                    if(!player.invertedKeys) {
                        handleModileLeft(e);
                    } else {
                        handleModileRight(e);
                    }
                } else if(touch.clientY > (firstY + minSpaceY)) {
                    firstY = touch.clientY;
                    if(!player.invertedKeys) {
                        handleMobileDown(e);
                    } else {
                        handleMobileSpaceBar(e);
                    }                    
                } else if(touch.clientY < (firstY - (dropSpaceY/2)) ) {
                    isDropping = true;                
                    if(touch.clientY < (firstY - dropSpaceY)) {
                        firstY = touch.clientY;
                        if(!player.invertedKeys) {
                            handleMobileSpaceBar(e);
                        } else {
                            handleMobileDown(e);
                        }
                    }
                } 
            }
        }

        document.addEventListener('touchstart', handleTouchStart, {passive: false});
        document.addEventListener('touchmove', handleMove, {passive: false});
        document.addEventListener('touchend', handleTouchEnd, {passive: false});

    }
}