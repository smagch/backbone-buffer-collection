describe('Backbone.StreamCollection', function () {
  var BufferCollection = Backbone.BufferCollection;
  var ColorCollection = BufferCollection.extend({
    url: function (position) {
      return '/color?page=' + position;
    },
    parse: function (data) {
      return data.results;
    }
  });

  describe('.getPosition()', function () {
    it('should update after `.position` call', function () {
      var colorList = new ColorCollection();
      colorList.position(0);
      expect(colorList.getPosition()).to.be(0);
      colorList.position(2);
      expect(colorList.getPosition()).to.be(2);
      colorList.position(100);
      expect(colorList.getPosition()).to.be(100);
      colorList = colorList;
    });
  });

  describe('.getNeighbors()', function () {
    it('should return adjacent position', function () {
      var colorList = new ColorCollection(null, {
        buffer: 2
      });
      colorList.position(10);
      var neighbors = colorList.getNeighbors();
      expect(neighbors).to.have.length(4);
      colorList.buffer = 3;
      colorList.position(20);
      neighbors = colorList.getNeighbors();
      expect(neighbors).to.have.length(6);
    });

    it('should not buffer a position which is more than `max` option', function () {
      var colorList = new ColorCollection(null, {
        buffer: 4,
        max: 100
      });
      colorList.position(98);
      var neighbors = colorList.getNeighbors();
      expect(neighbors).to.have.length(6);
    });
  });

  describe('"drain" event', function () {
    it('should trigger array of positions when all buffering completes', function (done) {
      function checkLength(num, positions) {
        if (!positions || !positions.length) return done(new Error('no position array'));
        expect(positions).to.have.length(num);
      }
      var colorList = new ColorCollection(null, {
        buffer: 3,
        max: 100
      });
      var tests = [];
      tests.push({
        position: 10,
        answer: 7
      });
      tests.push({
        position: 1,
        answer: 5
      });
      tests.push({
        position: 100,
        answer: 4
      });

      colorList.on('drain', function (positions) {
        var props = tests.shift();
        checkLength(props.answer, positions);
        if (tests.length) {
          colorList.position(tests[0].position);
        } else {
          done();
        }
      });

      colorList.position(tests[0].position);
    });
  });
});