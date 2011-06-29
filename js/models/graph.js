(function() {
  var Edge, Graph, ImageGraph, Node, Tree;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  };
  Node = (function() {
    function Node(val, terminal) {
      this.val = val;
      this.terminal = terminal != null ? terminal : false;
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
  Tree = (function() {
    function Tree(root) {
      this.root = root;
      this.root.tree = this;
    }
    return Tree;
  })();
  Graph = (function() {
    function Graph() {
      this.nodes = [];
      this.source = this.addNode(new Node("Source", true));
      this.sink = this.addNode(new Node("Sink", true));
      this.sourceTree = new Tree(this.source);
      this.sinkTree = new Tree(this.sink);
      this.active = [this.source, this.sink];
      this.orphaned = [];
    }
    Graph.prototype.addNode = function(node) {
      node.parent = null;
      node.parentEdge = null;
      node.tree = null;
      this.nodes.push(node);
      return node;
    };
    Graph.prototype.setParent = function(node, parent, edge) {
      if (parent.tree === null) {
        throw new Error("Can't set parent to a node with no tree");
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
    Graph.prototype.setMultiSource = function(node) {
      return this.source.addEdge(node, Infinity);
    };
    Graph.prototype.setMultiSink = function(node) {
      return node.addEdge(this.sink, Infinity);
    };
    Graph.prototype.computeMaxFlow = function() {
      var edge, path, _i, _len, _ref;
      while (true) {
        path = this.grow();
        if (path.length === 0) {
          break;
        } else {
          this.augment(path);
        }
        this.adopt();
      }
      this.partition();
      this.maxFlow = 0;
      _ref = this.source.edges;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        edge = _ref[_i];
        this.maxFlow += edge.flow;
      }
      return this.maxFlow;
    };
    Graph.prototype.partition = function() {
      var node, _i, _len, _ref, _results;
      this.sourceNodes = [];
      this.sinkNodes = [];
      _ref = this.nodes;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        _results.push(node.tree === this.sourceTree ? this.sourceNodes.push(node) : this.sinkNodes.push(node));
      }
      return _results;
    };
    Graph.prototype.getPath = function(p, q) {
      var edge, path, sinkNode, sourceNode, _i, _len, _ref;
      path = [];
      if (p.tree === this.sourceTree) {
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
      return path;
    };
    Graph.prototype.grow = function() {
      var edge, p, q, _i, _len, _ref;
      while (this.active.length) {
        p = this.active[0];
        _ref = p.edges;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          edge = _ref[_i];
          if (edge.residualCapacity() > 0) {
            if (p === edge.src) {
              q = edge.dest;
            } else {
              q = edge.src;
            }
            if (q.tree === null) {
              this.setParent(q, p, edge);
              this.addActive(q);
            } else if (q.tree !== p.tree) {
              return this.getPath(p, q);
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
        if (edge.capacity < minCapacity) {
          minCapacity = edge.capacity;
        }
      }
      _results = [];
      for (_j = 0, _len2 = path.length; _j < _len2; _j++) {
        edge = path[_j];
        edge.flow = minCapacity;
        _results.push(edge.saturated ? edge.src.tree === edge.dest.tree ? edge.src.tree === this.sourceTree ? this.orphan(edge.dest) : edge.src.tree === this.sinkTree ? this.orphan(edge.src) : void 0 : void 0 : void 0);
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
      var q;
      q = p === edge.src ? edge.dest : edge.src;
      if (p.tree === q.tree && edge.residualCapacity() > 0) {
        while (q.parent) {
          if (q.parent === this.source || q.parent === this.sink) {
            this.setParent(p, q, edge);
            return true;
          }
          q = q.parent;
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
        if (this.attemptParent(p, edge)) {
          return;
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
      var node, x, y, _i, _len, _ref, _ref2, _ref3;
      this.imageData1 = imageData1;
      this.imageData2 = imageData2;
      if (this.imageData1.width !== this.imagedata2.width || this.imageData1.height !== this.imageData2.height) {
        throw "Image dimensions don't match";
      }
      this.width = this.rawImageData1.width;
      this.height = this.rawImageData1.height;
      this.rawImageData1.toLab;
      this.rawImageData2.toLab;
      this.nodes = new Array(this.imageData1.width);
      _ref = this.nodes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        node = new Array(this.imageData1.height);
      }
      for (x = 0, _ref2 = this.width; 0 <= _ref2 ? x < _ref2 : x > _ref2; 0 <= _ref2 ? x++ : x--) {
        for (y = 0, _ref3 = this.height; 0 <= _ref3 ? y < _ref3 : y > _ref3; 0 <= _ref3 ? y++ : y--) {
          node = this.nodes[x][y] = new FlowNode({
            x: x,
            y: y
          });
          if (x > 0) {
            this.nodes[x - 1][y].addEdge(node, colorDifference(x - 1, y, x, y));
          }
          if (y > 0) {
            this.nodes[x][y - 1].addEdge(node, colorDifference(x, y - 1, x, y));
          }
        }
      }
      this.sink = new Node(null, true);
      this.source = new Node(null, true);
    }
    ImageGraph.prototype.colorDifference = function(sx, sy, tx, ty) {
      var s1, s2, t1, t2;
      s1 = this.imageData1.color(sx, sy);
      s2 = this.imageData2.color(sx, sy);
      t1 = this.imageData1.color(tx, ty);
      t2 = this.imageData2.color(tx, ty);
      return ImageData.colorDifference(s1, s2) + ImageData.colorDifference(t1, t2);
    };
    ImageGraph.prototype.getNode = function(x, y) {
      return this.nodes[x][y];
    };
    ImageGraph.prototype.initWangTile = function() {
      var i, x, y, _ref, _ref2, _ref3, _results;
      if (this.width !== this.height || this.width % 2 !== 0) {
        throw "Wang tiles must be square with even width and height";
      }
      for (x = 0, _ref = this.width; 0 <= _ref ? x <= _ref : x >= _ref; 0 <= _ref ? x++ : x--) {
        this.source.addEdge(this.nodes[x][0], Infinity);
        this.source.addEdge(this.nodes[x][this.height - 1], Infinity);
      }
      for (y = 0, _ref2 = this.height; 0 <= _ref2 ? y <= _ref2 : y >= _ref2; 0 <= _ref2 ? y++ : y--) {
        this.source.addEdge(this.nodes[0][y], Infinity);
        this.source.addEdge(this.nodes[this.width - 1][y], Infinity);
      }
      _results = [];
      for (i = 0, _ref3 = this.width; 0 <= _ref3 ? i <= _ref3 : i >= _ref3; 0 <= _ref3 ? i++ : i--) {
        this.nodes[i][i].addEdge(this.sink, Infinity);
        _results.push(this.nodes[i][this.height - 2 - i].addEdge(this.sink, Infinity));
      }
      return _results;
    };
    return ImageGraph;
  })();
  window.Node = Node;
  window.Edge = Edge;
  window.Tree = Tree;
  window.Graph = Graph;
  window.ImageGraph = Graph;
}).call(this);
