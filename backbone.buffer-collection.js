(function (global) {
  'use strict';

  /**
   * Module Dependencies
   */

  var _ = global._,
    Backbone = global.Backbone,
    Collection = Backbone.Collection;

  /**
   * Default options
   */

  var defaults = {
    buffer: 1,
    min: 0,
    max: Number.POSITIVE_INFINITY
  };

  /**
   * BufferCollection constructor
   */

  var BufferCollection = Backbone.BufferCollection = function (models, options) {
    // mixin options
    options = options || {};
    _.each(defaults, function (val, key) {
      this[key] = options[key] === undefined
        ? defaults[key]
        : options[key];
    }, this);
    Collection.call(this, models, options);
  };

  /**
   * expose defaults
   */

  BufferCollection.defaults = defaults;

  /**
   * mixin extend
   */

  BufferCollection.extend = Collection.extend;

  /**
   * Override Backbone.Collection
   */

  _.extend(BufferCollection.prototype, Collection.prototype, {

    /**
     * override `_reset` to add internal expandos
     *   "_byPosition" map by position. hold Array of cid.
     *   "_pending" map of requesting positions
     *   "_abort" aborted request
     *   "_pos" current position
     */

    _reset: function (options) {
      Collection.prototype._reset.call(this, options);
      if (this._byPosition) {
        var cached = _.keys(this._byPosition);
        _.each(cached, this.unload, this);
      }
      this._byPosition = {};
      this._abort = this._pending || {};
      this._pending = {};
      this._pos = this._pos || null;
      return this;
    },

    /**
     * override `add` to register to `this._byPosition` map
     * @return {BufferCollection}
     */

    add: function (models, options) {
      var before = _.keys(this._byCid);
      var pos = options && options.position;
      if (pos === undefined) {
        return Collection.prototype.add.call(this, models, options);
      }
      delete this._pending[pos];
      // balk if it's aborted request
      if (this._abort[pos]) {
        delete this._abort[pos];
        return this;
      }
      Collection.prototype.add.call(this, models, options);
      var after = _.keys(this._byCid);
      this._byPosition[pos] = _.difference(after, before);
      return this;
    },

    /**
     * @return {BufferCollection}
     */

    position: function (position, options) {
      if (this._pos === position) return;
      this._pos = position;
      var cached, loaded, neighbor, toLoad, toUnload, toAbort;
      cached = _.keys(this._byPosition);
      loaded = cached.concat(this._pending);
      neighbor = this.getNeighbor();
      toLoad = _.difference(neighbor, loaded);
      toUnload = _.difference(cached, neighbor);
      toAbort = _.difference(this._pending, neighbor);
      if (_.indexOf(loaded, position) === -1) {
        this.load(position);
      }
      _.each(toUnload, this.unload, this);
      _.union(this._abort, toAbort);
      _.each(toLoad, function (pos) {
        this.load(pos, options);
      }, this);
      return this;
    },

    /**
     * @return {XHR}
     */

    load: function (position, options) {
      var pending = this._pending;
      if (pending[position]) return this;
      options = options || {};
      if (options.position === undefined) {
        options.position = position;
      }
      if (options.add === undefined) {
        options.add = true;
      }
      if (options.url === undefined) {
        options.url = this.url(position);
      }
      pending[position] = 1;
      var xhr = Collection.prototype.fetch.call(this, options);
      return xhr.fail(function () {
        // TODO add retry option??
        delete pending[position];
      });
    },

    /**
     * @return {BufferCollection}
     */

    unload: function (position) {
      var cids = this._byPosition[position];
      if (cids) this.remove(cids);
      return this;
    },

    /**
     * position getter
     * @return {Number}
     */

    getPosition: function () {
      return this._pos;
    },

    /**
     * @return {Array} - list of adjacent positions
     * @api private
     */

    getNeighbor: function () {
      var pos = this._pos,
        neighbors = [];

      for (var i = 1; i <= this.buffer; i++) {
        if (pos - i >= this.min) neighbors.push(pos - i);
        if (pos + i <= this.max) neighbors.push(pos + i);
      }
      console.dir( neighbors );
      return neighbors;
    }
  });

})(this);