module.exports = function (grunt) {
  grunt.initConfig({
    uglify: {
      default: {
        options: {
          preserveComments: 'some',
          sourceMap: 'angular-offline.min.map',
          sourceMappingURL: 'angular-offline.min.map'
        },
        files: {
          'angular-offline.min.js': 'angular-offline.js'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.registerTask('default', ['uglify']);
};
