const gulp = require('gulp');
const concat = require('gulp-concat');

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
gulp.task('bundle', () => {
  return gulp.src(files)
    .pipe(concat('bundle.js'))
    .pipe(gulp.dest('./server/dist/'));
});