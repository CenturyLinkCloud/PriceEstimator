module.exports = (grunt) ->

  # Root application path
  basePath = '.'

  # Directory where source files live
  source = "#{basePath}/source"

  # Directory where vendor files live
  vendor = "#{source}/js/lib"

  # Path to compile to during development
  output = "#{basePath}/public"

  # Test specs directory and html
  test = "#{basePath}/test"


  grunt.initConfig

    pkg: grunt.file.readJSON("package.json")

    
    # --------------------------------------------------------
    # Concatenate vendor JS
    # --------------------------------------------------------

    concat:
       options:
          separator: ';'
       vendor:
          src: [
             "#{source}/js/libs/rangeslider.js/dist/rangeslider.js"
             "#{source}/js/libs/accounting/accounting.js"
             "#{source}/js/libs/lodash/dist/lodash.underscore.js"
             "#{source}/js/libs/backbone/backbone.js"
             "#{source}/js/libs/backbone.syphon/lib/backbone.syphon.js"
          ]
          dest: "#{output}/javascripts/vendor.js"

    
    # --------------------------------------------------------
    # Compile CSS
    # --------------------------------------------------------

    sass:
      dist:
        src: "#{source}/css/main.scss"
        dest: "#{output}/stylesheets/main.css"
        options:
          sourceComments: "map"


    # --------------------------------------------------------
    # Add vendor prefixes
    # --------------------------------------------------------

    autoprefixer:
      dist: 
        expand: true,
        flatten: true,
        src: "#{output}/stylesheets/*.css"
        dest: "#{output}/stylesheets/"


    # --------------------------------------------------------
    # Compile JavaScript
    # --------------------------------------------------------

    browserify:
      dist:
        src: "#{source}/js/main.coffee"
        dest: "#{output}/javascripts/all.js"
        options:
          transform: ['coffeeify', 'hamlify']
      test:
        src: ["test/spec-runner.coffee"]
        dest: "test/html/spec/spec-runner.js"
        options:
          transform: ['coffeeify', 'hamlify']
          debug: true


    # --------------------------------------------------------
    # Compress JavaScript
    # --------------------------------------------------------

    uglify:
      all:
        src: "#{output}/javascripts/all.js"
        dest: "#{output}/javascripts/all.min.js"
      vendor:
        src: "#{output}/javascripts/vendor.js"
        dest: "#{output}/javascripts/vendor.min.js"



    # --------------------------------------------------------
    # Run Middleman
    # --------------------------------------------------------

    exec:
      middleman:
        command: 'middleman server'


    # --------------------------------------------------------
    # Run Mocha specs
    # --------------------------------------------------------

    mocha:
      test:
        options:
          reporter: 'Spec'
          log: true
          run: true
          require: 'coffee-script'
        mocha:
          ignoreLeaks: true
        src: ["#{test}/html/index.html"]

    
    # --------------------------------------------------------
    # Run Middleman concurrently with Grunt Watch
    # --------------------------------------------------------

    concurrent: 
      options: 
        logConcurrentOutput: true
      server: 
        tasks: ['exec:middleman', 'watch']


    # --------------------------------------------------------
    # Watch for file changes
    # --------------------------------------------------------

    watch:
      options:
        spawn: false
      test:
        files: [ 'test/**/*.*', 'source/coffeescript/**/*.*' ]
        tasks: [ 'test' ]
      config: 
        files: ["Gruntfile.coffee"]
        options:
          reload: true
      scripts:
        files: ["#{source}/js/**/*.{js,coffee,haml}"]
        tasks: ["browserify"]
        options: 
          spawn: true
      sass:
        files: ["#{source}/css/*.scss"]
        tasks: ["sass", "autoprefixer"]
        options: 
          spawn: true
      livereload:
        files: ["#{output}/stylesheets/*.css", "#{output}/javascripts/*.js", "#{output}/*.{erb,haml,html}"]
        options:
          livereload: true



  # --------------------------------------------------------
  # Load and register Grunt Tasks
  # --------------------------------------------------------  

  grunt.loadNpmTasks "grunt-contrib-clean"
  grunt.loadNpmTasks "grunt-contrib-concat"
  grunt.loadNpmTasks "grunt-contrib-uglify"
  grunt.loadNpmTasks "grunt-contrib-watch"
  grunt.loadNpmTasks "grunt-browserify"
  grunt.loadNpmTasks "grunt-exec"
  grunt.loadNpmTasks "grunt-concurrent"
  grunt.loadNpmTasks "grunt-sass"
  grunt.loadNpmTasks "grunt-autoprefixer"
  grunt.loadNpmTasks "grunt-mocha"

  grunt.registerTask "default", ["browserify", "sass", "autoprefixer", "concat"]
  grunt.registerTask "dev", ["browserify", "sass", "autoprefixer", "concat", "test", "watch"]
  grunt.registerTask 'test', ['browserify:dist', 'browserify:test', 'concat:vendor', 'mocha']

  grunt.option 'force', true