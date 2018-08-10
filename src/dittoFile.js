var path = require('path');
module.exports = DittoFile;

/**
 @typedef DittoFile
 @type {Object}
 @property {Array} buffer file contents as byte array
 @property {Object} relPath relative filepath
 @property {Object} stats node Stats object
 */
function DittoFile(buffer, relPath, stats) {
  this.content = buffer;
  this.stats = stats;

  this.path = {
    dir: '', //directory(s) relative to source
    ext: '', //file extension with dot
    name: '', //file name without extension
    rel: relPath // original path, relative to source with extension
  };

  var parsedPath = path.parse(relPath);
  this.path.dir = parsedPath.dir;
  this.path.ext = parsedPath.ext;
  this.path.name = parsedPath.name;
};

/**
 * Get path with extension for purpose of writing to disk
 */
DittoFile.prototype.pathWithExtension = function(){
  return this.pathWithoutExtension() + this.path.ext;
};

/**
 * Get path with extension for purpose of writing to disk
 */
DittoFile.prototype.pathWithoutExtension = function () {
  var pathWithoutExtension = path.join(this.path.dir, this.path.name);

  return pathWithoutExtension;
};