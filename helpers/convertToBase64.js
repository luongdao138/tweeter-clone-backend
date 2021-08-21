const DataUriParser = require('datauri/parser');
const parser = new DataUriParser();
const path = require('path');

module.exports = (file) =>
  parser.format(path.join(file.originalname).toString(), file.buffer);
