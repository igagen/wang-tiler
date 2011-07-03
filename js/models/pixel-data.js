(function() {
  var ImageUtil, PixelData;
  ImageUtil = {
    rgbToXyz: function(rgb) {
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
    },
    xyzToLab: function(xyz) {
      var v1, v2, x, y, z;
      v1 = 1 / 3;
      v2 = 16 / 116;
      x = xyz[0] / 95.047;
      y = xyz[1] / 100;
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
        z = Math.pow(z, v1);
      } else {
        z = (7.787 * z) + v2;
      }
      return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
    },
    magnitude: function(c) {
      return Math.sqrt(c[0] * c[0] + c[1] * c[1] + c[2] * c[2]);
    },
    subtract: function(c1, c2) {
      return [c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]];
    },
    colorDifference: function(c1, c2) {
      return ImageUtil.magnitude(ImageUtil.subtract(c1, c2));
    }
  };
  PixelData = (function() {
    function PixelData(rawImageData) {
      this.width = rawImageData.width;
      this.height = rawImageData.height;
      this.rawImageData = rawImageData;
      this.labColorData = null;
    }
    PixelData.prototype.initLabColor = function() {
      var x, y, _ref, _ref2, _results;
      this.labColorData = new Array(this.width);
      for (x = 0, _ref = this.width; 0 <= _ref ? x < _ref : x > _ref; 0 <= _ref ? x++ : x--) {
        this.labColorData[x] = new Array(this.height);
      }
      _results = [];
      for (x = 0, _ref2 = this.width; 0 <= _ref2 ? x < _ref2 : x > _ref2; 0 <= _ref2 ? x++ : x--) {
        _results.push((function() {
          var _ref3, _results2;
          _results2 = [];
          for (y = 0, _ref3 = this.height; 0 <= _ref3 ? y < _ref3 : y > _ref3; 0 <= _ref3 ? y++ : y--) {
            _results2.push(this.labColorData[x][y] = null);
          }
          return _results2;
        }).call(this));
      }
      return _results;
    };
    PixelData.prototype.color = function(x, y) {
      var i;
      i = (y * this.width + x) * 4;
      return [this.rawImageData.data[i], this.rawImageData.data[i + 1], this.rawImageData.data[i + 2], this.rawImageData.data[i + 3]];
    };
    PixelData.prototype.setColor = function(x, y, c) {
      var i;
      i = (y * this.width + x) * 4;
      this.rawImageData.data[i] = c[0];
      this.rawImageData.data[i + 1] = c[1];
      this.rawImageData.data[i + 2] = c[2];
      return this.rawImageData.data[i + 3] = c[3];
    };
    PixelData.prototype.labColor = function(x, y) {
      if (this.labColorData == null) {
        this.initLabColor();
      }
      if (this.labColorData[x][y]) {
        return this.labColorData[x][y];
      }
      return this.labColorData[x][y] = ImageUtil.xyzToLab(ImageUtil.rgbToXyz(this.color(x, y)));
    };
    PixelData.prototype.gradient = function(x, y, dx, dy) {
      var kernel;
      if (dx === -1 && dy === 0) {
        kernel = [[1, 0, -1], [2, 0, -2], [1, 0, -1]];
      } else if (dx === 1 && dy === 0) {
        kernel = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
      } else if (dx === 0 && dy === -1) {
        kernel = [[1, 2, 1], [0, 0, 0], [-1, -2, -1]];
      } else if (dx === 0 && dy === 1) {
        kernel = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
      } else {
        throw new Error("Invalid dx/dy for call to gradient");
      }
      return this.convolve(x, y, kernel);
    };
    PixelData.prototype.convolve = function(x, y, kernel) {
      var clampedX, clampedY, color, convolution, k, kx, ky, offset, size;
      convolution = [0, 0, 0];
      size = kernel.length;
      offset = Math.floor(size / 2);
      for (kx = 0; 0 <= size ? kx < size : kx > size; 0 <= size ? kx++ : kx--) {
        for (ky = 0; 0 <= size ? ky < size : ky > size; 0 <= size ? ky++ : ky--) {
          clampedX = Math.min(Math.max(x + kx - offset, 0), this.width - 1);
          clampedY = Math.min(Math.max(y + ky - offset, 0), this.height - 1);
          color = this.labColor(clampedX, clampedY);
          k = kernel[kx][ky];
          convolution[0] += color[0] * k;
          convolution[1] += color[1] * k;
          convolution[2] += color[2] * k;
        }
      }
      return convolution;
    };
    PixelData.prototype.imageDiff = function(imageData) {
      var diff, x, y, _ref, _ref2;
      if (this.width !== imageData.width || this.height !== imageData.height) {
        return Infinity;
      }
      diff = 0;
      for (x = 0, _ref = this.width; 0 <= _ref ? x < _ref : x > _ref; 0 <= _ref ? x++ : x--) {
        for (y = 0, _ref2 = this.height; 0 <= _ref2 ? y < _ref2 : y > _ref2; 0 <= _ref2 ? y++ : y--) {
          diff += ImageUtil.colorDifference(this.labColor(x, y), imageData.labColor(x, y));
        }
      }
      return diff / (this.width * this.height);
    };
    return PixelData;
  })();
  window.ImageUtil = ImageUtil;
  window.PixelData = PixelData;
}).call(this);
