/*
 * Ditto
 */
const
  events = require('events'),
  fs = require('fs-extra'),
  glob = require('glob'),
  path = require('path'),
  rimraf = require('rimraf'),
  util = require('util');

module.exports = Ditto;

function Ditto(workingDirectory) {
  if (!(this instanceof Ditto)) {
    return new Ditto(workingDirectory);
  }

  events.EventEmitter.call(this);

  //pipline
  this.clobber(true);
  this.files = {};
  this.metadata({});
  this.middleware = [];

  //directories
  this.destination('build');
  this.source('src');
  this.cwd(workingDirectory);

  //register listeners
  this.on("foundFiles", this.read);
  this.on("readFiles", this.run);
  this.on("middlewareDone", this.write);
};

/* Inherit Event Emitter prototype */
util.inherits(Ditto, events.EventEmitter);

/* Build It */
Ditto.prototype.build = function(onError) {
  console.info("INFO: build()");
  var self = this;

  try {
    //kickoff build
    self.discover();
  } catch (err) {
    console.error(err);
    if (onError(err));
  }
};

/* Should we clobber on build? */
Ditto.prototype.clobber = function(clobber) {
  this._clobber = clobber;
  return this;
};

/* Set current working directory */
Ditto.prototype.cwd = function(cwd) {
  this._cwd = path.resolve(cwd);
  return this;
};

/* Set destination directory */
Ditto.prototype.destination = function(destination) {
  this._destination = path.resolve(destination);
  return this;
};

/* Discover & parse files in source directory */
Ditto.prototype.discover = function() {
  console.info("INFO: discover()");
  var self = this;

  glob(this._source + '/**/*.*', function(err, filepaths) {
    if (err) throw err;

    self.emit("foundFiles", filepaths);
  });
};

/* Set metadata */
Ditto.prototype.metadata = function(metadata) {
  this._metadata = metadata;
  return this;
};

/* Read files into buffer */
Ditto.prototype.read = function(filepaths) {
  console.info("INFO: read()");

  var self = this,
    promises = [];

  for (var i = 0; i < filepaths.length; i++) {
    promises.push(this.readFile(filepaths[i]));
  }

  Promise.all(promises)
    .then(function(filesAry) {
      filesAry.map(function(file) {
        self.files[file.rel] = {
          content: file.buffer,
          path: file.rel,
          stats: file.stats
        };
      });

      self.emit("readFiles");
    });
};

/* Read file async */
Ditto.prototype.readFile = function(filepath) {
  console.info("INFO: readFile(): %s", filepath);

  var self = this;

  return new Promise(function(resolve, reject) {
    fs.stat(filepath, function(err, stats) {
      if (err) reject(err);

      fs.readFile(filepath, function(err, buffer) {
        if (err) reject(err);
        else {
          resolve({
            rel: path.relative(self._source, filepath),
            buffer: buffer,
            stats: stats
          });
        }
      });
    });
  });
};

/* Run middleware pipeline */
Ditto.prototype.run = function() {
  console.info("INFO: run()");

  var self = this,
    i = 0;

  function next(files) {
    var mw = self.middleware[i++];

    if (mw)
      mw.run(self.files, self, next);
    else
      self.emit("middlewareDone");
  };

  if (self._clobber)
    rimraf(path.join(self._destination, '/*'), next.bind(null, self.files));
  else
    next(self.files);
};

/* Set source directory */
Ditto.prototype.source = function(source) {
  this._source = path.resolve(source);
  return this;
};

/* Add middleware to file processing pipeline */
Ditto.prototype.use = function(middleware) {
  this.middleware.push(middleware);
  return this;
};

/* Write Files */
Ditto.prototype.write = function() {
  var self = this;

	Object.keys(self.files).forEach(function(filepath){
    var file = self.files[filepath];

    fs.outputFile(path.resolve(self._destination, file.path), file.content, function(err){
      if(err) throw err;
    });
  });
};
