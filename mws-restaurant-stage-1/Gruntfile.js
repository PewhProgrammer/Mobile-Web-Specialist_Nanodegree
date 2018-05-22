module.exports = function (grunt) {

    grunt.initConfig({
        responsive_images: {
            dev: {
                options: {
                    newFilesOnly: true,
                    rename: false,
                    engine: 'gm',
                    sizes: [{
                        width: 270,
                        //height: 200,
                        suffix: '_medium_1x',
                        quality: 50
          }, {
                        width: 390,
                        //height: 262,
                        suffix: '_large_1x',
                        quality: 50
          }, {
                        width: 180,
                        //height: 155,
                        suffix: '_small_1x',
                        quality: 50
          }]
                },
                files: [{
                    expand: true,
                    src: ['*.{gif,jpg,png}'],
                    cwd: 'img/',
                    dest: 'images_cropped/'
        }]
            }
        },
    });

    grunt.loadNpmTasks('grunt-responsive-images');
    grunt.registerTask('default', ['responsive_images']);

};
