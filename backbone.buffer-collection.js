/*!
 * (c) 2012 Tomoya Shimaguchi <smagch@gmail.com>
 * License MIT
 * https://github.com/smagch/backbone-buffer-collection
 */

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
   * mixin "buffer", "min", "max" properties
   * Example:
   *   var MyBufferCollection = Backbone.BufferCollection.extend({
   *     buffer: 4,
   *     url: function (pos) { return '/a_book?page=' + pos; }
   *   });
   *   var myCollection = new MyBufferCollection();
   *   console.log(myCollection.buffer); // => 4
   *   var yetAnotherCollection = new MyBufferCollection({
   *     buffer: 10
   *   });
   *   console.log(myCollection.buffer); // => 10
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
   * current version of the plugin
   */

  BufferCollection.version = '0.0.0-alpha';

  /**
   * expose defaults to allow override
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
     *   "_pos" current position
     */

    _reset: function (options) {
      // TODO: don't use position number to store `_abort`, `_pending`?
      // if it's data source changes, there will be a problem.
      Collection.prototype._reset.call(this, options);
      if (this._byPosition) {
        var cached = _.keys(this._byPosition);
        _.each(cached, this.unload, this);
      }
      this._byPosition = {};
      // TODO: should abort requests of previous collection source
      // this._abort = _.extend((this._abort || {}), (this._pending || {}));
      this._pending = {};
      this._pos = this._pos || null;
      return this;
    },

    /**
     * override `add` to register to `this._byPosition` map
     * @return {BufferCollection}
     */

    add: function (models, options) {
      var before, pos, after;
      pos = options && options.position;
      if (pos === undefined) {
        return Collection.prototype.add.call(this, models, options);
      }
      delete this._pending[pos];
      // don't add models if requested position is no longer a neighbor
      if (this.isNeighbor(pos)) {
        before = _.keys(this._byCid);
        Collection.prototype.add.call(this, models, options);
        after = _.keys(this._byCid);
        this._byPosition[pos] = _.difference(after, before);
      }
      if (!_.keys(this._pending).length) {
        this.trigger('drain', _.keys(this._byPosition));
      }
      return this;
    },

    /**
     * prohibit fetch
     * since this plugin is designed to request by position
     * using fetch directly may cause bugs
     */

    fetch: function () {
      throw new Error("Don't use fetch, use position instead");
    },

    /**
     * Fetch data by position
     *   - It automatically remove models that is outside of buffer range
     *   - It automatically load models inside of buffer range if it doesn't exist
     * When you want to reset collection.
     * You'll need to call `.reset()` explicitely since `options.add` is `true` by default
     * When you specify `options.add` to be `false`, it reset
     *
     * @param {Number|String}
     * @param {Object}
     * @return {BufferCollection}
     */

    position: function (position, options) {
      if (this._pos === position) return this;
      var cached, loaded, neighbor, toLoad, toUnload;
      this._pos = parseInt(position, 10);
      options || (options = {});
      // force add true
      options.add = true;
      cached = _.keys(this._byPosition);
      loaded = cached.concat(_.keys(this._pending));
      neighbor = this.getNeighbors();
      toLoad = _.difference(neighbor, loaded);
      toUnload = _.difference(cached, neighbor, [position + '']);
      if (_.indexOf(loaded, position + '') === -1) this.load(position, options);
      _.each(toUnload, this.unload, this);
      _.each(toLoad, function (pos) {
        this.load(pos);
      }, this);
      this.trigger('position', position, options);
      return this;
    },

    /**
     * Request data by position
     * You'll need to override `url` property something like this
     *   url: function (position) {
     *     return '/slide?page=' + position;
     *   }
     *   url: function (position) {
     *     return '/book/' + this.bookName + '?page=' + position;
     *   }
     *
     * @param {Number}
     * @param {Object}
     * @return {XHR}
     */

    load: function (position, options) {
      var pending = this._pending;
      if (pending[position]) return this;
      pending[position] = 1;
      options || (options = {});
      options.position = position;
      options.url = this.url(position);
      if (options.add === undefined) options.add = true;
      return Collection.prototype.fetch.call(this, options).fail(function () {
        // TODO add retry option??
        delete pending[position];
      });
    },

    /**
     * @param {Number}
     * @return {BufferCollection}
     */

    unload: function (position) {
      var cids = this._byPosition[position];
      if (cids) {
        this.remove(cids);
        delete this._byPosition[position];
      }
      return this;
    },

    /**
     * return Array of models by position
     *
     * @param {Number}
     * @return {Array}
     */

    getByPosition: function (position) {
      var cids = this._byPosition[position];
      if (!cids) return null;
      return this.map(cids, this.getByCid, this);
    },

    /**
     * position getter
     * @return {Number}
     */

    getPosition: function () {
      return this._pos;
    },

    /**
     * return list of positions which is inside buffer areas
     * @return {Array} - list of adjacent positions, position is String typed
     */

    getNeighbors: function () {
      var pos = this._pos, neighbors = [];
      for (var i = 1; i <= this.buffer; i++) {
        if (pos - i >= this.min) neighbors.push(pos - i + '');
        if (pos + i <= this.max) neighbors.push(pos + i + '');
      }
      return neighbors;
    },

    /**
     * unique id of position
     * @param {Number}
     * @api private
     */

    isNeighbor: function (position) {
      var pos = this._pos;
      var min = Math.min(this.min, pos - this.buffer);
      var max = Math.min(this.max, pos + this.buffer);
      return !(position < min || position > max);
    }
  });

})(this);