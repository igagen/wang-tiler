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
    function Node(val) {
      this.val = val;
      this.parent = null;
      this.parentEdge = null;
      this.tree = null;
      this.edges = [];
    }
    Node.prototype.addEdge = function(node, capacity) {
      var edge;
      edge = new Edge(this, node, capacity);
      this.edges.push(edge);
      node.edges.push(edge);
      return edge;
    };
    return Node;
  })();
  Edge = (function() {
    function Edge(src, dest, capacity) {
      this.src = src;
      this.dest = dest;
      this.capacity = capacity;
      this.flow = 0;
    }
    Edge.prototype.residualCapacity = function() {
      return this.capacity - this.flow;
    };
    Edge.prototype.saturated = function() {
      return this.flow === this.capacity;
    };
    return Edge;
  })();
  Graph = (function() {
    function Graph() {
      this.nodes = [];
      this.source = this.addNode(new Node("source"));
      this.sink = this.addNode(new Node("sink"));
      this.source.tree = "source";
      this.sink.tree = "sink";
      this.active = [this.source, this.sink];
      this.orphaned = [];
    }
    Graph.prototype.addNode = function(node) {
      this.nodes.push(node);
      return node;
    };
    Graph.prototype.setParent = function(node, parent, edge) {
      if (parent.tree === null) {
        throw new Error("Can't set parent to a node with no tree");
      }
      if (parent.tree === "source" && (edge.src !== parent || edge.dest !== node)) {
        throw new Error("Invalid edge");
      }
      if (parent.tree === "sink" && (edge.dest !== parent || edge.src !== node)) {
        throw new Error("Invalid edge");
      }
      node.parent = parent;
      node.parentEdge = edge;
      return node.tree = parent.tree;
    };
    Graph.prototype.orphan = function(node) {
      node.parentEdge = null;
      node.parent = null;
      if (this.orphaned.indexOf(node) === -1) {
        return this.orphaned.push(node);
      }
    };
    Graph.prototype.validatePath = function(path) {
      var edge, i, _i, _len, _ref, _results;
      if (path.length === 0) {
        return;
      }
      if (path[0].src !== this.source) {
        throw new Error("Path must start at source");
      }
      if (path[path.length - 1].dest !== this.sink) {
        throw new Error("Path must start at sink");
      }
      for (i = 0, _ref = path.length - 1; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
        if (path[i].dest !== path[i + 1].src) {
          throw new Error("Interior path edges must match");
        }
      }
      _results = [];
      for (_i = 0, _len = path.length; _i < _len; _i++) {
        edge = path[_i];
        _results.push((function() {
          if (edge.flow === Infinity) {
            throw new Error("Infinite flow");
          }
        })());
      }
      return _results;
    };
    Graph.prototype.printEdge = function(edge) {
      var d, s;
      s = edge.src.val;
      d = edge.dest.val;
      return console.debug("" + (s.x !== void 0 ? "(" + s.x + ", " + s.y + ") - " : "(" + s + ") - ") + " " + (d.x !== void 0 ? "(" + d.x + ", " + d.y + "): " : "(" + d + "): ") + " " + edge.flow + " / " + edge.capacity);
    };
    Graph.prototype.printPath = function(path) {
      var edge, _i, _len, _results;
      console.debug("-------- Path -------");
      _results = [];
      for (_i = 0, _len = path.length; _i < _len; _i++) {
        edge = path[_i];
        _results.push(this.printEdge(edge));
      }
      return _results;
    };
    Graph.prototype.sourceFlow = function() {
      var edge, sourceFlow, _i, _len, _ref;
      sourceFlow = 0;
      _ref = this.source.edges;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        edge = _ref[_i];
        sourceFlow += edge.flow;
      }
      return sourceFlow;
    };
    Graph.prototype.sinkFlow = function() {
      var edge, sinkFlow, _i, _len, _ref;
      sinkFlow = 0;
      _ref = this.source.edges;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        edge = _ref[_i];
        sinkFlow += edge.flow;
      }
      return sinkFlow;
    };
    Graph.prototype.validateFlow = function() {
      if (this.sourceFlow() !== this.sinkFlow()) {
        throw new Error("Source and sink flows don't match");
      }
    };
    Graph.prototype.computeMaxFlow = function() {
      var path;
      while (true) {
        path = this.grow();
        if (path.length === 0) {
          break;
        } else {
          this.augment(path);
        }
        this.validateFlow();
        this.adopt();
      }
      this.validateFlow();
      return this.maxFlow = this.sourceFlow();
    };
    Graph.prototype.partition = function() {
      var node, _i, _len, _ref, _results;
      this.sourceNodes = [];
      this.sinkNodes = [];
      _ref = this.nodes;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        _results.push(node.tree === "sink" ? this.sourceNodes.push(node) : node.tree === "sink" ? this.sinkNodes.push(node) : this.sourceNodes.push(node));
      }
      return _results;
    };
    Graph.prototype.getPath = function(p, q) {
      var edge, path, sinkNode, sourceNode, _i, _len, _ref;
      path = [];
      if (p.tree === "source") {
        sourceNode = p;
        sinkNode = q;
      } else {
        sourceNode = q;
        sinkNode = p;
      }
      _ref = sourceNode.edges;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        edge = _ref[_i];
        if (edge.dest === sinkNode) {
          path.push(edge);
          break;
        }
      }
      while (sourceNode.parent) {
        path.unshift(sourceNode.parentEdge);
        sourceNode = sourceNode.parent;
      }
      while (sinkNode.parent) {
        path.push(sinkNode.parentEdge);
        sinkNode = sinkNode.parent;
      }
      this.validatePath(path);
      return path;
    };
    Graph.prototype.grow = function() {
      var edge, p, q, _i, _len, _ref;
      while (this.active.length) {
        p = this.active[0];
        q = null;
        _ref = p.edges;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          edge = _ref[_i];
          if (edge.residualCapacity() > 0) {
            if (p.tree === "source" && edge.src === p || p.tree === "sink" && edge.dest === p) {
              q = (edge.src === p ? edge.dest : edge.src);
              if (q.tree === null) {
                this.setParent(q, p, edge);
                this.addActive(q);
              } else if (q.tree !== p.tree) {
                return this.getPath(p, q);
              }
            }
          }
        }
        this.active.shift();
      }
      return [];
    };
    Graph.prototype.augment = function(path) {
      var edge, minCapacity, _i, _j, _len, _len2, _results;
      minCapacity = Infinity;
      for (_i = 0, _len = path.length; _i < _len; _i++) {
        edge = path[_i];
        if (edge.residualCapacity() < minCapacity) {
          minCapacity = edge.residualCapacity();
        }
      }
      _results = [];
      for (_j = 0, _len2 = path.length; _j < _len2; _j++) {
        edge = path[_j];
        edge.flow += minCapacity;
        _results.push(edge.saturated ? edge.src.tree === edge.dest.tree ? edge.src.tree === "source" ? this.orphan(edge.dest) : edge.src.tree === "sink" ? this.orphan(edge.src) : void 0 : void 0 : void 0);
      }
      return _results;
    };
    Graph.prototype.adopt = function() {
      var _results;
      _results = [];
      while (this.orphaned.length) {
        _results.push(this.process(this.orphaned.pop()));
      }
      return _results;
    };
    Graph.prototype.attemptParent = function(p, edge) {
      var n, q;
      if (p.tree === "source" && edge.src === p || p.tree === "sink" && edge.dest === p) {
        return false;
      }
      q = (p === edge.src ? edge.dest : edge.src);
      if (p.tree === q.tree && edge.residualCapacity() > 0) {
        n = q;
        while (n.parent) {
          if (n.parent === this.source || n.parent === this.sink) {
            this.setParent(p, q, edge);
            return true;
          }
          n = n.parent;
        }
      }
      return false;
    };
    Graph.prototype.addActive = function(p) {
      if (this.active.indexOf(p) === -1) {
        return this.active.push(p);
      }
    };
    Graph.prototype.process = function(p) {
      var edge, q, _i, _j, _len, _len2, _ref, _ref2;
      _ref = p.edges;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        edge = _ref[_i];
        if (p.tree === "source" && edge.dest === p || p.tree === "sink" && edge.src === p) {
          if (this.attemptParent(p, edge)) {
            return;
          }
        }
      }
      _ref2 = p.edges;
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        edge = _ref2[_j];
        q = p === edge.src ? edge.dest : edge.src;
        if (p.tree === q.tree) {
          if (edge.residualCapacity() > 0) {
            this.addActive(q);
          }
          if (q.parent === p) {
            this.orphan(q);
          }
        }
      }
      p.tree = null;
      return this.active.splice(this.active.indexOf(p), 1);
    };
    return Graph;
  })();
  ImageGraph = (function() {
    __extends(ImageGraph, Graph);
    function ImageGraph(imageData1, imageData2) {
      var leftColorDiff, leftNode, node, topColorDiff, topNode, x, y, _ref, _ref2;
      if (imageData1.width !== imageData2.width || imageData1.height !== imageData2.height) {
        throw "Image dimensions don't match";
      }
      this.imageData1 = new PixelData(imageData1);
      this.imageData2 = new PixelData(imageData2);
      this.width = this.imageData1.width;
      this.height = this.imageData1.height;
      this.source = new Node("source");
      this.sink = new Node("sink");
      this.source.tree = "source";
      this.sink.tree = "sink";
      this.active = [this.source, this.sink];
      this.orphaned = [];
      this.fullGraph = false;
      this.nodes = new Array(this.imageData1.width);
      for (x = 0, _ref = this.width; 0 <= _ref ? x < _ref : x > _ref; 0 <= _ref ? x++ : x--) {
        this.nodes[x] = new Array(this.imageData1.height);
        for (y = 0, _ref2 = this.height; 0 <= _ref2 ? y < _ref2 : y > _ref2; 0 <= _ref2 ? y++ : y--) {
          node = this.nodes[x][y] = new Node({
            x: x,
            y: y
          });
          if (this.fullGraph) {
            if (x > 0) {
              leftNode = this.nodes[x - 1][y];
              leftColorDiff = this.colorDifference(x - 1, y, x, y);
              node.addEdge(leftNode, leftColorDiff);
              leftNode.addEdge(node, leftColorDiff);
            }
            if (y > 0) {
              topNode = this.nodes[x][y - 1];
              topColorDiff = this.colorDifference(x, y - 1, x, y);
              node.addEdge(topNode, topColorDiff);
              topNode.addEdge(node, topColorDiff);
            }
          }
        }
      }
    }
    ImageGraph.prototype.partition = function() {
      var node, x, y, _ref, _results;
      this.sourceNodes = [];
      this.sinkNodes = [];
      _results = [];
      for (x = 0, _ref = this.width; 0 <= _ref ? x < _ref : x > _ref; 0 <= _ref ? x++ : x--) {
        _results.push((function() {
          var _ref2, _results2;
          _results2 = [];
          for (y = 0, _ref2 = this.height; 0 <= _ref2 ? y < _ref2 : y > _ref2; 0 <= _ref2 ? y++ : y--) {
            node = this.nodes[x][y];
            _results2.push(node.tree === "source" ? this.sourceNodes.push(node) : node.tree === "sink" ? this.sinkNodes.push(node) : this.sinkNodes.push(node));
          }
          return _results2;
        }).call(this));
      }
      return _results;
    };
    ImageGraph.prototype.colorDifference = function(sx, sy, tx, ty) {
      var s1, s2, t1, t2;
      s1 = this.imageData1.labColor(sx, sy);
      s2 = this.imageData2.labColor(sx, sy);
      t1 = this.imageData1.labColor(tx, ty);
      t2 = this.imageData2.labColor(tx, ty);
      return this.imageData1.colorDifference(s1, s2) + this.imageData1.colorDifference(t1, t2);
    };
    ImageGraph.prototype.getNode = function(x, y) {
      return this.nodes[x][y];
    };
    ImageGraph.prototype.initWangTile = function() {
      var edge, edgeMult, i, src, x, y, _i, _j, _k, _l, _len, _len2, _len3, _len4, _len5, _len6, _m, _n, _ref, _ref10, _ref11, _ref12, _ref13, _ref14, _ref15, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9, _results;
      if (this.width !== this.height || this.width % 2 !== 0) {
        throw "Wang tiles must be square with even width and height";
      }
      this.edgeMult = 4;
      this.edgeMultDecay = 0.6;
      for (x = 0, _ref = this.width; 0 <= _ref ? x < _ref : x > _ref; 0 <= _ref ? x++ : x--) {
        _ref2 = this.nodes[x][0];
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          edge = _ref2[_i];
          edge.capacity *= this.edgeMult;
        }
        _ref3 = this.nodes[x][this.height - 1];
        for (_j = 0, _len2 = _ref3.length; _j < _len2; _j++) {
          edge = _ref3[_j];
          edge.capacity *= this.edgeMult;
        }
        this.nodes[x][0].multiSource = true;
        this.nodes[x][this.height - 1].multiSource = true;
        this.source.addEdge(this.nodes[x][0], Infinity);
        this.source.addEdge(this.nodes[x][this.height - 1], Infinity);
      }
      for (y = 0, _ref4 = this.height; 0 <= _ref4 ? y < _ref4 : y > _ref4; 0 <= _ref4 ? y++ : y--) {
        _ref5 = this.nodes[0][y];
        for (_k = 0, _len3 = _ref5.length; _k < _len3; _k++) {
          edge = _ref5[_k];
          edge.capacity *= this.edgeMult;
        }
        _ref6 = this.nodes[this.width - 1][y];
        for (_l = 0, _len4 = _ref6.length; _l < _len4; _l++) {
          edge = _ref6[_l];
          edge.capacity *= this.edgeMult;
        }
        this.nodes[0][y].multiSource = true;
        this.nodes[this.width - 1][y].multiSource = true;
        this.source.addEdge(this.nodes[0][y], Infinity);
        this.source.addEdge(this.nodes[this.width - 1][y], Infinity);
      }
      for (i = 1, _ref7 = this.width - 1; 1 <= _ref7 ? i < _ref7 : i > _ref7; 1 <= _ref7 ? i++ : i--) {
        _ref8 = this.nodes[i][i];
        for (_m = 0, _len5 = _ref8.length; _m < _len5; _m++) {
          edge = _ref8[_m];
          edge.capacity *= this.edgeMult;
        }
        _ref9 = this.nodes[i][this.height - 1 - i];
        for (_n = 0, _len6 = _ref9.length; _n < _len6; _n++) {
          edge = _ref9[_n];
          edge.capacity *= this.edgeMult;
        }
        this.nodes[i][i].multiSink = true;
        this.nodes[i][this.height - 1 - i].multiSink = true;
        this.nodes[i][i].addEdge(this.sink, Infinity);
        this.nodes[i][this.height - 1 - i].addEdge(this.sink, Infinity);
      }
      if (!this.fullGraph) {
        for (x = 1, _ref10 = this.width - 1; 1 <= _ref10 ? x < _ref10 : x > _ref10; 1 <= _ref10 ? x++ : x--) {
          edgeMult = this.edgeMult;
          for (y = 0, _ref11 = this.height / 2; 0 <= _ref11 ? y < _ref11 : y > _ref11; 0 <= _ref11 ? y++ : y--) {
            src = this.nodes[x][y];
            if (y > 0) {
              src.addEdge(this.nodes[x][y - 1], edgeMult * this.colorDifference(x, y, x, y - 1));
            }
            src.addEdge(this.nodes[x][y + 1], edgeMult * this.colorDifference(x, y, x, y + 1));
            src.addEdge(this.nodes[x - 1][y], edgeMult * this.colorDifference(x, y, x - 1, y));
            src.addEdge(this.nodes[x + 1][y], edgeMult * this.colorDifference(x, y, x + 1, y));
            edgeMult *= this.edgeMultDecay;
            if (edgeMult < 1) {
              edgeMult = 1;
            }
            if (this.nodes[x][y + 1].multiSink) {
              break;
            }
          }
          edgeMult = this.edgeMult;
          for (y = _ref12 = this.height - 1, _ref13 = this.height / 2; _ref12 <= _ref13 ? y < _ref13 : y > _ref13; _ref12 <= _ref13 ? y++ : y--) {
            src = this.nodes[x][y];
            if (y < this.height - 1) {
              src.addEdge(this.nodes[x][y + 1], edgeMult * this.colorDifference(x, y, x, y + 1));
            }
            src.addEdge(this.nodes[x][y - 1], edgeMult * this.colorDifference(x, y, x, y - 1));
            src.addEdge(this.nodes[x - 1][y], edgeMult * this.colorDifference(x, y, x - 1, y));
            src.addEdge(this.nodes[x + 1][y], edgeMult * this.colorDifference(x, y, x + 1, y));
            edgeMult *= this.edgeMultDecay;
            if (edgeMult < 1) {
              edgeMult = 1;
            }
            if (this.nodes[x][y - 1].multiSink) {
              break;
            }
          }
        }
        _results = [];
        for (y = 1, _ref14 = this.height - 1; 1 <= _ref14 ? y < _ref14 : y > _ref14; 1 <= _ref14 ? y++ : y--) {
          edgeMult = this.edgeMult;
          for (x = 0, _ref15 = this.width / 2; 0 <= _ref15 ? x < _ref15 : x > _ref15; 0 <= _ref15 ? x++ : x--) {
            src = this.nodes[x][y];
            if (x > 1) {
              src.addEdge(this.nodes[x - 1][y], edgeMult * this.colorDifference(x, y, x - 1, y));
            }
            src.addEdge(this.nodes[x + 1][y], edgeMult * this.colorDifference(x, y, x + 1, y));
            src.addEdge(this.nodes[x][y - 1], edgeMult * this.colorDifference(x, y, x, y - 1));
            src.addEdge(this.nodes[x][y + 1], edgeMult * this.colorDifference(x, y, x, y + 1));
            edgeMult *= this.edgeMultDecay;
            if (edgeMult < 1) {
              edgeMult = 1;
            }
            if (this.nodes[x + 1][y].multiSink) {
              break;
            }
          }
          edgeMult = this.edgeMult;
          _results.push((function() {
            var _ref16, _ref17, _results2;
            _results2 = [];
            for (x = _ref16 = this.width - 1, _ref17 = this.width / 2; _ref16 <= _ref17 ? x < _ref17 : x > _ref17; _ref16 <= _ref17 ? x++ : x--) {
              src = this.nodes[x][y];
              src.addEdge(this.nodes[x - 1][y], edgeMult * this.colorDifference(x, y, x - 1, y));
              if (x < this.width - 1) {
                src.addEdge(this.nodes[x + 1][y], edgeMult * this.colorDifference(x, y, x + 1, y));
              }
              src.addEdge(this.nodes[x][y - 1], edgeMult * this.colorDifference(x, y, x, y - 1));
              src.addEdge(this.nodes[x][y + 1], edgeMult * this.colorDifference(x, y, x, y + 1));
              edgeMult *= this.edgeMultDecay;
              if (edgeMult < 1) {
                edgeMult = 1;
              }
              if (this.nodes[x - 1][y].multiSink) {
                break;
              }
            }
            return _results2;
          }).call(this));
        }
        return _results;
      }
    };
    ImageGraph.prototype.computeGraft = function() {
      this.computeMaxFlow();
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
