function attachEventListeners() {

    let isMobile = false;
    const player = localTetris.player;

    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
        isMobile = true;
    }

    if(isMobile) {

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
                player.drop();
            }
        }
        handleMobileSpaceBar = function(e) {
            isMoving = true;
            if(!player.gameOver && localTetris.isStarted) {
                while(!player.drop()) {}
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
        
        var handleTouchStart = function(e) {
            firstX = e.touches[0].clientX;
            firstY = e.touches[0].clientY;
            e.preventDefault();
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
            // console.log("touch move " + touch.clientX + " " + touch.clientY);
            // console.log(touch.clientY, (firstY - dropSpaceY));
            
            if(touch.clientX > (firstX + minSpaceX)) {
                firstX = touch.clientX;
                handleModileRight(e);
            } else if(touch.clientX < (firstX - minSpaceX)) {
                firstX = touch.clientX;
                handleModileLeft(e);
            } else if(touch.clientY > (firstY + minSpaceY)) {
                firstY = touch.clientY;
                handleMobileDown(e);
            } else if(touch.clientY < (firstY - (dropSpaceY/2)) ) {
                isDropping = true;                
                if(touch.clientY < (firstY - dropSpaceY)) {
                    firstY = touch.clientY;
                    handleMobileSpaceBar(e);
                }
            } 
        }

        document.addEventListener('touchstart', handleTouchStart, {passive: false});
        document.addEventListener('touchmove', handleMove, {passive: false});
        document.addEventListener('touchend', handleTouchEnd, {passive: false});

    } else {

        const keys = [37, 39, 81, 38, 40, 32]    // left right q up down space
        const invertedKeys = [39, 37, 81, 40, 38, 32]    // left right q up down space

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

    }
}