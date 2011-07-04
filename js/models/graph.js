(function() {
  var Edge, Graph, ImageGraph, Node;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  };
  Node = (function() {
    function Node(id, val) {
      this.id = id;
      if (val == null) {
        val = null;
      }
      if (val != null) {
        this.val = val;
      }
    }
    return Node;
  })();
  Edge = (function() {
    function Edge(capacity) {
      this.capacity = capacity;
    }
    return Edge;
  })();
  Graph = (function() {
    Graph.prototype.SOURCE = "source";
    Graph.prototype.SINK = "sink";
    Graph.prototype.ROUNDING_TOLERANCE = 0.001;
    Graph.prototype.TERMINAL_WEIGHT_MULT = 10;
    Graph.prototype.TERMINAL_MULT_DECAY = 0.8;
    Graph.prototype.WEIGHT_TERMINAL_EDGES = true;
    Graph.prototype.SIMPLE_WEIGHT_CALC = false;
    function Graph() {
      this.numNodes = 0;
      this.nodes = {};
      this.edges = {};
      this.residualEdges = {};
      this.source = this.addNode(this.SOURCE, this.SOURCE);
      this.sink = this.addNode(this.SINK, this.SINK);
      this.source.tree = this.SOURCE;
      this.sink.tree = this.SINK;
      this.active = [this.source, this.sink];
      this.orphaned = [];
    }
    Graph.prototype.addNode = function(val, id) {
      var node;
      if (id == null) {
        id = null;
      }
      if ((id != null) && (this.nodes[id] != null)) {
        throw new Error("Duplicate node");
      }
            if (id != null) {
        id;
      } else {
        id = this.numNodes++;
      };
      this.nodes[id] = new Node(id, val);
      node = this.nodes[id];
      node.tree = null;
      node.parentId = null;
      return node;
    };
    Graph.prototype.addEdge = function(p, q, capacity) {
      var edge, _base, _base2, _base3, _base4, _base5, _name, _name2, _name3, _name4, _name5, _ref, _ref2, _ref3, _ref4, _ref5, _ref6;
      if ((_ref = this.edges[p.id]) != null ? _ref[q.id] : void 0) {
        throw new Error("Duplicate edge");
      }
      edge = new Edge(capacity);
            if ((_ref2 = (_base = this.edges)[_name = p.id]) != null) {
        _ref2;
      } else {
        _base[_name] = {};
      };
      this.edges[p.id][q.id] = edge;
      edge.flow = 0;
      if (p.id === void 0 || q.id === void 0) {
        throw new Error("Bad node in call to addEdge");
      }
            if ((_ref3 = (_base2 = this.residualEdges)[_name2 = p.id]) != null) {
        _ref3;
      } else {
        _base2[_name2] = {};
      };
            if ((_ref4 = (_base3 = this.residualEdges)[_name3 = q.id]) != null) {
        _ref4;
      } else {
        _base3[_name3] = {};
      };
            if ((_ref5 = (_base4 = this.residualEdges[p.id])[_name4 = q.id]) != null) {
        _ref5;
      } else {
        _base4[_name4] = new Edge(0);
      };
            if ((_ref6 = (_base5 = this.residualEdges[q.id])[_name5 = p.id]) != null) {
        _ref6;
      } else {
        _base5[_name5] = new Edge(0);
      };
      this.residualEdges[p.id][q.id].capacity += capacity;
      return edge;
    };
    Graph.prototype.setCapacity = function(p, q, capacity) {
      this.edges[p.id][q.id].capacity = capacity;
      return this.residualEdges[p.id][q.id].capacity = capacity;
    };
    Graph.prototype.setMultiSource = function(p) {
      p.multiSource = true;
      p.terminalDistance = 0;
      return this.addEdge(this.source, p, Infinity);
    };
    Graph.prototype.setMultiSink = function(p) {
      p.multiSink = true;
      p.terminalDistance = 0;
      return this.addEdge(p, this.sink, Infinity);
    };
    Graph.prototype.solve = function() {
      var path, _results;
      _results = [];
      while (true) {
        path = this.grow();
        if (path.length === 0) {
          break;
        } else {
          this.augment(path);
        }
        _results.push(this.adopt());
      }
      return _results;
    };
    Graph.prototype.maxFlow = function() {
      var flow, id;
      flow = 0;
      for (id in this.edges[this.source.id]) {
        flow += this.edges[this.source.id][id].flow;
      }
      return flow;
    };
    Graph.prototype.findTree = function(p) {
      var q, _i, _len, _ref;
      if (p.tree != null) {
        return p.tree;
      }
      _ref = this.neighbors(p);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        q = _ref[_i];
        if (q.tree != null) {
          return q.tree;
        }
        return this.findTree(q);
      }
    };
    Graph.prototype.partition = function() {
      var id, p;
      this.sourceNodes = [];
      this.sinkNodes = [];
      for (id in this.nodes) {
        p = this.nodes[id];
        if (p.tree == null) {
          p.tree = this.findTree(p);
        }
        if (p.tree === this.SOURCE) {
          this.sourceNodes.push(p);
        }
        if (p.tree === this.SINK) {
          this.sinkNodes.push(p);
        }
      }
      return [this.sourceNodes, this.sinkNodes];
    };
    Graph.prototype.grow = function() {
      var p, q, _i, _len, _ref, _ref2;
      while (this.active.length) {
        p = this.active[0];
        _ref = this.neighbors(p);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          q = _ref[_i];
          if (this.treeCapacity(p, q) > 0) {
            if (q.tree === null) {
              this.setTree(q, p.tree);
              this.setParent(q, p);
              this.addActive(q);
            } else if ((q.tree !== (_ref2 = p.tree) && _ref2 !== null)) {
              return this.getPath(p, q);
            }
          }
        }
        this.removeActive(p);
      }
      return [];
    };
    Graph.prototype.getPath = function(p, q) {
      var path, sinkNode, sourceNode;
      if (p.tree === null || q.tree === null || p.tree === q.tree) {
        throw new Error("Invalid nodes in call to getPath - p and q must be from different trees");
      }
      path = [];
      if (p.tree === this.SOURCE) {
        sourceNode = p;
      } else {
        sourceNode = q;
      }
      while (true) {
        path.unshift(sourceNode);
        if (sourceNode.parentId != null) {
          sourceNode = this.nodes[sourceNode.parentId];
        } else {
          break;
        }
      }
      if (p.tree === this.SINK) {
        sinkNode = p;
      } else {
        sinkNode = q;
      }
      while (true) {
        path.push(sinkNode);
        if (sinkNode.parentId != null) {
          sinkNode = this.nodes[sinkNode.parentId];
        } else {
          break;
        }
      }
      return path;
    };
    Graph.prototype.augment = function(path) {
      return this.addFlowToPath(path, this.bottleneckCapacity(path));
    };
    Graph.prototype.clamp = function(val, clamp) {
      if (val > clamp - this.ROUNDING_TOLERANCE && val < clamp + this.ROUNDING_TOLERANCE) {
        return clamp;
      } else {
        return val;
      }
    };
    Graph.prototype.addResidualCapacity = function(p, q, capacity) {
      return this.residualEdges[p.id][q.id].capacity += capacity;
    };
    Graph.prototype.removeResidualCapacity = function(p, q, capacity) {
      this.residualEdges[p.id][q.id].capacity = this.clamp(this.residualCapacity(p, q) - capacity, 0);
      if (this.residualCapacity(p, q) < 0) {
        throw new Error("Negative residual capacity");
      }
    };
    Graph.prototype.addFlow = function(p, q, flow) {
      var edge, edgeCapacity, _ref, _ref2, _ref3, _ref4;
      this.removeResidualCapacity(p, q, flow);
      this.addResidualCapacity(q, p, flow);
      if (this.residualCapacity(p, q) === 0) {
        if ((p.tree === (_ref = q.tree) && _ref === this.SOURCE)) {
          this.addOrphan(q);
        }
        if ((p.tree === (_ref2 = q.tree) && _ref2 === this.SINK)) {
          this.addOrphan(p);
        }
      }
      edge = (_ref3 = this.edges[p.id]) != null ? _ref3[q.id] : void 0;
      edgeCapacity = 0;
      if (edge != null) {
        edgeCapacity = edge.capacity - edge.flow;
        if (edgeCapacity < flow) {
          edge.flow += edgeCapacity;
          flow -= edgeCapacity;
        } else {
          edge.flow += flow;
          flow = 0;
        }
      }
      if (flow > 0) {
        edge = (_ref4 = this.edges[q.id]) != null ? _ref4[p.id] : void 0;
        if (edge != null) {
          edge.flow -= flow;
          return edge.flow = this.clamp(edge.flow, 0);
        }
      }
    };
    Graph.prototype.addFlowToPath = function(path, flow) {
      var i, _ref, _results;
      _results = [];
      for (i = 0, _ref = path.length - 1; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
        _results.push(this.addFlow(path[i], path[i + 1], flow));
      }
      return _results;
    };
    Graph.prototype.residualCapacity = function(p, q) {
      return this.residualEdges[p.id][q.id].capacity;
    };
    Graph.prototype.bottleneckCapacity = function(path) {
      var capacity, i, minCapacity, p, q, _ref;
      minCapacity = Infinity;
      for (i = 0, _ref = path.length - 1; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
        p = path[i];
        q = path[i + 1];
        capacity = this.residualCapacity(p, q);
        if (capacity < minCapacity) {
          minCapacity = capacity;
        }
      }
      if (minCapacity <= 0) {
        throw new Error("No residual capacity in this path");
      }
      return minCapacity;
    };
    Graph.prototype.adopt = function() {
      var _results;
      _results = [];
      while (this.orphaned.length) {
        _results.push(this.process(this.orphaned.pop()));
      }
      return _results;
    };
    Graph.prototype.process = function(p) {
      var q, _i, _len, _ref;
      if (this.findParent(p)) {
        return;
      }
      _ref = this.neighbors(p);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        q = _ref[_i];
        if (q.tree === p.tree) {
          if (this.treeCapacity(q, p) > 0) {
            this.addActive(q);
          }
          if (q.parentId === p.id) {
            this.addOrphan(q);
          }
        }
      }
      this.setTree(p, null);
      return this.removeActive(p);
    };
    Graph.prototype.setTree = function(p, tree) {
      return p.tree = tree;
    };
    Graph.prototype.setParent = function(child, parent) {
      if (parent.tree == null) {
        throw new Error("Invalid parent");
      }
      if (parent != null) {
        return child.parentId = parent.id;
      } else {
        return child.parentId = null;
      }
    };
    Graph.prototype.neighbors = function(p) {
      var id, nodes;
      nodes = [];
      for (id in this.residualEdges[p.id]) {
        if (this.nodes[id] === void 0) {
          throw "Undefined edge";
        }
        nodes.push(this.nodes[id]);
      }
      return nodes;
    };
    Graph.prototype.outgoingNeighbors = function(p) {
      var id, _results;
      _results = [];
      for (id in this.edges[p.id]) {
        _results.push(this.nodes[id]);
      }
      return _results;
    };
    Graph.prototype.treeCapacity = function(p, q) {
      if (!p || !q) {
        throw new Error("Invalid node in call to treeCapacity");
      }
      if (p.tree === this.SOURCE) {
        return this.residualEdges[p.id][q.id].capacity;
      } else if (p.tree === this.SINK) {
        return this.residualEdges[q.id][p.id].capacity;
      } else {
        throw new Error("treeCapacity called on node with no tree");
      }
    };
    Graph.prototype.addOrphan = function(p) {
      if (this.orphaned.indexOf(p) !== -1) {
        throw new Error("Node is already in the orphaned list");
      }
      p.parentId = null;
      return this.orphaned.push(p);
    };
    Graph.prototype.addActive = function(p) {
      if (this.active.indexOf(p) === -1) {
        return this.active.push(p);
      }
    };
    Graph.prototype.removeActive = function(p) {
      var i;
      i = this.active.indexOf(p);
      return this.active.splice(i, 1);
    };
    Graph.prototype.findParent = function(p) {
      var q, _i, _len, _ref;
      _ref = this.neighbors(p);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        q = _ref[_i];
        if (q.tree === p.tree && this.treeCapacity(q, p) > 0 && this.isRooted(q)) {
          this.setParent(p, q);
          return true;
        }
      }
      return false;
    };
    Graph.prototype.isRooted = function(p) {
      while (p.parent != null) {
        if (q.parentId === this.SOURCE || q.parentId === this.SINK) {
          return true;
        }
      }
      return false;
    };
    Graph.prototype.validatePath = function(path) {
      var edge, i, _ref, _results;
      if (path.length === 0) {
        return true;
      }
      if (path[0] !== this.source) {
        throw new Error("Path must start at source");
      }
      if (path[path.length - 1] !== this.sink) {
        throw new Error("Path must end at sink");
      }
      _results = [];
      for (i = 0, _ref = path.length - 1; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
        edge = this.edges[path[i].id][path[i + 1].id];
        if (edge == null) {
          throw new Error("Path has a gap");
        }
        _results.push((function() {
          if (edge.flow === Infinity) {
            throw new Error("Infinite flow");
          }
        })());
      }
      return _results;
    };
    Graph.prototype.validateFlow = function() {
      if (this.sourceFlow() !== this.sinkFlow()) {
        throw new Error("Source and sink flows don't match");
      }
    };
    Graph.prototype.printPath = function(path) {
      var p, pathVals, _i, _len;
      pathVals = [];
      for (_i = 0, _len = path.length; _i < _len; _i++) {
        p = path[_i];
        if (p === this.source) {
          pathVals.push("SOURCE");
        } else if (p === this.sink) {
          pathVals.push("SINK");
        } else {
          pathVals.push("(" + p.val.x + "," + p.val.y + ")");
        }
      }
      return console.debug(pathVals.join(" - "));
    };
    return Graph;
  })();
  ImageGraph = (function() {
    __extends(ImageGraph, Graph);
    function ImageGraph(imageData1, imageData2, weightData) {
      var i, leftNode, node, topNode, totalWeight, weight, x, y, _ref, _ref2, _ref3, _ref4, _ref5;
      if (weightData == null) {
        weightData = null;
      }
      ImageGraph.__super__.constructor.call(this);
      if (imageData1.width !== imageData2.width || imageData1.height !== imageData2.height) {
        throw "Image dimensions don't match";
      }
      this.imageData1 = new PixelData(imageData1);
      this.imageData2 = new PixelData(imageData2);
      if (weightData != null) {
        this.weightData = new PixelData(weightData);
      }
      this.width = this.imageData1.width;
      this.height = this.imageData1.height;
      this.edgeMult = 4;
      this.edgeMultDecay = 0.8;
      this.fullGraph = true;
      totalWeight = 0;
      for (y = 0, _ref = this.height; 0 <= _ref ? y < _ref : y > _ref; 0 <= _ref ? y++ : y--) {
        for (x = 0, _ref2 = this.width; 0 <= _ref2 ? x < _ref2 : x > _ref2; 0 <= _ref2 ? x++ : x--) {
          node = this.addNode({
            x: x,
            y: y
          });
          if (x > 0) {
            leftNode = this.getNode(x - 1, y);
            weight = this.weight(x - 1, y, x, y);
            totalWeight += weight;
            this.addEdge(leftNode, node, weight);
            this.addEdge(node, leftNode, weight);
          }
          if (y > 0) {
            topNode = this.getNode(x, y - 1);
            weight = this.weight(x, y - 1, x, y);
            totalWeight += weight;
            this.addEdge(node, topNode, weight);
            this.addEdge(topNode, node, weight);
            if (this.width !== this.height || this.width % 2 !== 0) {
              throw "Wang tiles must be square with even width and height";
            }
          }
        }
      }
      this.meanWeight = totalWeight / (2 * this.numNodes);
      for (x = 0, _ref3 = this.width; 0 <= _ref3 ? x < _ref3 : x > _ref3; 0 <= _ref3 ? x++ : x--) {
        this.setMultiSource(this.getNode(x, 0));
        this.setMultiSource(this.getNode(x, this.height - 1));
      }
      for (y = 1, _ref4 = this.height - 1; 1 <= _ref4 ? y < _ref4 : y > _ref4; 1 <= _ref4 ? y++ : y--) {
        this.setMultiSource(this.getNode(0, y));
        this.setMultiSource(this.getNode(this.width - 1, y));
      }
      for (i = 1, _ref5 = this.width - 1; 1 <= _ref5 ? i < _ref5 : i > _ref5; 1 <= _ref5 ? i++ : i--) {
        this.setMultiSink(this.getNode(i, i));
        this.setMultiSink(this.getNode(i, this.height - 1 - i));
      }
    }
    ImageGraph.prototype.getNode = function(x, y) {
      return this.nodes[y * this.height + x];
    };
    ImageGraph.prototype.getEdge = function(px, py, qx, qy) {
      return this.edges[py * this.width + px][qy * this.width + qx];
    };
    ImageGraph.prototype.weight = function(sx, sy, tx, ty) {
      var diff, dx, dy, gs1, gs2, gt1, gt2, mult, s1, s2, sw, t1, t2;
      if (this.weightData) {
        sw = this.weightData.color(sx, sy)[0] / 255;
        return 0.1 + sw;
      }
      s1 = this.imageData1.labColor(sx, sy);
      s2 = this.imageData2.labColor(sx, sy);
      t1 = this.imageData1.labColor(tx, ty);
      t2 = this.imageData2.labColor(tx, ty);
      diff = ImageUtil.colorDifference(s1, s2) + ImageUtil.colorDifference(t1, t2);
      if (this.SIMPLE_WEIGHT_CALC) {
        return diff;
      }
      dx = tx - sx;
      dy = ty - sy;
      gs1 = ImageUtil.magnitude(this.imageData1.gradient(sx, sy, dx, dy));
      gs2 = ImageUtil.magnitude(this.imageData2.gradient(sx, sy, dx, dy));
      gt1 = ImageUtil.magnitude(this.imageData1.gradient(tx, ty, dx, dy));
      gt2 = ImageUtil.magnitude(this.imageData2.gradient(tx, ty, dx, dy));
      mult = 1;
      if (sx === 0 || tx === 0 || sx === (this.width - 1) || tx === (this.width - 1) || sy === 0 || ty === 0 || sy === (this.height - 1) || ty === (this.height - 1)) {
        mult = this.TERMINAL_WEIGHT_MULT;
      }
      if (sx === sy || tx === ty || sx === (this.height - 1 - sy) || tx === (this.height - 1 - ty)) {
        mult = this.TERMINAL_WEIGHT_MULT;
      }
      return mult * diff / (gs1 + gs2 + gt1 + gt2);
    };
    ImageGraph.prototype.colorDifference = function(sx, sy, tx, ty) {
      var s1, s2, t1, t2;
      s1 = this.imageData1.labColor(sx, sy);
      s2 = this.imageData2.labColor(sx, sy);
      t1 = this.imageData1.labColor(tx, ty);
      t2 = this.imageData2.labColor(tx, ty);
      return ImageUtil.colorDifference(s1, s2) + ImageUtil.colorDifference(t1, t2);
    };
    ImageGraph.prototype.terminalDistance = function(x, y) {
      var sinkDist, sourceDist;
      if (x === 0 || y === 0) {
        return 0;
      }
      sourceDist = Math.min(x, this.width - x - 1, y, this.height - y - 1);
      if (x < y) {
        sinkDist = y - x;
      } else if (x === y) {
        return 0;
      } else {
        sinkDist = x - y;
      }
      if (x < this.height - 1 - y) {
        sinkDist = Math.min(sinkDist, this.height - 1 - y - x);
      } else if (x === this.height - 1 - y) {
        return 0;
      } else {
        sinkDist = Math.min(sinkDist, x - this.height + 1 + y);
      }
      return Math.min(sourceDist, sinkDist);
    };
    ImageGraph.prototype.isTerminal = function(p) {
      return p === this.source || p === this.sink;
    };
    ImageGraph.prototype.getWeightMult = function(x, y) {
      var weightMult;
      weightMult = this.TERMINAL_WEIGHT_MULT * Math.pow(this.TERMINAL_WEIGHT_DECAY, this.terminalDistance(x, y));
      if (weightMult < 1) {
        return 1;
      } else {
        return weightMult;
      }
    };
    ImageGraph.prototype.computeGraft = function() {
      this.solve();
      return this.partition();
    };
    ImageGraph.prototype.drawPath = function(context) {
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
    ImageGraph.prototype.drawXWeight = function(context) {
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
    ImageGraph.prototype.drawYWeight = function(context) {
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
    ImageGraph.prototype.drawDiff = function(context) {
      var c1, c2, diff, imageData, maxDiff, rawImageData, x, y, _ref, _ref2;
      rawImageData = context.createImageData(this.width, this.height);
      imageData = new PixelData(rawImageData);
      maxDiff = ImageUtil.colorDifference([100, 127, 127], [0, -128, -128]);
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
    ImageGraph.prototype.drawXGradientSum = function(context) {
      return this.drawGradientSum(context, 1, 0);
    };
    ImageGraph.prototype.drawYGradientSum = function(context) {
      return this.drawGradientSum(context, 0, 1);
    };
    ImageGraph.prototype.drawX1Gradient = function(context) {
      return this.drawGradient(context, this.imageData1, 1, 0);
    };
    ImageGraph.prototype.drawX2Gradient = function(context) {
      return this.drawGradient(context, this.imageData2, 1, 0);
    };
    ImageGraph.prototype.drawY1Gradient = function(context) {
      return this.drawGradient(context, this.imageData1, 0, 1);
    };
    ImageGraph.prototype.drawY2Gradient = function(context) {
      return this.drawGradient(context, this.imageData2, 0, 1);
    };
    ImageGraph.prototype.drawGradient = function(context, image, dx, dy) {
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
    ImageGraph.prototype.drawGradientSum = function(context, dx, dy) {
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
    ImageGraph.prototype.drawWangTile = function(context) {
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
    ImageGraph.prototype.printWangTile = function() {
      var node, x, y, _i, _j, _len, _len2, _ref, _ref2, _results;
      console.debug("---------- SOURCE ----------");
      _ref = this.sourceNodes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        x = node.val.x;
        y = node.val.y;
        console.debug("(" + x + "," + y + ")");
      }
      console.debug("---------- SINK ----------");
      _ref2 = this.sinkNodes;
      _results = [];
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        node = _ref2[_j];
        x = node.val.x;
        y = node.val.y;
        _results.push(console.debug("(" + x + "," + y + ")"));
      }
      return _results;
    };
    return ImageGraph;
  })();
  window.Node = Node;
  window.Edge = Edge;
  window.Graph = Graph;
  window.ImageGraph = ImageGraph;
}).call(this);
