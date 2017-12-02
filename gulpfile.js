const gulp = require('gulp');
const concat = require('gulp-concat');

var files = [
    './client/tetris-manager.js', 
    './client/connection-manager.js', 
    './client/arena.js', 
    './client/events.js', 
    './client/player.js', 
    './client/tetris.js', 
    './client/main.js', 
];
gulp.task('bundle', function() {
  return gulp.src(files)
    .pipe(concat('bundle.js'))
    .pipe(gulp.dest('./server/dist/'));
});