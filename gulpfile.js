(function() {
  "use strict";

  var del          = require('del');
  var runSequence  = require('run-sequence');
  var merge        = require('event-stream').merge;
  var gulp         = require('gulp');
  var plumber      = require('gulp-plumber');
  var concat       = require('gulp-concat');
  var minifyHtml   = require('gulp-minify-html');
  var compass      = require('gulp-compass');
  var autoprefixer = require('gulp-autoprefixer');
  var csscomb      = require('gulp-csscomb');
  var minifyCss    = require('gulp-minify-css');
  var jshint       = require('gulp-jshint');
  var babel        = require('gulp-babel');
  var uglify       = require('gulp-uglify');
  var stripDebug   = require('gulp-strip-debug');
  var usemin       = require('gulp-usemin');
  var jsonminify   = require('gulp-jsonminify');
  var rename       = require("gulp-rename");
  var replace      = require('gulp-replace');
  var zip          = require('gulp-zip');

  var uglify_options = {
    mangle: {
      chrome: false,
    },
    compress: {
    },
    sourcemap: false,
  };

  gulp.task('clean-debug', callback => {
    return del(['src/manifest.json', 'src/css'], callback);
  });

  gulp.task('clean-build', ['clean-tmp'], callback => {
    return del(['dist', 'archive.zip'], callback);
  });

  gulp.task('clean-tmp', callback => {
    return del(['tmp'], callback);
  });

  gulp.task('copy-build', () => {
    return merge(
      gulp.src('src/_locales/**/*.json', { base: 'src' })
      .pipe(plumber())
      .pipe(gulp.dest('dist')),
      gulp.src([
        'src/img/icons/**/*.+(png|svg)',
        '!src/img/icons/icon.svg',
        '!**/*.+(md|pdf)'],
        { base: 'src' })
      .pipe(plumber())
      .pipe(gulp.dest('dist')),
      gulp.src('src/History.txt', { base: 'src' })
      .pipe(plumber())
      .pipe(gulp.dest('dist'))
    );
  });

  gulp.task('compass-debug', () => {
    return gulp.src('src/sass/*.scss', { base: 'src' })
           .pipe(plumber())
           .pipe(compass({
             css:         'src/css',
             sass:        'src/sass',
             environment: 'development',
             comments:    true,
             sourcemap:   true,
           }));
  });

  gulp.task('compass-build', () => {
    return gulp.src('src/sass/*.scss', { base: 'src' })
           .pipe(plumber())
           .pipe(compass({
             css:         'src/css',
             sass:        'src/sass',
             environment: 'production',
             style:       'compressed',
           }));
  });

  gulp.task('autoprefixer', () => {
    return gulp.src(['src/css/*.css', '!src/**/*.min.css'], { base: 'src' })
           .pipe(plumber())
           .pipe(autoprefixer({
             browsers: [ 'last 2 Chrome versions' ],
           })
           .pipe(gulp.dest('src')));
  });

  gulp.task('csscomb', () => {
    return gulp.src(['src/css/*.css', '!src/**/*.min.css'], { base: 'src' })
           .pipe(plumber())
           .pipe(csscomb())
           .pipe(gulp.dest('src'));
  });

  gulp.task('clean-css', () => {
    return gulp.src('src/css/*.css', { base: 'src' })
           .pipe(plumber())
           .pipe(minifyCss())
           .pipe(gulp.dest('src'));
  });

  gulp.task('replace-debug', () => {
    return gulp.src('src/manifest_base.json')
    .pipe(plumber())
    .pipe(replace('@@extensionTitleDebug', ' Debug'))
    .pipe(replace('@@backgroundScripts',
      '["js/common.js", "js/common_func.js",' +
      ' "js/indexedDB.js", "js/purge.js"]'))
    .pipe(replace('@@contentScripts',
      '["js/common.js", "js/common_func.js", ' +
      '"js/content_scripts/keybind.js", ' +
      '"js/content_scripts/excludeDialog.js", ' +
      '"js/content_scripts/formCache.js"]'))
    .pipe(rename('manifest.json'))
    .pipe(gulp.dest('src'));
  });

  gulp.task('replace-build', () => {
    return gulp.src('src/manifest_base.json')
    .pipe(plumber())
    .pipe(replace('@@extensionTitleDebug', ''))
    .pipe(replace('@@backgroundScripts',
      '["js/commons.min.js", "js/indexedDB.min.js", "js/purge.min.js"]'))
    .pipe(replace('@@contentScripts',
      '["js/commons.min.js", "js/content_scripts/content_scripts.min.js"]'))
    .pipe(rename('manifest.json'))
    .pipe(gulp.dest('dist'));
  });

  gulp.task('usemin-build', () => {
    return gulp.src('src/**/*.html', { base: 'src' })
      .pipe(plumber())
      .pipe(usemin({
        css: [],
        js: [],
      }))
      .pipe(gulp.dest('dist'));
  });

  gulp.task('usemin', callback => {
    runSequence('babel', 'usemin-build', 'clean-tmp', callback);
  });

  gulp.task('minify-html', () => {
    return gulp.src('dist/**/*.html')
    .pipe(plumber())
    .pipe(minifyHtml())
    .pipe(gulp.dest('dist'));
  });

  gulp.task('jsonminify', () => {
    return gulp.src(['dist/**/*.json'], { base: 'dist' })
    .pipe(plumber())
    .pipe(jsonminify())
    .pipe(gulp.dest('dist'));
  });

  gulp.task('jshint', () => {
    return gulp.src(['src/js/**/*.js', '!src/**/*.min.js'])
           .pipe(plumber())
           .pipe(jshint({ lookup: '.jshintrc' }));
  });

  gulp.task('babel', () => {
    return gulp.src(['src/js/**/*.js'], { base: 'src' })
           .pipe(plumber())
           .pipe(babel({ blacklist: [ 'strict' ] }))
           .pipe(gulp.dest('tmp'));
  });

  gulp.task('uglify-build', () => {
    return merge(
      gulp.src(['tmp/js/common.js', 'tmp/js/common_func.js'], { base: 'tmp' })
          .pipe(plumber())
          .pipe(concat('commons.min.js'))
          .pipe(stripDebug())
          .pipe(uglify(uglify_options))
          .pipe(gulp.dest('dist/js')),
      gulp.src([
        'tmp/js/blank.js',
        'tmp/js/indexedDB.js',
        'tmp/js/options.js',
        'tmp/js/popup.js',
        'tmp/js/purge.js',
        'tmp/js/load_scripts/getScrollPosition.js',
      ], { base: 'tmp' })
          .pipe(plumber())
          .pipe(stripDebug())
          .pipe(uglify(uglify_options))
          .pipe(rename({
            extname: '.min.js'
          }))
          .pipe(gulp.dest('dist')),
      gulp.src([
        'tmp/js/load_scripts/getScrollPosition.js',
      ], { base: 'tmp' })
          .pipe(plumber())
          .pipe(stripDebug())
          .pipe(uglify(uglify_options))
          .pipe(gulp.dest('dist')),
      gulp.src([
        'tmp/js/content_scripts/excludeDialog.js',
        'tmp/js/content_scripts/formCache.js',
        'tmp/js/content_scripts/keybind.js',
      ], { base: 'tmp' })
          .pipe(plumber())
          .pipe(concat('content_scripts.min.js'))
          .pipe(stripDebug())
          .pipe(uglify(uglify_options))
          .pipe(gulp.dest('dist/js/content_scripts'))
    );
  });

  gulp.task('uglify', callback => {
    runSequence('babel', 'uglify-build', 'clean-tmp', callback);
  });

  gulp.task('sass-debug', callback => {
    runSequence('compass-debug', 'autoprefixer', 'csscomb', callback);
  });

  gulp.task('sass-build', callback => {
    runSequence(
      'compass-build', 'autoprefixer', 'csscomb', 'clean-css', callback);
  });

  gulp.task('js-build', callback => {
    runSequence('jshint', 'uglify', callback);
  });

  gulp.task('zip', () => {
    return gulp.src(['dist/**', '!**/*.map'])
           .pipe(plumber())
           .pipe(zip('archive.zip'))
           .pipe(gulp.dest('.'));
  });

  gulp.task('default', callback => {
    runSequence('debug', 'watch', callback);
  });
  gulp.task('debug', callback => {
    runSequence(
      'clean-debug',
      ['sass-debug', 'jshint', 'replace-debug'],
      callback);
  });
  gulp.task('build', callback => {
    runSequence(
      'clean-build',
      'copy-build',
      ['compass-build', 'jshint', 'replace-build'],
      ['autoprefixer', 'babel', 'jsonminify'],
      'usemin-build',
      ['csscomb', 'uglify-build', 'minify-html'],
      ['clean-css'],
      'clean-tmp',
      callback);
  });
  gulp.task('package', callback => {
    runSequence('build', 'zip', callback);
  });
  gulp.task('watch', () => {
    gulp.watch('src/manifest_base.json', ['replace-debug']);
    gulp.watch('src/**/*.js', ['jshint']);
    gulp.watch('src/**/*.scss', ['sass-debug']);
  });
})();
