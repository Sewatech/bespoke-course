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

check_version();
debug('Starting in debug mode');

gulp.task('clean:js', () => {
  return del('public/build/build.js');
});
gulp.task('clean:html', () => {
  return del('public/index.html');
});
gulp.task('clean:css', () => {
  return del('public/build/build.css');
});
gulp.task('clean:fonts', () => {
  return del('public/fonts');
});
gulp.task('clean:images', () => {
  return del('public/images');
});
gulp.task('clean:hljs', () => {
  return del('public/hljs');
});
gulp.task('clean', () => {
  return del('public');
});

gulp.task('hljs:js', gulp.series('clean:hljs', () => {
  return gulp.src(modules_dir + '/highlight.js/lib/**/*.js')
    .pipe(uglify())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('public/hljs'))
    .pipe(connect.reload());
}));
gulp.task('hljs:css', gulp.series('clean:hljs', () => {
  return gulp.src(modules_dir + '/highlight.js/styles/*.css')
    .pipe(cleanCSS())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('public/hljs/styles'))
    .pipe(connect.reload());
}));
gulp.task('hljs', gulp.series('clean:hljs', 'hljs:js', 'hljs:css'));

gulp.task('js', gulp.series('clean:js', () => {
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
}));

gulp.task('html', gulp.series('clean:html', () => {
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
    .pipe(chmod(0o644))
    .pipe(gulp.dest('public'))
    .pipe(connect.reload());
}));

gulp.task('css', gulp.series('clean:css', () => {
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
    .pipe(autoprefixer({ cascade: false }))
    .pipe(isDist ? csso() : through())
    .pipe(rename('build.css'))
    .pipe(gulp.dest('public/build'))
    .pipe(connect.reload());
}));

gulp.task('fonts', gulp.series('clean:fonts', () => {
  return gulp.src([module_dir + '/src/fonts/**/*',
                    modules_dir + '/font-awesome/fonts/**/*', 
                    modules_dir + '/font-awesome/css/font-awesome.css'
                    ])
    .pipe(gulp.dest('public/fonts'))
    .pipe(connect.reload());
}));

gulp.task('images', gulp.series('clean:images', () => {
  return gulp.src(['src/images/**/*', module_dir + '/images/**/*'])
    .pipe(gulp.dest('public/images'))
    .pipe(connect.reload());
}));

gulp.task('build', gulp.series('js', 'html', 'css', 'fonts', 'images'));

gulp.task('connect', gulp.series('build', () => {
  connect.server({ root: 'public', port: process.env.npm_package_config_port | 8000, livereload: true });
}));

gulp.task('watch', () => {
  gulp.watch('src/**/*.adoc', gulp.series('html'));
  gulp.watch('src/scripts/**/*.js', gulp.series('js'));
  gulp.watch('src/styles/**/*.styl', gulp.series('css'));
  gulp.watch('src/images/**/*', gulp.series('images','html'));
});

gulp.task('serve', gulp.parallel('connect', 'watch'));

gulp.task('default', gulp.series('build'));


function check_version() {
  var clc = require("cli-color");
  const version = require('gulp/package.json').version;
  const major = version.split('.')[0];
  if (major < 4) {
    log.error(clc.red(`Gulp version is ${version}, but should be at least 4.x`));
    process.exit(1);
  } else if (argv.bc_debug) {
    log(`Gulp version ${version}`);
  };
}

function debug(...args) {
  if (argv.bc_debug) {
    log('[DEBUG]', ...args);
  }
}
