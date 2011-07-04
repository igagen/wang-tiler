(function() {
  var WangTile;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  };
  WangTile = (function() {
    __extends(WangTile, ImageGraph);
    WangTile.prototype.ROUNDING_TOLERANCE = 0.001;
    WangTile.prototype.TERMINAL_WEIGHT_MULT = 5;
    WangTile.prototype.TERMINAL_MULT_DECAY = 0.6;
    WangTile.prototype.WEIGHT_TERMINAL_EDGES = true;
    WangTile.prototype.ADD_DIAGONAL_EDGES = true;
    WangTile.prototype.SIMPLE_WEIGHT_CALC = false;
    function WangTile(imageData1, imageData2, weightData) {
      var base, bottomLeftDiff, bottomRightDiff, diffSum, i, l, l2ulw, leftNode, luh, lw, maxRegionDiff, n, node, r, r2urw, regionSize, ruh, rw, topLeftDiff, topNode, topRightDiff, u, u2ulw, u2urw, ul, ulh, ur, urh, uw, weight, weightSum, x, y, _ref, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7;
      if (weightData == null) {
        weightData = null;
      }
      WangTile.__super__.constructor.call(this, imageData1, imageData2);
      if (this.width !== this.height || this.width % 2 !== 0) {
        throw "Wang tiles must be square with even width and height";
      }
      this.size = this.width;
      maxRegionDiff = 0;
      regionSize = Math.floor(this.size / 4);
      base = this.size - regionSize - 1;
      topLeftDiff = this.imageData1.regionDiff(this.imageData2, 0, 0, regionSize, regionSize);
      topRightDiff = this.imageData1.regionDiff(this.imageData2, base, 0, regionSize, regionSize);
      bottomRightDiff = this.imageData1.regionDiff(this.imageData2, base, base, regionSize, regionSize);
      bottomLeftDiff = this.imageData1.regionDiff(this.imageData2, 0, 0, regionSize, regionSize);
      this.maxRegionDiff = Math.max(topLeftDiff, topRightDiff, bottomRightDiff, bottomLeftDiff);
      console.debug("Region diff: " + this.maxRegionDiff + " - (" + topLeftDiff + ", " + topRightDiff + ", " + bottomRightDiff + ", " + bottomLeftDiff + ")");
      if (weightData != null) {
        this.weightData = new PixelData(weightData);
      }
      weightSum = 0;
      diffSum = 0;
      for (y = 0, _ref = this.height; 0 <= _ref ? y < _ref : y > _ref; 0 <= _ref ? y++ : y--) {
        for (x = 0, _ref2 = this.width; 0 <= _ref2 ? x < _ref2 : x > _ref2; 0 <= _ref2 ? x++ : x--) {
          node = this.getNode(x, y);
          diffSum += ImageUtil.colorDifference(this.imageData1.color(x, y), this.imageData2.color(x, y));
          if (x > 0) {
            leftNode = this.getNode(x - 1, y);
            weight = this.weight(x - 1, y, x, y);
            weightSum += weight;
            this.addEdge(leftNode, node, weight);
            this.addEdge(node, leftNode, weight);
          }
          if (y > 0) {
            topNode = this.getNode(x, y - 1);
            weight = this.weight(x, y - 1, x, y);
            weightSum += weight;
            this.addEdge(node, topNode, weight);
            this.addEdge(topNode, node, weight);
          }
        }
      }
      this.avgDiff = diffSum / this.numNodes;
      if (this.ADD_DIAGONAL_EDGES) {
        for (x = 0, _ref3 = this.width; 0 <= _ref3 ? x < _ref3 : x > _ref3; 0 <= _ref3 ? x++ : x--) {
          for (y = 1, _ref4 = this.height; 1 <= _ref4 ? y < _ref4 : y > _ref4; 1 <= _ref4 ? y++ : y--) {
            n = this.getNode(x, y);
            u = this.getNode(x, y - 1);
            uw = this.getEdge(n, u).capacity;
            if (x > 0 && y > 0) {
              l = this.getNode(x - 1, y);
              ul = this.getNode(x - 1, y - 1);
              lw = this.getEdge(n, l).capacity;
              l2ulw = this.getEdge(l, ul).capacity;
              u2ulw = this.getEdge(u, ul).capacity;
              luh = Math.sqrt(lw * lw + l2ulw * l2ulw);
              ulh = Math.sqrt(uw * uw + u2ulw * u2ulw);
              weight = Math.min(luh, ulh);
              this.addEdge(n, ul, weight);
              this.addEdge(ul, n, weight);
            }
            if (x < (this.width - 1) && y > 0) {
              r = this.getNode(x + 1, y);
              ur = this.getNode(x + 1, y - 1);
              rw = this.getEdge(n, r).capacity;
              r2urw = this.getEdge(r, ur).capacity;
              u2urw = this.getEdge(u, ur).capacity;
              ruh = Math.sqrt(rw * rw + r2urw * r2urw);
              urh = Math.sqrt(uw * uw + u2urw * u2urw);
              weight = Math.min(ruh, urh);
              this.addEdge(n, ur, weight);
              this.addEdge(ur, n, weight);
            }
          }
        }
      }
      this.meanWeight = weightSum / (2 * this.numNodes);
      for (x = 0, _ref5 = this.width; 0 <= _ref5 ? x < _ref5 : x > _ref5; 0 <= _ref5 ? x++ : x--) {
        this.setMultiSource(this.getNode(x, 0));
        this.setMultiSource(this.getNode(x, this.height - 1));
      }
      for (y = 1, _ref6 = this.height - 1; 1 <= _ref6 ? y < _ref6 : y > _ref6; 1 <= _ref6 ? y++ : y--) {
        this.setMultiSource(this.getNode(0, y));
        this.setMultiSource(this.getNode(this.width - 1, y));
      }
      for (i = 1, _ref7 = this.width - 1; 1 <= _ref7 ? i < _ref7 : i > _ref7; 1 <= _ref7 ? i++ : i--) {
        this.setMultiSink(this.getNode(i, i));
        this.setMultiSink(this.getNode(i, this.height - 1 - i));
      }
    }
    WangTile.prototype.weight = function(sx, sy, tx, ty) {
      var mult;
      mult = 1;
      if (sx === 0 || tx === 0 || sx === (this.width - 1) || tx === (this.width - 1) || sy === 0 || ty === 0 || sy === (this.height - 1) || ty === (this.height - 1)) {
        mult = this.TERMINAL_WEIGHT_MULT;
      }
      if (sx === sy || tx === ty || sx === (this.height - 1 - sy) || tx === (this.height - 1 - ty)) {
        mult = this.TERMINAL_WEIGHT_MULT;
      }
      return mult * WangTile.__super__.weight.call(this, sx, sy, tx, ty);
    };
    WangTile.prototype.drawWangTile = function(context) {
      var imageData, node, rawImageData, x, y, _i, _j, _len, _len2, _ref, _ref2;
      rawImageData = context.createImageData(this.width, this.height);
      imageData = new PixelData(rawImageData);
      _ref = this.sourceNodes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        x = node.val.x;
        y = node.val.y;
        imageData.setColor(x, y, this.imageData1.color(x, y));
      }
      _ref2 = this.sinkNodes;
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        node = _ref2[_j];
        x = node.val.x;
        y = node.val.y;
        imageData.setColor(x, y, this.imageData2.color(x, y));
      }
      return context.putImageData(imageData.rawImageData, 0, 0);
    };
    WangTile.prototype.drawPath = function(context) {
      var imageData, node, rawImageData, x, y, _i, _j, _len, _len2, _ref, _ref2;
      rawImageData = context.createImageData(this.width, this.height);
      imageData = new PixelData(rawImageData);
      _ref = this.sourceNodes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        x = node.val.x;
        y = node.val.y;
        imageData.setColor(x, y, [0, 255, 255, 255]);
      }
      _ref2 = this.sinkNodes;
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        node = _ref2[_j];
        x = node.val.x;
        y = node.val.y;
        imageData.setColor(x, y, this.imageData2.color(x, y));
      }
      return context.putImageData(rawImageData, 0, 0);
    };
    WangTile.prototype.drawXWeight = function(context) {
      var imageData, maxWeight, rawImageData, weight, x, y, _ref, _ref2;
      rawImageData = context.createImageData(this.width, this.height);
      imageData = new PixelData(rawImageData);
      maxWeight = this.meanWeight * 2;
      for (x = 0, _ref = this.width - 1; 0 <= _ref ? x < _ref : x > _ref; 0 <= _ref ? x++ : x--) {
        for (y = 0, _ref2 = this.height; 0 <= _ref2 ? y < _ref2 : y > _ref2; 0 <= _ref2 ? y++ : y--) {
          weight = Math.min(this.weight(x, y, x + 1, y) / maxWeight, 1);
          imageData.setColor(x, y, [weight * 255, weight * 255, weight * 255, 255]);
        }
      }
      return context.putImageData(rawImageData, 0, 0);
    };
    WangTile.prototype.drawYWeight = function(context) {
      var imageData, maxWeight, rawImageData, weight, x, y, _ref, _ref2;
      rawImageData = context.createImageData(this.width, this.height);
      imageData = new PixelData(rawImageData);
      maxWeight = this.meanWeight * 2;
      for (x = 0, _ref = this.width; 0 <= _ref ? x < _ref : x > _ref; 0 <= _ref ? x++ : x--) {
        for (y = 0, _ref2 = this.height - 1; 0 <= _ref2 ? y < _ref2 : y > _ref2; 0 <= _ref2 ? y++ : y--) {
          weight = Math.min(this.weight(x, y, x, y + 1) / maxWeight, 1);
          imageData.setColor(x, y, [weight * 255, weight * 255, weight * 255, 255]);
        }
      }
      return context.putImageData(rawImageData, 0, 0);
    };
    WangTile.prototype.drawDiff = function(context) {
      var c1, c2, diff, imageData, maxDiff, rawImageData, x, y, _ref, _ref2;
      rawImageData = context.createImageData(this.width, this.height);
      imageData = new PixelData(rawImageData);
      maxDiff = ImageUtil.colorDifference([100, 127, 127], [0, -128, -128]) / 4;
      for (x = 0, _ref = this.width; 0 <= _ref ? x < _ref : x > _ref; 0 <= _ref ? x++ : x--) {
        for (y = 0, _ref2 = this.height; 0 <= _ref2 ? y < _ref2 : y > _ref2; 0 <= _ref2 ? y++ : y--) {
          c1 = this.imageData1.labColor(x, y);
          c2 = this.imageData2.labColor(x, y);
          diff = ImageUtil.colorDifference(c1, c2) / maxDiff;
          imageData.setColor(x, y, [diff * 255, diff * 255, diff * 255, 255]);
        }
      }
      return context.putImageData(rawImageData, 0, 0);
    };
    WangTile.prototype.drawXGradientSum = function(context) {
      return this.drawGradientSum(context, 1, 0);
    };
    WangTile.prototype.drawYGradientSum = function(context) {
      return this.drawGradientSum(context, 0, 1);
    };
    WangTile.prototype.drawX1Gradient = function(context) {
      return this.drawGradient(context, this.imageData1, 1, 0);
    };
    WangTile.prototype.drawX2Gradient = function(context) {
      return this.drawGradient(context, this.imageData2, 1, 0);
    };
    WangTile.prototype.drawY1Gradient = function(context) {
      return this.drawGradient(context, this.imageData1, 0, 1);
    };
    WangTile.prototype.drawY2Gradient = function(context) {
      return this.drawGradient(context, this.imageData2, 0, 1);
    };
    WangTile.prototype.drawGradient = function(context, image, dx, dy) {
      var g, imageData, maxGrad, rawImageData, x, y, _ref, _ref2;
      rawImageData = context.createImageData(this.width, this.height);
      imageData = new PixelData(rawImageData);
      maxGrad = ImageUtil.magnitude([100, -128, -128]);
      for (x = 0, _ref = this.width; 0 <= _ref ? x < _ref : x > _ref; 0 <= _ref ? x++ : x--) {
        for (y = 0, _ref2 = this.height; 0 <= _ref2 ? y < _ref2 : y > _ref2; 0 <= _ref2 ? y++ : y--) {
          g = ImageUtil.magnitude(image.gradient(x, y, dx, dy)) / maxGrad;
          imageData.setColor(x, y, [g * 255, g * 255, g * 255, 255]);
        }
      }
      return context.putImageData(rawImageData, 0, 0);
    };
    WangTile.prototype.drawGradientSum = function(context, dx, dy) {
      var g1, g2, gSum, imageData, maxGrad, rawImageData, x, y, _ref, _ref2;
      rawImageData = context.createImageData(this.width, this.height);
      imageData = new PixelData(rawImageData);
      maxGrad = ImageUtil.magnitude([100, -128, -128]);
      for (x = 0, _ref = this.width; 0 <= _ref ? x < _ref : x > _ref; 0 <= _ref ? x++ : x--) {
        for (y = 0, _ref2 = this.height; 0 <= _ref2 ? y < _ref2 : y > _ref2; 0 <= _ref2 ? y++ : y--) {
          g1 = ImageUtil.magnitude(this.imageData1.gradient(x, y, dx, dy)) / maxGrad;
          g2 = ImageUtil.magnitude(this.imageData1.gradient(x, y, dx, dy)) / maxGrad;
          gSum = (g1 + g2) / 2;
          imageData.setColor(x, y, [gSum * 255, gSum * 255, gSum * 255, 255]);
        }
      }
      return context.putImageData(rawImageData, 0, 0);
    };
    return WangTile;
  })();
  window.WangTile = WangTile;
}).call(this);
