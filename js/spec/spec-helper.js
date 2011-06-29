(function() {
  beforeEach(function() {
    return this.addMatchers({
      toBeNode: function(expected) {
        return this.actual.val === expected.val;
      },
      toHaveSameElementsAs: function(expected) {
        var val, _i, _len;
        if (expected.length !== this.actual.length) {
          return false;
        }
        for (_i = 0, _len = expected.length; _i < _len; _i++) {
          val = expected[_i];
          if (this.actual.indexOf(val) === -1) {
            return false;
          }
        }
        return true;
      }
    });
  });
}).call(this);
