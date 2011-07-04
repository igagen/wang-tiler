(function() {
  var Edge, Graph, Node;
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
  window.Node = Node;
  window.Edge = Edge;
  window.Graph = Graph;
}).call(this);
