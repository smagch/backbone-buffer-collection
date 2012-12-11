
/**
 * Module Dependencies
 */

var utils = require('./utils');

/**
 * create psudo color data
 */

var TOTAL = 100;
var colors = [];
for (var i = 0; i < TOTAL; i++) {
  var color = '#' + Math.floor(Math.random() * 16777215).toString(16);
  colors.push({ 
    color: color,
    index: i,
    id: utils.getId()
  });
}

function normalizeLimit(limit) {
  if (typeof limit === 'undefined') return 10;
  limit = parseInt(limit, 10);
  if (typeof limit !== 'number') return 10;
  if (limit < 0) return 0;
  if (limit > 30) return 30;
  return limit;
}

function normalizeEnd(end) {
  if (end > TOTAL) return TOTAL;
  return end;
}

/**
 * Color List API
 * parameters
 *   - page, (limit * page = start)
 *   - limit, response results length
 *   - start, not used if page is specified
 */

module.exports = function (req, res) {
  console.log('GET : ' + req.url);
  
  var limit = normalizeLimit(req.query.limit)
    , page = req.query.page
    , start;

  if (typeof page !== 'undefined') {
    start = limit * parseInt(page, 10);
  } else {
    start = parseInt(req.query.start, 10) || 0;
  }

  var end = start + limit;
  end = normalizeEnd(end);
  var results = colors.slice(start, end);
  res.json({
    total: TOTAL
  , start: start
  , length: results.length
  , results: results
  });
};