/* jshint maxlen:1024 */
module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    compress: {
      options: {
        level: 6,
        archive: 'archive.zip'
      },
      files: {
        expand: true,
        cwd: 'dist/',
        src: [ '**/*', '!**/*.md', '!**/*.pdf', '!**/*.js.map' ],
        filter: 'isFile',
      },
    },
    clean: {
      debug: [ 'src/manifest.json', 'src/css' ],
      build: [ 'tmp', 'dist', 'archive.zip' ],
      tmp: [ 'tmp' ],
    },
    copy: {
      build: {
        expand: true,
        cwd: 'src/',
        src: [
          '_locales/**/*',
          'icons/**/*',
          '!icons/icon.svg',
          'History.txt',
          '!**/*.md',
          '!**/*.pdf',
        ],
        dest: 'dist/',
        filter: 'isFile',
      },
      html: {
        expand: true,
        flatten: true,
        src:    'src/**/*.html',
        dest:   'dist/',
        filter: 'isFile',
      },
    },
    replace: {
      debug: {
        options: {
          patterns: [
            {
              match: 'extensionTitleDebug',
              replacement: ' Debug',
            },
            {
              match: 'backgroundScripts',
              replacement: [
                "js/common.js",
                "js/common_func.js",
                "js/indexedDB.js",
                "js/purge.js",
              ],
            },
            {
              match: 'contentScripts',
              replacement: [
                "js/common.js",
                "js/common_func.js",
                "js/content_scripts/keyBind.js",
                "js/content_scripts/excludeDialog.js",
                "js/content_scripts/formCache.js"
              ],
            }
          ]
        },
        files: [
          {
            flatten: true,
            src: ['src/manifest_base.json'],
            dest: 'src/manifest.json',
          }
        ],
      },
      build: {
        options: {
          patterns: [
            {
              match: 'extensionTitleDebug',
              replacement: '',
            },
            {
              match: 'backgroundScripts',
              replacement: [
                "js/commons.min.js",
                "js/indexedDB.min.js",
                "js/purge.min.js",
              ],
            },
            {
              match: 'contentScripts',
              replacement: [
                "js/commons.min.js",
                "js/content_scripts/content_scripts.min.js",
              ],
            }
          ]
        },
        files: [
          {
            flatten: true,
            src: ['src/manifest_base.json'],
            dest: 'dist/manifest.json',
          }
        ],
      },
    },
    htmlmin: {
      build: {
        options: {
          removeComments:     true,
          collapseWhitespace: true,
        },
        files: {
          'dist/blank.html':   'dist/blank.html',
          'dist/options.html': 'dist/options.html',
          'dist/popup.html':   'dist/popup.html',
        },
      },
    },
    autoprefixer: {
      options: {
        browsers: [ 'last 2 Chrome versions' ],
      },
      prefix: {
        files: [
          {
            expand: true,
            flatten: true,
            src: 'src/css/*.css',
            dest: 'src/css/',
            filter: 'isFile',
          },
        ],
      },
    },
    compass: {
      debug: {
        options: {
          sassDir:                 'src/sass',
          cssDir:                  'src/css',
          // imagesDir:               'src/assets/img',
          // javascriptsDir:          'src/js',
          // generatedImagesDir:      'src/assets/img',
          // httpGeneratedImagesPath: 'assets/img',
          sourcemap:               true,
          // relativeAssets:          true,
        },
      },
      build: {
        options: {
          sassDir:                 'src/sass',
          cssDir:                  'src/css',
          // imagesDir:               'src/assets/img',
          // javascriptsDir:          'src/js',
          // generatedImagesDir:      'dist/img',
          // httpGeneratedImagesPath: 'img',
          noLineComments:          true,
          outputStyle:             'compressed',
          environment:             'production',
          // relativeAssets:          true,
        },
      },
    },
    csscomb: {
      format: {
        files: {
          'src/css/options.css': ['src/css/options.css'],
          'src/css/popup.css': ['src/css/popup.css'],
          'src/css/blank.css': ['src/css/blank.css'],
        },
      },
    },
    cssmin: {
      build: {
        files: [{
          expand: true,
          cwd:    'src/css',
          src:    ['*.css', '!*.min.css'],
          dest:   'dist/css',
          ext:    '.min.css',
        }],
      },
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc',
      },
      check: {
        files: [{
          expand: true,
          cwd:    'src/js',
          src:    ['**/*.js', '!**/*.min.css'],
        }],
      },
    },
    babel: {
      options: {
        sourceMap: false,
        blacklist: [ 'strict' ],
      },
      build: {
        files: [{
          expand: true,
          cwd:    'src/',
          src:    ['**/*.js', '!**/*.min.css'],
          dest:   'tmp',
          ext:    '.js',
          filter: 'isFile',
        }],
      },
    },
    uglify: {
      options: {
        sourceMap: false,
        compress: {
          drop_console: true,
        },
        mangle: {
          chrome: false,
        },
      },
      commons: {
        files: {
          'dist/js/commons.min.js': [
            'tmp/js/common.js',
            'tmp/js/common_func.js'
          ],
        },
      },
      build: {
        files: {
          'dist/js/blank.min.js':     ['tmp/js/blank.js'],
          'dist/js/indexedDB.min.js': ['tmp/js/indexedDB.js'],
          'dist/js/options.min.js':   ['tmp/js/options.js'],
          'dist/js/popup.min.js':     ['tmp/js/popup.js'],
          'dist/js/purge.min.js':     ['tmp/js/purge.js'],

          // 'dist/js/load_scripts/getScrollPosition.min.js': ['tmp/js/load_scripts/getScrollPosition.js'],
          'dist/js/load_scripts/getScrollPosition.js': ['tmp/js/load_scripts/getScrollPosition.js'],

          'dist/js/content_scripts/content_scripts.min.js': [
            'tmp/js/content_scripts/excludeDialog.js',
            'tmp/js/content_scripts/formCache.js',
            'tmp/js/content_scripts/keybind.js',
          ],
        },
      }
    },
    useminPrepare: {
      html: ["dist/**/*.html"],
      options: {
        dirs: ["dist/"]
      },
    },
    usemin: {
      html: ["dist/**/*.html"],
      options: {
        assetDirs: ['dist', 'dist/css', 'dist/js', 'css', 'js'],
      },
    },
    'json-minify': {
      manifest: {
        files: 'dist/manifest.json'
      },
      translation: {
        files: 'dist/_locales/**/*.json'
      }
    },
    watch: {
      other: {
        files: [
          '_locales/**/*',
          'icon/**/*',
          'History.txt',
        ],
        tasks: ['copy:dist', 'json-minify:translation'],
      },
      commons: {
        files: ['src/js/common.js', 'src/js/common_func.js'],
        tasks: ['copy', 'uglify:commons'],
      },
      html: {
        files: ['src/**/*.html'],
        tasks: ['copy:html', 'htmlmin'],
      },
      sass: {
        files: ['src/sass/**/*.scss'],
        tasks: ['compass', 'autoprefixer:prefix', 'csscomb', 'cssmin'],
      },
      js: {
        files: ['src/js/**/*.js'],
        tasks: ['babel', 'uglify'],
      },
      manifest: {
        files: ['src/manifest_base.json'],
        tasks: ['replace:debug', 'json-minify:manifest'],
      },
    },
  });

  grunt.loadNpmTasks('grunt-usemin');
  grunt.loadNpmTasks('grunt-replace');
  grunt.loadNpmTasks('grunt-csscomb');
  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-contrib-compass');
  grunt.loadNpmTasks('grunt-autoprefixer');
  grunt.loadNpmTasks('grunt-json-minify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-htmlmin');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('debug', [
    'clean:debug',
    'compass:debug',
    'autoprefixer:prefix',
    'csscomb:format',
    'replace:debug',
    'jshint:check',
    'watch',
  ]);
  grunt.registerTask('build', [
    'clean:build',
    'copy',
    'compass:build',
    'autoprefixer:prefix',
    'csscomb:format',
    'replace:build',
    'useminPrepare',
    'cssmin:build',
    'jshint:check',
    'babel:build',
    'uglify:commons',
    'uglify:build',
    'usemin',
    'htmlmin',
    'json-minify',
    'clean:tmp',
  ]);
  grunt.registerTask('package', [
    'build',
    'compress',
  ]);
  grunt.registerTask('default', [
    'debug',
  ]);
};
