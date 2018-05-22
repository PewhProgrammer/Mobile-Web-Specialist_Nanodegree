/**
 * pipeline.js
 *
 * The order in which your css, javascript, and template files should be
 * compiled and linked from your views and static HTML files.
 */

// Module (npm, bower, ...) to copy to the .tmp
// folder in order to use them as dependencies
module.exports.modulesToCopy = [
  /*{
    src: 'node_modules/jquery/dist/jquery.min.js',
    dest: 'js/vendors/'
  }*/
];

// CSS files to inject in order
var cssFilesToInject = [
  'styles/index.css'
];

// Client-side javascript files to inject in order
// (uses Gulp-style wildcard/glob/splat expressions)
var jsFilesToInject = [

  // Load sails.io before everything else
  'js/dependencies/sails.io.js',

  // Bring in `.js` files for any other client-side JavaScript dependencies.
  // (e.g. Lodash, Vue.js, jQuery, Bootstrap, Ember, Angular, etc.)
  // > Be sure to list dependencies that depend on each other in the right order!
  'dependencies/jquery.min.js',
  'dependencies/*.js',

  // include service worker
  '../sw.js',

  // First amongst the app-level files, bring in cloud configuration
  'js/cloud.setup.js',


  // Bring in components & utilities before bringing in the rest (i.e. page scripts)
  'js/utilities/*.js',
  // All of the rest of your custom client-side js files will be injected here,
  // in no particular order.  To customize the ordering, add additional items
  // here, _above_ this one.
  //'js/manual/*.js',
  //'js/*.js'


];


// Client-side HTML templates are injected using the sources below
// The ordering of these templates shouldn't matter.
// (uses Grunt-style wildcard/glob/splat expressions)
//
// By default, Sails uses JST templates and precompiles them into
// functions for you.  If you want to use jade, handlebars, dust, etc.,
// with the linker, no problem-- you'll just want to make sure the precompiled
// templates get spit out to the same file.  Be sure and check out `tasks/README.md`
// for information on customizing and installing new tasks.
var templateFilesToInject = [
  'templates/**/*.html',
  'templates/**/*.handlebars'
];

// Prefix relative paths to source files so they point to the proper locations
// (i.e. where the other Gulp tasks spit them out, or in some cases, where
// they reside in the first place)
module.exports.cssFilesToInject = cssFilesToInject.map(function(path) {
  return '.tmp/public/' + path;
});
module.exports.jsFilesToInject = jsFilesToInject.map(function(path) {
  return '.tmp/public/' + path;
});
module.exports.templateFilesToInject = templateFilesToInject.map(function(path) {
  return 'assets/' + path;
});
