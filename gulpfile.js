const gulp = require('gulp');
const concat = require('gulp-concat');

/**
 * Bundle js in a unic file 
 */
// files to concatenate to create the "client" bundle
var files = [
    './client/tetris-manager.js', 
    './client/connection-manager.js', 
    './client/arena.js', 
    './client/events.js', 
    './client/player.js', 
    './client/tetris.js', 
    './client/main.js', 
];
gulp.task('bundle-js', () => {          //  TODO minify
    return gulp.src(files)
        .pipe(concat('bundle.js'))
        .pipe(gulp.dest('./server/dist/'))
});

/**
 * Copy style
 */
gulp.task('copy-style', function () {
    gulp.src('./style.css')
        .pipe(gulp.dest('./server/dist/'));
});


/**
 * Bundle js and copy style
 */
gulp.task('bundle', () => {
    gulp.start('bundle-js', 'copy-style');
});