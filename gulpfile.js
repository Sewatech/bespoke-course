'use strict';
var argv = require('yargs').argv,
  autoprefixer = require('gulp-autoprefixer'),
  browserify = require('browserify'),
  buffer = require('vinyl-buffer'),
  chmod = require('gulp-chmod'),
  cleanCSS = require('gulp-clean-css'),
  common = require('./scripts/common'),
  connect = require('gulp-connect'),
  csso = require('gulp-csso'),
  del = require('del'),
  exec = require('gulp-exec'),
  fs = require('fs'),
  gulp = require('gulp'),
  log = require('fancy-log'),
  path = require('path'),
  plumber = require('gulp-plumber'), // plumber prevents pipe breaking caused by errors thrown by plugins
  rename = require('gulp-rename'),
  source = require('vinyl-source-stream'),
  stylus = require('gulp-stylus'),
  through = require('through'),
  uglify = require('gulp-uglify');

const isDist = process.argv.indexOf('deploy') >= 0;

const MAX_HTML_FILE_SIZE = 2000; // kbytes
const module_dir = __dirname;
const modules_dir = path.dirname(path.dirname(module_dir));

debug('Starting in debug mode');

gulp.task('js', ['clean:js'], function() {
  // see https://wehavefaces.net/gulp-browserify-the-gulp-y-way-bb359b3f9623
  return browserify(module_dir + '/scripts/main.js').bundle()
    // NOTE this error handler fills the role of plumber() when working with browserify
    .on('error', function(e) { if (isDist) { throw e; } else { log(e.stack); this.emit('end'); } })
    .pipe(source(module_dir + '/scripts/main.js'))
    .pipe(buffer())
    .pipe(isDist ? uglify() : through())
    .pipe(rename('build.js'))
    .pipe(gulp.dest('public/build'))
    .pipe(connect.reload());
});

gulp.task('html', ['clean:html'], function() {
  const skip = argv.bc_skip || process.env.npm_package_config_skip;
  debug('Skip config:', skip);
  var skip_attributes;
  if (skip !== undefined) {
    skip_attributes = skip.split(',')
                              .map(line => `-a ${line.trim()}=skip`)
                              .join(' ');
  } else {
    skip_attributes = '';
  }
  debug('Skip attributes:', skip_attributes);

  return gulp.src('src/index.adoc')
    .pipe(isDist ? through() : plumber())
    .pipe(exec(`bundle exec asciidoctor-bespoke -a template_dir=${module_dir}/slides ${skip_attributes} -o - src/index.adoc`, { pipeStdout: true, maxBuffer: MAX_HTML_FILE_SIZE*1024 }))
    .pipe(exec.reporter({ stdout: false }))
    .pipe(rename('index.html'))
    .pipe(chmod(644))
    .pipe(gulp.dest('public'))
    .pipe(connect.reload());
});

gulp.task('css', ['clean:css'], function() {
  let filename = 'src/styles/main.styl';
  try {
    fs.accessSync(filename)
    log(' => using custom stylus file');
  } catch(e) {
    log(' => using default stylus file');
    filename = module_dir + '/styles/main.styl';
  }

  var attributes;
  const skip = argv.bc_skip || process.env.npm_package_config_skip;
  debug('Skip (raw):', skip);
  if (skip !== undefined) {
    const skip_classes = skip.split(',')
                              .map(line => '.' + line.trim())
                              .join();
    attributes =  { '$skip-classes': skip_classes };
  }

  const ratio = argv.bc_ratio || process.env.npm_package_config_ratio;
  debug('Ratio (raw): ', ratio);
  if (ratio !== undefined) {
    const dimension = common.extract_ratio(ratio);
    attributes =  { ...attributes, '$screen-ratio-width': dimension.width, '$screen-ratio-height': dimension.height };
  }
  debug('Raw define:', attributes);

  return gulp.src(filename)
    .pipe(isDist ? through() : plumber())
    .pipe(stylus({ 'include css': true, paths: [modules_dir], rawDefine: attributes }))
    .pipe(autoprefixer({ browsers: ['last 2 versions'], cascade: false }))
    .pipe(isDist ? csso() : through())
    .pipe(rename('build.css'))
    .pipe(gulp.dest('public/build'))
    .pipe(connect.reload());
});

gulp.task('fonts', ['clean:fonts'], function() {
  return gulp.src([module_dir + '/src/fonts/**/*',
                    modules_dir + '/font-awesome/fonts/**/*', 
                    modules_dir + '/font-awesome/css/font-awesome.css'
                    ])
    .pipe(gulp.dest('public/fonts'))
    .pipe(connect.reload());
});

gulp.task('images', ['clean:images'], function() {
  return gulp.src(['src/images/**/*', module_dir + '/images/**/*'])
    .pipe(gulp.dest('public/images'))
    .pipe(connect.reload());
});

gulp.task('hljs', ['clean:hljs', 'hljs:js', 'hljs:css']);

gulp.task('hljs:js', ['clean:hljs'], function() {
  return gulp.src(modules_dir + '/highlight.js/lib/**/*.js')
    .pipe(uglify())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('public/hljs'))
    .pipe(connect.reload());
});
gulp.task('hljs:css', ['clean:hljs'], function() {
  return gulp.src(modules_dir + '/highlight.js/styles/*.css')
    .pipe(cleanCSS())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('public/hljs/styles'))
    .pipe(connect.reload());
});

gulp.task('clean', function() {
  return del('public');
});

gulp.task('clean:html', function() {
  return del('public/index.html');
});

gulp.task('clean:js', function() {
  return del('public/build/build.js');
});

gulp.task('clean:css', function() {
  return del('public/build/build.css');
});

gulp.task('clean:fonts', function() {
  return del('public/fonts');
});

gulp.task('clean:images', function() {
  return del('public/images');
});

gulp.task('clean:hljs', function() {
  return del('public/hljs');
});

gulp.task('connect', ['build'], function() {
  connect.server({ root: 'public', port: process.env.npm_package_config_port | 8000, livereload: true });
});

gulp.task('watch', function() {
  gulp.watch('src/**/*.adoc', ['html']);
  gulp.watch('src/scripts/**/*.js', ['js']);
  gulp.watch('src/styles/**/*.styl', ['css']);
  gulp.watch('src/images/**/*', ['images','html']);
});

gulp.task('build', ['js', 'html', 'css', 'fonts', 'images']);
gulp.task('serve', ['connect', 'watch']);
gulp.task('default', ['build']);


function debug(...args) {
  if (argv.bc_debug) {
    log('[DEBUG]', ...args);
  }
}