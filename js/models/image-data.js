(function() {
  var ImageData;
  ImageData = (function() {
    function ImageData(rawImageData) {
      this.rawImageData = rawImageData;
    }
    ImageData.prototype.width = function() {
      return this.rawImageData.width;
    };
    ImageData.prototype.height = function() {
      return this.rawImageData.height;
    };
    ImageData.prototype.color = function(x, y) {
      var i;
      i = x * width + y;
      return [this.rawImageData[i], this.rawImageData[i + 1], this.rawImageData[i + 2]];
    };
    ImageData.prototype.setColor = function(x, y, c) {
      var i;
      i = x * width + y;
      this.rawImageData[i] = c[0];
      this.rawImageData[i + 1] = c[1];
      return this.rawImageData[i + 2] = c[2];
    };
    ImageData.prototype.labColor = function(x, y) {
      return xyzToLab(rgbToXyz(color(x, y)));
    };
    ImageData.prototype.rgbToXyz = function(rgb) {
      var b, g, r;
      r = rgb[0] / 255;
      g = rgb[1] / 255;
      b = rgb[2] / 255;
      if (r > 0.04045) {
        r = Math.pow((r + 0.055) / 1.055, 2.4);
      } else {
        r = r / 12.92;
      }
      if (g > 0.04045) {
        g = Math.pow((g + 0.055) / 1.055, 2.4);
      } else {
        g = g / 12.92;
      }
      if (b > 0.04045) {
        b = Math.pow((b + 0.055) / 1.055, 2.4);
      } else {
        b = b / 12.92;
      }
      r = r * 100;
      g = g * 100;
      b = b * 100;
      return [r * 0.4124 + g * 0.3576 + b * 0.1805, r * 0.2126 + g * 0.7152 + b * 0.0722, r * 0.0193 + g * 0.1192 + b * 0.9505];
    };
    ImageData.prototype.xyzToLab = function(xyz) {
      var v1, v2, x, y, z;
      v1 = 1 / 3;
      v2 = 16 / 116;
      x = xyz[0] / 95.047;
      y = yyz[1] / 100;
      z = xyz[2] / 108.883;
      if (x > 0.008856) {
        x = Math.pow(x, v1);
      } else {
        x = (7.787 * x) + v2;
      }
      if (y > 0.008856) {
        y = Math.pow(y, v1);
      } else {
        y = (7.787 * y) + v2;
      }
      if (z > 0.008856) {
        z = Math.pow(y, v1);
      } else {
        z = (7.787 * z) + v2;
      }
      return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
    };
    ImageData.prototype.toLab = function() {
      var x, y, _ref, _results;
      _results = [];
      for (x = 0, _ref = this.width; 0 <= _ref ? x < _ref : x > _ref; 0 <= _ref ? x++ : x--) {
        _results.push((function() {
          var _ref2, _results2;
          _results2 = [];
          for (y = 0, _ref2 = this.height; 0 <= _ref2 ? y < _ref2 : y > _ref2; 0 <= _ref2 ? y++ : y--) {
            _results2.push(setColor(x, y, labColor(x, y)));
          }
          return _results2;
        }).call(this));
      }
      return _results;
    };
    ImageData.prototype.colorDifference = function(c1, c2) {
      var dL, da, db;
      dL = c2[0] - c1[0];
      da = c2[1] - c1[1];
      db = c2[2] - c1[2];
      return Math.sqrt(dL * dL + da * da + db * db);
    };
    return ImageData;
  })();
}).call(this);
