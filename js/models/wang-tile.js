// Graph representation of the difference between two images
// Images should be the same size, square, with even dimensions
// Pixels are nodes in the graph
// Edges are defined as the color difference between adjacent pixels

// node = {
//   x: 0,
//   y: 0,
//   source: true,
//   sink: false,
// }
// 
// edge = {
//   node0,
//   node1,
//   weight
// }
// 
// graph methods
// 
// - neighbors(p)
// getFlow(p, q)
// residualCapacity(p, q)
// maxCapacity(p, q)
// 
// members
// 
// sourceTree
// sinkTree
// activeNodes
// orphanedNodes
// 
// tree methods
// 
// parent(p)
// tree(p) - returns either sourceTree, sinkTree or null
// 
// Path - list of nodes with flows, capacities
// 
// getBottleneckCapacity - find the lowest capacity in the path
// 
// data structures - 
// 
// 2d array nodes



var WangTile = Backbone.Model.extend({
  initialize: function(diamondTileData, subSampleData) {
    var x, y;

    this.diamondTileData = diamondTileData;
    this.subSampleData = subSampleData;

    this.initGraph();
  },

  init2DArray: function(width, height) {
    var array = new Array(width);
    for (var x = 0; x < width; x++)
      array[x] = new Array(height);

    return array;
  },

  initGraph: function() {
    this.width = this.diamondTileData.width;
    this.height = this.diamondTileData.height;

    this.nodes = this.init2DArray(this.width, this.height);
    for (x = 0; x < this.width; x++) {
      for (y = 0; y < this.height; y++) {
        this.nodes[x][y] = {
          x: x, y: y,
          rightFlow: 0, rightCap: 0,
          downFlow: 0, downCap: 0,
          parent: null,
          tree: null,
          neighbors: []
        };
      }
    }

    // Add neighbor relationships
    for (x = 0; x < this.width; x++) {
      for (y = 0; y < this.height; y++) {
        var node = this.node[x][y];

        if (y > 0) node.neighbors.push(this.nodes[x][y - 1]); // top neighbor
        if (x < this.width - 1) node.neighbors.push(this.nodes[x + 1][y]); // right neighbor
        if (y < this.height - 1) node.neighbors.push(this.nodes[x][y + 1]); // bottom neighbor
        if (x > 0) node.neighbors.push(this.nodes[x - 1][y]); // left neighbor
      }
    }

    this.source = { terminal: true, neighbors: [], parent: null, children: [] };
    this.sink = { terminal: true, neighbors: [], parent: null, children: [] };

    // Add border source nodes
    for (var x = 0; x < this.width; x++) {
      this.source.neighbors.push(this.nodes[x][0]); // Top border
      this.nodes[x][0].neighbors = [this.source];
      this.source.neighbors.push(this.nodes[x, this.height - 1]); // Bottom border
      this.nodes[x, this.height - 1].neighbors = [this.source];
    }
    for (var y = 0; y < this.height; y++) {
      this.source.neighbors.push(this.nodes[0, y]); // Top border
      this.nodes[0, y].neighbors = this.source;
      this.source.neighbors.push(this.nodes[this.width - 1, y]); // Bottom border
      this.nodes[this.width - 1, y].neighbors = this.source;
    }

    // Add interior sink nodes (X-shape that divides the image into four triangles, not including 1 pixel border)
    // Assumes width and height are equal, and even
    for (var i = 0; i < this.width - 1; i++) {
      this.sink.neighbors.push(this.nodes[i, i]);
      this.nodes[i, i].neighbors = [this.sink];
      this.sink.neighbors.push(this.nodes[i, this.height - 2 - i]);
      this.nodes[i, this.height - 2 - i].neighbors = [this.sink];
    }

    this.computeEdgeWeights();
  },

  convertToLabColor: function(imageData) {
    var x, y, r, g, b, lab;
    for (x = 0; x < this.width; x++) {
      for (y = 0; y < this.height; y++) {
        var i = 4 * (x * this.width + y);

        r = imageData[i];
        g = imageData[i + 1];
        b = imageData[i + 2];

        lab = this.rgbToLab(r, g, b);

        imageData[i] = lab[0];
        imageData[i + 1] = lab[1];
        imageData[i + 2] = lab[2];
      }
    }
  },

  rgbToXyz: function(r, g, b) {
    r = r / 255;
    g = g / 255;
    b = b / 255;

    if (r > 0.04045) r = Math.pow(((r + 0.055) / 1.055), 2.4);
    else r = r / 12.92;
    if (g > 0.04045) g = Math.pow(((g + 0.055) / 1.055), 2.4);
    else g = g / 12.92;
    if (b > 0.04045) b = Math.pow(((b + 0.055) / 1.055), 2.4);
    else b = b / 12.92;

    r = r * 100;
    g = g * 100;
    b = b * 100;

    return [
      r * 0.4124 + g * 0.3576 + b * 0.1805,
      r * 0.2126 + g * 0.7152 + b * 0.0722,
      r * 0.0193 + g * 0.1192 + b * 0.9505
    ];
  },

  xyzToLab: function(x, y, z) {
    // Constants
    var v1 = 1 / 3;
    var v2 = 16 / 116;

    x = x / 95.047;
    y = y / 100;
    z = z / 108.883;

    if (x > 0.008856) x = Math.pow(x, v1);
    else x = (7.787 * x) + v2;
    if (y > 0.008856) y = Math.pow(y, v1);
    else y = (7.787 * y) + v2;
    if (z > 0.008856) z = Math.pow(y, v1);
    else z = (7.787 * z) + v2;

    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
  },

  rgbToLab: function(r, g, b) {
    var xyz = this.rgbToXyz(r, g, b);
    return this.xyzToLab(xyz[0], xyz[1], xyz[2]);
  },

  colorDifference: function(c1, c2) {
    // e76 algorithm is simply the Euclidean distance between the two colors in the Lab color space
    var dL = c2[0] - c1[0];
    var da = c2[1] - c1[1];
    var db = c2[2] - c1[2];
    return Math.sqrt(dL * dL + da * da + db * db);
  },

  getColor: function(imageData, x, y) {
    var i = x * imageData.width + y;
    return [imageData[i], imageData[i + 1], imageData[i + 2]];
  },

  getLabColor: function(imageData, x, y) {
    var rgb = this.getColor(imageData, x, y);
    return this.rgbToLab(rgb[0], rgb[1], rgb[2]);
  },

  diff: function(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  },

  norm: function(c) {
    return Math.sqrt(c[0] * c[0] + c[1] * c[1] + c[2] * c[2]);
  },

  computeEdgeWeights: function() {
    var x, y, as, bs, at, bt;

    for (x = 0; x < this.width - 1; x++) {
      for (y = 0; y < this.height - 1; y++) {
        // Compute edge weights in the +x direction
        as = this.getLabColor(this.diamondTileData, x, y);
        bs = this.getLabColor(this.subSampleData, x, y);
        at = this.getLabColor(this.diamondTileData, x + 1, y);
        bt = this.getLabColor(this.subSampleData, x + 1, y);

        // set the +x edge weight
        this.nodes[x][y].rightCap = this.norm(this.diff(as, bs)) + this.norm(this.diff(at, bt));

        // Compute edge weights in the +y direction
        as = this.getLabColor(this.diamondTileData, x, y);
        bs = this.getLabColor(this.subSampleData, x, y);
        at = this.getLabColor(this.diamondTileData, x, y + 1);
        bt = this.getLabColor(this.subSampleData, x, y + 1);

        // set the +y edge weight
        this.nodes[x][y].downCap = this.norm(this.diff(as, bs)) + this.norm(this.diff(at, bt));
      }
    }
  },

  neighbors: function(p) {
    var neighbors = [];
    if (p.neighbors) {
      neighbors = neighbors.concat(p.neighbors);
      if (p.terminal) return neighbors;
    }

    if (p.y > 0) neighbors.push(this.nodes[p.x][p.y - 1]); // top neighbor
    if (x < this.width - 1) neighbors.push(this.nodes[p.x + 1][p.y]); // right neighbor
    if (y < this.height - 1) neighbors.push(this.nodes[p.x][p.y + 1]); // bottom neighbor
    if (x > 0) neighbors.push(this.nodes[p.x - 1][p.y]); // left neighbor
  },

  getFlow: function(p, q) {
    if (p.terminal || q.terminal) return 0;

    
  },

  residualCapacity: function(p, q) {
    
  },

  maxCapacity: function(p, q) {
    
  },

  minCut: function() {
    this.sourceTree = { root: this.source };
    this.sinkTree = { root: this.sink };
    this.activeNodes = [this.source, this.sink];
    this.orphanedNodes = [];
    this.augmentingPath = [];

    while (true) {
      this.grow();
      if (this.augmentingPath.length == 0) break;
      this.adopt();
    }
  },

  grow: function() {
    while (this.activeNodes.length) {
      var node = this.activeNodes.pop();
      for (var i = 0, numNeighbors = node.neighbors.length; i < numNeighbors; i++) {
        var neighbor = node.neighbors[i];
        if (neighbor)
      }
    }
    // while A not empty 
    //   pick an active node p from A 
    //   for every neighbor q such that tree cap(p, q) > 0 
    //     if TREE(q) is null then add q to search tree as an active node: 
    //       TREE(q) = TREE(p), PARENT(q) = p, add q to A
    //     if TREE(q) not empty and TREE(q) != TREE(p) return P = PATH from s to t
    //   end for 
    //   remove p from A 
    // end while 
    // return P = []
  },

  augment: function() {
    // find the bottleneck capacity on P 
    // update the residual graph by pushing flow ∆ through P 
    // for each edge (p, q) in P that becomes saturated 
    //   if TREE(p) = TREE(q) = S then set PARENT (q) := ∅ and O := O ∪ {q} 
    //   if TREE(p) = TREE(q) = T then set PARENT (p) := ∅ and O := O ∪ {p} 
    // end for 
    
  },

  adopt: function() {
    // while O is empty
    //   pick an orphan node p ∈ O and remove it from O
    //   process p
    // end while
  },

  process: function(p) {
    
  },

  generate: function() {
    this.wangTileData = this.subSampleData;
  },

  draw: function(context) {
    context.putImageData(this.wangTileData, 0, 0);
  }
});