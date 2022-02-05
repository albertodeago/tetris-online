const gulp = require('gulp');
const concat = require('gulp-concat');

/**
 * Bundle js in a single file 
 */

// files to concatenate to create the "client" bundle
var files = [
    './client/tetris-manager.js',
    './client/connection-manager.js',
    './client/ux-manager.js',
    './client/arena.js',
    './client/events.js',
    './client/player.js',
    './client/tetris.js',
    './client/player-control-handlers.js',
    './client/main.js',
];
gulp.task('bundle-js', () => { //  TODO minify
    return gulp.src(files)
        .pipe(concat('bundle.js'))
        .pipe(gulp.dest('./server/dist/'))
});

/**
 * Copy styles and assets
 */
gulp.task('copy-style', function(cb) {
    gulp.src('./style.css')
        .pipe(gulp.dest('./server/dist/'));
    cb()
});
gulp.task('copy-style-mobile', function(cb) {
    gulp.src('./style-mobile.css')
        .pipe(gulp.dest('./server/dist/'));
    cb()
});
gulp.task('copy-style-animations', function(cb) {
    gulp.src('./style-animations.css')
        .pipe(gulp.dest('./server/dist/'));
    cb()
});
gulp.task('copy-images', function(cb) {
    gulp.src('./images/*.png')
        .pipe(gulp.dest('./server/dist/images/'));
    cb()
});


/**
 * Bundle js and copy style
 */
gulp.task('bundle', (cb) => {
    gulp.series(
        'bundle-js',
        'copy-style',
        'copy-style-mobile',
        'copy-style-animations',
        'copy-images'
    )();
    cb()
});