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
        src: [ '**/*' ],
        filter: 'isFile',
      },
    },
    clean: {
      debug: [ 'src/manifest.json', 'src/js/debug.js' ],
      build: [ '.tmp', 'dist', 'archive.zip' ],
    },
    copy: {
      build: {
        expand: true,
        cwd: 'src/',
        src: [
          '_locales/**/*',
          'icon/**/*',
          'History.txt',
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
              match: 'debugMode',
              replacement: true,
            },
            {
              match: 'extensionTitleDebug',
              replacement: ' Debug',
            },
            {
              match: 'backgroundScripts',
              replacement: [
                "js/debug.js",
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
            src: ['src/js/debug_base.js'],
            dest: 'src/js/debug.js',
          },
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
              match: 'debugMode',
              replacement: false,
            },
            {
              match: 'extensionTitleDebug',
              replacement: '',
            },
            {
              match: 'backgroundScripts',
              replacement: [
                "js/dCommons.min.js",
                "js/indexedDB.min.js",
                "js/purge.min.js",
              ],
            },
            {
              match: 'contentScripts',
              replacement: [
                "js/dCommons.min.js",
                "js/content_scripts/content_scripts.min.js",
              ],
            }
          ]
        },
        files: [
          {
            flatten: true,
            src: ['src/js/debug_base.js'],
            dest: 'src/js/debug.js',
          },
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
    sass: {
      build: {
        // options: {
        // },
        files: [
          {
            expand: true,
            cwd: 'src/sass/',
            src: [ '*.scss' ],
            dest: 'src/css',
            ext: '.css',
          },
        ],
      },
    },
    csscomb: {
      format: {
        files: {
          'src/css/options.css': ['src/css/options.css'],
          'src/css/popup.css': ['src/css/popup.css'],
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
    uglify: {
      options: {
        mangle: {
          'chrome': false,
        },
      },
      dCommons: {
        files: {
          'dist/js/dCommons.min.js': [
            'src/js/debug.js',
            'src/js/common.js',
            'src/js/common_func.js'
          ],
        },
      },
      build: {
        files: {
          'dist/js/blank.min.js':     ['src/js/blank.js'],
          'dist/js/indexedDB.min.js': ['src/js/indexedDB.js'],
          'dist/js/options.min.js':   ['src/js/options.js'],
          'dist/js/popup.min.js':     ['src/js/popup.js'],
          'dist/js/purge.min.js':     ['src/js/purge.js'],

          // 'dist/js/load_scripts/getScrollPosition.min.js': ['src/js/load_scripts/getScrollPosition.js'],
          'dist/js/load_scripts/getScrollPosition.js': ['src/js/load_scripts/getScrollPosition.js'],

          'dist/js/content_scripts/content_scripts.min.js': [
            'src/js/content_scripts/excludeDialog.js',
            'src/js/content_scripts/formCache.js',
            'src/js/content_scripts/keybind.js',
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
    watch: {
      files: {
        files: [
          '_locales/**/*',
          'icon/**/*',
          'History.txt',
        ],
        tasks: ['copy:dist'],
      },
      dCommons: {
        files: ['src/js/debug_base.js', 'src/js/common.js', 'src/js/common_func.js'],
        tasks: ['copy', 'uglify:dCommons'],
      },
      html: {
        files: ['src/**/*.html'],
        tasks: ['copy:html', 'htmlmin'],
      },
      sass: {
        files: ['src/sass/**/*.scss'],
        tasks: ['sass'],
      },
      css: {
        files: ['src/css/**/*.css'],
        tasks: ['csscomb', 'cssmin'],
        options: {
          livereload: true,
        },
      },
      js: {
        files: ['src/js/**/*.js'],
        tasks: ['uglify'],
      },
      manifest: {
        files: ['src/manifest_base.json'],
        tasks: ['replace:debug'],
      },
    },
  });

  grunt.loadNpmTasks('grunt-usemin');
  grunt.loadNpmTasks('grunt-replace');
  grunt.loadNpmTasks('grunt-csscomb');
  grunt.loadNpmTasks('grunt-autoprefixer');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-htmlmin');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('debug', [
    'clean:debug',
    'sass:build',
    'autoprefixer:prefix',
    'csscomb:format',
    'replace:debug',
  ]);
  grunt.registerTask('build', [
    'clean:build',
    'copy',
    'sass:build',
    'autoprefixer:prefix',
    'csscomb:format',
    'replace:build',
    'useminPrepare',
    'cssmin:build',
    'uglify:dCommons',
    'uglify:build',
    'usemin',
    'htmlmin',
  ]);
  grunt.registerTask('package', [
    'build',
    'compress',
  ]);
  grunt.registerTask('default', [
    'debug',
  ]);
};
