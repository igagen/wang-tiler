(function() {
  var ImageGraph;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  };
  ImageGraph = (function() {
    __extends(ImageGraph, Graph);
    function ImageGraph(imageData1, imageData2, weightData) {
      var node, x, y, _ref, _ref2;
      if (weightData == null) {
        weightData = null;
      }
      ImageGraph.__super__.constructor.call(this);
      if (imageData1.width !== imageData2.width || imageData1.height !== imageData2.height) {
        throw "Image dimensions don't match";
      }
      this.imageData1 = new PixelData(imageData1);
      this.imageData2 = new PixelData(imageData2);
      this.width = this.imageData1.width;
      this.height = this.imageData1.height;
      for (y = 0, _ref = this.height; 0 <= _ref ? y < _ref : y > _ref; 0 <= _ref ? y++ : y--) {
        for (x = 0, _ref2 = this.width; 0 <= _ref2 ? x < _ref2 : x > _ref2; 0 <= _ref2 ? x++ : x--) {
          node = this.addNode({
            x: x,
            y: y
          });
        }
      }
    }
    ImageGraph.prototype.getNode = function(x, y) {
      return this.nodes[y * this.height + x];
    };
    ImageGraph.prototype.getEdge = function(p, q) {
      return this.edges[p.id][q.id];
    };
    ImageGraph.prototype.colorDifference = function(sx, sy, tx, ty) {
      var s1, s2, t1, t2;
      s1 = this.imageData1.color(sx, sy);
      s2 = this.imageData2.color(sx, sy);
      t1 = this.imageData1.color(tx, ty);
      t2 = this.imageData2.color(tx, ty);
      return ImageUtil.colorDifference(s1, s2) + ImageUtil.colorDifference(t1, t2);
    };
    ImageGraph.prototype.labColorDifference = function(sx, sy, tx, ty) {
      var s1, s2, t1, t2;
      s1 = this.imageData1.labColor(sx, sy);
      s2 = this.imageData2.labColor(sx, sy);
      t1 = this.imageData1.labColor(tx, ty);
      t2 = this.imageData2.labColor(tx, ty);
      return ImageUtil.colorDifference(s1, s2) + ImageUtil.colorDifference(t1, t2);
    };
    ImageGraph.prototype.isTerminal = function(p) {
      return p === this.source || p === this.sink;
    };
    ImageGraph.prototype.computeGraft = function() {
      this.solve();
      return this.partition();
    };
    ImageGraph.prototype.weight = function(sx, sy, tx, ty) {
      var diff, dx, dy, gs1, gs2, gt1, gt2, sw;
      if (this.weightData) {
        sw = this.weightData.color(sx, sy)[0] / 255;
        return 0.1 + sw;
      }
      diff = this.colorDifference(sx, sy, tx, ty);
      if (this.SIMPLE_WEIGHT_CALC) {
        return diff;
      }
      dx = tx - sx;
      dy = ty - sy;
      gs1 = ImageUtil.magnitude(this.imageData1.gradient(sx, sy, dx, dy));
      gs2 = ImageUtil.magnitude(this.imageData2.gradient(sx, sy, dx, dy));
      gt1 = ImageUtil.magnitude(this.imageData1.gradient(tx, ty, dx, dy));
      gt2 = ImageUtil.magnitude(this.imageData2.gradient(tx, ty, dx, dy));
      return diff / (gs1 + gs2 + gt1 + gt2);
    };
    return ImageGraph;
  })();
  window.ImageGraph = ImageGraph;
}).call(this);
