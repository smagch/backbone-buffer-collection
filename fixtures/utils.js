
/**
 * random id
 */

exports.getId = function () {
  function random() {
    return Math.random().toString(16).slice(2);
  }
  return random() + random();
};