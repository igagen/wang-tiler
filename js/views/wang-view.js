var WangView = Backbone.View.extend({
  el: "body",

  events: {
    // "change #image-upload-button": "setSourceImage",
    // "load #source-image": "imageLoaded",
    "mousedown canvas": "handleMouseDown",
    "mouseup canvas": "handleMouseUp",
    "mousemove canvas": "handleMouseMove"
  },

  BLOCK_SIZE: 80,
  MAX_ITERATIONS: 100,
  TILES: ["rygb", "gbgb", "ryry", "gbry", "rbgy", "gygy", "rbrb", "gyrb"],
  COLORS: "rgby",

  initialize: function() {
    _.bindAll(this, "setSourceImage", "imageLoaded", "weightImageLoaded", "handleMouseDown", "handleMouseUp", "handleMouseMove");

    this.sourceCanvas = $("#source-canvas");
    this.targetCanvas = $("#target-canvas");
    this.scratchCanvas = $("#scratch-canvas");
    this.weightCanvas = $("#weight-canvas");
    this.sourceContext = this.sourceCanvas[0].getContext("2d");
    this.targetContext = this.targetCanvas[0].getContext("2d");
    this.scratchContext = this.scratchCanvas[0].getContext("2d");
    this.weightContext = this.weightCanvas[0].getContext("2d");

    this.tiles = {};

    for (var i = 0; i < this.TILES.length; i++) {
      var tile = this.TILES[i];
      this.tiles[tile] = {};

      this[tile + 'WangTileCanvas'] = $("#wang-tiles ." + tile);
      this[tile + 'WangTileContext'] = this[tile + 'WangTileCanvas'][0].getContext("2d");
      this[tile + 'DiamondTileCanvas'] = $("#diamond-tiles ." + tile);
      this[tile + 'DiamondTileContext'] = this[tile + 'DiamondTileCanvas'][0].getContext("2d");
      this[tile + 'SubSampleCanvas'] = $("#sub-samples ." + tile);
      this[tile + 'SubSampleContext'] = this[tile + 'SubSampleCanvas'][0].getContext("2d");
      this[tile + 'CuttingPathCanvas'] = $("#cutting-paths ." + tile);
      this[tile + 'CuttingPathContext'] = this[tile + 'CuttingPathCanvas'][0].getContext("2d");
      this[tile + 'XWeightCanvas'] = $("#x-weights ." + tile);
      this[tile + 'XWeightContext'] = this[tile + 'XWeightCanvas'][0].getContext("2d");
      this[tile + 'YWeightCanvas'] = $("#y-weights ." + tile);
      this[tile + 'YWeightContext'] = this[tile + 'YWeightCanvas'][0].getContext("2d");
      this[tile + 'ImageDiffCanvas'] = $("#image-diffs ." + tile);
      this[tile + 'ImageDiffContext'] = this[tile + 'ImageDiffCanvas'][0].getContext("2d");
      this[tile + 'XGradientCanvas'] = $("#x-gradients ." + tile);
      this[tile + 'XGradientContext'] = this[tile + 'XGradientCanvas'][0].getContext("2d");
      this[tile + 'YGradientCanvas'] = $("#y-gradients ." + tile);
      this[tile + 'YGradientContext'] = this[tile + 'YGradientCanvas'][0].getContext("2d");
    }

    this.imageUploadButton = $("#image-upload-button");

    var blockSize = this.BLOCK_SIZE;
    $("#diamond-tiles canvas, #sub-samples canvas, #wang-tiles canvas, #cutting-paths canvas, #x-weights canvas, #y-weights canvas, #image-diffs canvas, #x-gradients canvas, #y-gradients canvas, #scratch-canvas").each(function() {
      $(this).attr('width', blockSize);
      $(this).attr('height', blockSize);
    });

    $("#target-canvas").attr('width', 6 * this.BLOCK_SIZE).attr('height', 6 * this.BLOCK_SIZE);

    this.sampling = false;

    this.setSourceImage();
  },

  setSourceImage: function() {
    this.sourceImage = new Image();
    this.sourceImage.onload = this.imageLoaded;
    // this.sourceImage.src = this.imageUploadButton.val().replace(/C:\\fakepath\\/, 'images/');
    this.sourceImage.src = $("#source-image").attr('src');

    this.weightImage = new Image();
    this.weightImage.onload = this.weightImageLoaded;
    this.weightImage.src = $("#weight-image").attr('src');
  },

  imageLoaded: function() {
    this.sourceWidth = this.sourceImage.width;
    this.sourceHeight = this.sourceImage.height;

    this.sourceCanvas.attr('width', this.sourceWidth);
    this.sourceCanvas.attr('height', this.sourceHeight);

    this.sourceContext.drawImage(this.sourceImage, 0, 0);
  },

  weightImageLoaded: function() {
    this.weightCanvas.attr('width', this.weightImage.width);
    this.weightCanvas.attr('height', this.weightImage.height);
    this.weightContext.drawImage(this.weightImage, 0, 0);
    this.weightData = this.weightContext.getImageData(0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE);
  },

  handleMouseDown: function(event) {
    this.sampling = true;
    this.x = event.offsetX;
    this.y = event.offsetY;
  },

  getSelectionRect: function(event) {
    var x = this.x;
    var y = this.y;
    var width = event.offsetX - this.x;
    var height = event.offsetY - this.y;

    // Account for negative widths / heights
    if (width < 0) {
      x = x + width;
      width = -width;
    }
    if (height < 0) {
      y = y + height;
      height = -height;
    }

    return { x: x, y: y, width: width, height: height };
  },

  handleMouseUp: function(event) {
    var r = this.getSelectionRect(event);
    if (r.width >= this.BLOCK_SIZE && r.height >= this.BLOCK_SIZE) {
      this.sampleRect = r;
      this.drawSampleRect(this.sampleRect);
      this.generateDiamonds();
      this.generateDiamondTiles();
      this.generateSubSamples();
      this.generateWangTiles();
    }
    else {
      this.sourceContext.drawImage(this.sourceImage, 0, 0);
    }

    this.sampling = false;
  },

  handleMouseMove: function(event) {
    if (this.sampling) this.drawSampleRect(this.getSelectionRect(event));
  },

  drawSampleRect: function(rect) {
    this.sourceContext.drawImage(this.sourceImage, 0, 0);

    this.sourceContext.fillStyle = 'rgba(255,255,255,0.25)';
    this.sourceContext.fillRect(rect.x, rect.y, rect.width, rect.height);

    this.sourceContext.strokeStyle = 'rgba(0,0,0,1)';
    this.sourceContext.lineWidth = 2;
    this.sourceContext.strokeRect(rect.x, rect.y, rect.width, rect.height);
  },

  generateDiamonds: function() {
    this.diamonds = [];
    this.diamondMap = {};

    this.diamondMap['r'] = this.redDiamond = this.addRandomRect(this.diamonds);
    this.drawDiamond(this.sampleRect.x + this.redDiamond.x, this.sampleRect.y + this.redDiamond.y, 'rgba(255,0,0,0.4)');

    this.diamondMap['g'] = this.greenDiamond = this.addRandomRect(this.diamonds);
    this.drawDiamond(this.sampleRect.x + this.greenDiamond.x, this.sampleRect.y + this.greenDiamond.y, 'rgba(0,255,0,0.4)');

    this.diamondMap['b'] = this.blueDiamond = this.addRandomRect(this.diamonds);
    this.drawDiamond(this.sampleRect.x + this.blueDiamond.x, this.sampleRect.y + this.blueDiamond.y, 'rgba(0,0,255,0.4)');

    this.diamondMap['y'] = this.yellowDiamond = this.addRandomRect(this.diamonds);
    this.drawDiamond(this.sampleRect.x + this.yellowDiamond.x, this.sampleRect.y + this.yellowDiamond.y, 'rgba(255,255,0,0.4)');
  },

  getSubSampleDiff: function(tile, rect) {
    this.scratchContext.drawImage(this.sourceImage, rect.x, rect.y, this.BLOCK_SIZE, this.BLOCK_SIZE, 0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE);
    var subSampleData = new PixelData(this.scratchContext.getImageData(0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE));
    var diamondTileData = new PixelData(this[tile + 'DiamondTileContext'].getImageData(0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE));

    return subSampleData.imageDiff(diamondTileData);
  },

  addBestRect: function(tile) {
    var maxIterations = 50;
    var minDiff = Infinity;
    var bestRect;
    for (var i = 0; i < maxIterations; i++) {
      var r = this.getRandomRectWithoutDupCheck();

      var diff = this.getSubSampleDiff(tile, r);
      if (diff < minDiff) {
        minDiff = diff;
        console.debug(minDiff);
        bestRect = r;
      }
    }

    console.debug("Image diff: " + minDiff);

    this.subSamples.push(bestRect);
    return bestRect;
  },

  generateSubSamples: function() {
    this.subSamples = [];
    this.subSampleMap = {};
    for (var i = 0; i < this.TILES.length; i++) {
      var tile = this.TILES[i];
      var r = this.addRandomRect(this.subSamples);
      // var r = this.addBestRect(tile);

      this.subSampleMap[tile] = r;

      this.drawSubSampleRect(r.x, r.y, tile);
    }
  },

  generateWangTiles: function() {
    for (var i = 0; i < this.TILES.length; i++) {
      var tile = this.TILES[i];

      var diamondTileData = this[tile + 'DiamondTileContext'].getImageData(0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE);
      var subSampleData = this[tile + 'SubSampleContext'].getImageData(0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE);
      var wangTile = new ImageGraph(diamondTileData, subSampleData);
      wangTile.computeGraft();
      // console.debug(wangTile.maxFlow);
      wangTile.drawWangTile(this[tile + 'WangTileContext']);
      wangTile.drawPath(this[tile + 'CuttingPathContext']);
      wangTile.drawXWeight(this[tile + 'XWeightContext']);
      wangTile.drawYWeight(this[tile + 'YWeightContext']);
      wangTile.drawDiff(this[tile + 'ImageDiffContext']);
      wangTile.drawXGradientSum(this[tile + 'XGradientContext']);
      wangTile.drawYGradientSum(this[tile + 'YGradientContext']);
    }

    this.drawTiles(this.targetContext, this.targetCanvas.attr('width'), this.targetCanvas.attr('height'));
  },

  drawDiamond: function(x, y, color) {
    var c = this.sourceContext;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x + this.BLOCK_SIZE / 2, y);
    c.lineTo(x + this.BLOCK_SIZE, y + this.BLOCK_SIZE / 2);
    c.lineTo(x + this.BLOCK_SIZE / 2, y + this.BLOCK_SIZE);
    c.lineTo(x, y + this.BLOCK_SIZE / 2);
    c.fill();
  },

  drawSubSampleRect: function(x, y, coloring) {
    x = x + this.sampleRect.x;
    y = y + this.sampleRect.y;
    var x0, y0, x1, y1;
    for (var i = 0; i < 4; i++) {
      var color = '';
      if (coloring[i] == 'r') color = 'rgba(255,0,0,0.5)';
      if (coloring[i] == 'g') color = 'rgba(0,255,0,0.5)';
      if (coloring[i] == 'b') color = 'rgba(0,0,255,0.5)';
      if (coloring[i] == 'y') color = 'rgba(255,255,0,0.5)';

      if (i == 0) { // Top
        y0 = y1 = y;
        x0 = x; x1 = x + this.BLOCK_SIZE;
      }
      else if (i == 1) { // Right
        x0 = x1 = x + this.BLOCK_SIZE;
        y0 = y; y1 = y + this.BLOCK_SIZE;
      }
      else if (i == 2) { // Bottom
        x0 = x; x1 = x + this.BLOCK_SIZE;
        y0 = y1 = y + this.BLOCK_SIZE;
      }
      else if (i == 3) { // Left
        x0 = x1 = x;
        y0 = y; y1 = y + this.BLOCK_SIZE;
      }

      // Draw sub-sample rectangles on original source canvas to indicate their source location
      var c = this.sourceContext;
      c.lineWidth = 3;
      c.strokeStyle = color;

      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();

      // Draw sub-samples to their own canvases for later use
      this[coloring + 'SubSampleContext'].drawImage(this.sourceImage, x, y, this.BLOCK_SIZE, this.BLOCK_SIZE, 0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE);
      this[coloring + 'CuttingPathContext'].drawImage(this.sourceImage, x, y, this.BLOCK_SIZE, this.BLOCK_SIZE, 0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE);
    }
  },

  addRandomRect: function(rects) {
    // Adds a randomly located rectangle within the source image dimensions to rects,
    // while attempting to avoid duplicates

    if (rects.length == 0) {
      var r = this.getRandomRectWithoutDupCheck();
      rects.push(r);
      return r;
    }

    var r = null;
    var i = this.MAX_ITERATIONS;
    while (i-- > 0) {
      r = this.getRandomRectWithoutDupCheck();
      if (!this.rectanglesOverlap(r, rects)) {
        rects.push(r);
        return r;
      }
    }

    rects.push(r);
    return r;
  },

  rectanglesOverlap: function(r1, rects) {
    for (var i = 0; i < rects.length; i++) {
      var r2 = rects[i];
      if (((r1.x >= r2.x && r1.x <= r2.x + this.BLOCK_SIZE) || (r2.x >= r1.x && r2.x <= r1.x + this.BLOCK_SIZE)) &&
          ((r1.y >= r2.y && r1.y <= r2.y + this.BLOCK_SIZE) || (r2.y >= r1.y && r2.y <= r1.y + this.BLOCK_SIZE))) {
        return true;
      }
    }

    return false;
  },

  getRandomRectWithoutDupCheck: function() {
    // Get a random rectangle within the sample rectangle
    var validWidth = this.sampleRect.width - this.BLOCK_SIZE;
    var validHeight = this.sampleRect.height - this.BLOCK_SIZE;

    var x = Math.random() * validWidth;
    var y = Math.random() * validHeight;

    return { x: x, y: y };
  },

  generateDiamondTiles: function() {
    this.scratchContext.clearRect(0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE);
    for (var t = 0; t < this.TILES.length; t++) {
      var tile = this.TILES[t];
      var context = this[tile + 'DiamondTileContext'];
      context.clearRect(0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE);
    }

    for (var i = 0; i < this.COLORS.length; i++) {
      var color = this.COLORS[i];

      for (var t = 0; t < this.TILES.length; t++) {
        var tile = this.TILES[t];
        var context = this[tile + 'DiamondTileContext'];
        context.globalCompositeOperation = 'lighter';

        if (tile[0] == color) this.drawTopTriangle(context, color);
        if (tile[1] == color) this.drawRightTriangle(context, color);
        if (tile[2] == color) this.drawBottomTriangle(context, color);
        if (tile[3] == color) this.drawLeftTriangle(context, color);
      }
    }
  },

  drawTopTriangle: function(context, color) {
    // Takes the bottom triangle from the diamond sample of the given color
    // and copies it to the top triangle of the appropriately colored tiles
    var x = this.sampleRect.x + this.diamondMap[color].x;
    var y = this.sampleRect.y + this.diamondMap[color].y + this.BLOCK_SIZE / 2;
    this.scratchContext.drawImage(this.sourceImage, x, y, this.BLOCK_SIZE, this.BLOCK_SIZE / 2, 0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE / 2);
    this.pattern = this.scratchContext.createPattern(this.scratchCanvas[0], 'no-repeat');

    context.fillStyle = this.pattern;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(this.BLOCK_SIZE, 0);
    context.lineTo(this.BLOCK_SIZE / 2, this.BLOCK_SIZE / 2);
    context.fill();
  },

  drawRightTriangle: function(context, color) {
    // Takes the left triangle from the diamond sample of the given color
    // and copies it to the right triangle of the appropriately colored tiles
    var x = this.sampleRect.x + this.diamondMap[color].x;
    var y = this.sampleRect.y + this.diamondMap[color].y;
    this.scratchContext.drawImage(this.sourceImage, x, y, this.BLOCK_SIZE / 2, this.BLOCK_SIZE, this.BLOCK_SIZE / 2, 0, this.BLOCK_SIZE / 2, this.BLOCK_SIZE);
    this.pattern = this.scratchContext.createPattern(this.scratchCanvas[0], 'no-repeat');

    context.fillStyle = this.pattern;
    context.beginPath();
    context.moveTo(this.BLOCK_SIZE, 0);
    context.lineTo(this.BLOCK_SIZE, this.BLOCK_SIZE);
    context.lineTo(this.BLOCK_SIZE / 2, this.BLOCK_SIZE / 2);
    context.fill();
  },

  drawBottomTriangle: function(context, color) {
    // Takes the bottom triangle from the diamond sample of the given color
    // and copies it to the top triangle of the appropriately colored tiles
    var x = this.sampleRect.x + this.diamondMap[color].x;
    var y = this.sampleRect.y + this.diamondMap[color].y;
    this.scratchContext.drawImage(this.sourceImage, x, y, this.BLOCK_SIZE, this.BLOCK_SIZE / 2, 0, this.BLOCK_SIZE / 2, this.BLOCK_SIZE, this.BLOCK_SIZE / 2);
    this.pattern = this.scratchContext.createPattern(this.scratchCanvas[0], 'no-repeat');

    context.fillStyle = this.pattern;
    context.beginPath();
    context.moveTo(0, this.BLOCK_SIZE);
    context.lineTo(this.BLOCK_SIZE, this.BLOCK_SIZE);
    context.lineTo(this.BLOCK_SIZE / 2, this.BLOCK_SIZE / 2);
    context.fill();
  },

  drawLeftTriangle: function(context, color) {
    // Takes the right triangle from the diamond sample of the given color
    // and copies it to the left triangle of the appropriately colored tiles
    var x = this.sampleRect.x + this.diamondMap[color].x + this.BLOCK_SIZE / 2;
    var y = this.sampleRect.y + this.diamondMap[color].y;
    this.scratchContext.drawImage(this.sourceImage, x, y, this.BLOCK_SIZE / 2, this.BLOCK_SIZE, 0, 0, this.BLOCK_SIZE / 2, this.BLOCK_SIZE);
    this.pattern = this.scratchContext.createPattern(this.scratchCanvas[0], 'no-repeat');

    context.fillStyle = this.pattern;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(0, this.BLOCK_SIZE);
    context.lineTo(this.BLOCK_SIZE / 2, this.BLOCK_SIZE / 2);
    context.fill();
  },

  random: function(max) {
    // Returns a random integer from 0 to max - 1
    return Math.floor(max * Math.random());
  },

  matchTile: function(colors) {
    var matches = [];
    for (var i = 0; i < this.TILES.length; i++) {
      var tile = this.TILES[i];
      if (tile.match(colors)) matches.push(tile);
    }

    var i = this.random(matches.length);
    return matches[i];
  },

  drawTiles: function(context, width, height) {
    var x, y, tile;
    var xTiles = width / this.BLOCK_SIZE;
    var yTiles = height / this.BLOCK_SIZE;
    var tiles = new Array(xTiles);
    for (x = 0; x < xTiles; x++) tiles[x] = new Array(yTiles);

    for (x = 0; x < xTiles; x++) {
      for (y = 0; y < yTiles; y++) {
        if (x == 0 && y == 0) {
          // Pick random tile for the first one
          tiles[x][y] = this.TILES[this.random(this.TILES.length)];
        }
        else if (x == 0) {
          // Left column, match top of this tile to bottom of above tile
          tiles[x][y] = this.matchTile(new RegExp(tiles[x][y - 1][2] + "..."));
        }
        else if (y == 0) {
          // Top row, match left
          tiles[x][y] = this.matchTile(new RegExp("..." + tiles[x - 1][y][1]));
        }
        else {
          // Interior tile, match top and left
          tiles[x][y] = this.matchTile(new RegExp(tiles[x][y - 1][2] + ".." + tiles[x - 1][y][1]));
        }

        var tileContext = this[tiles[x][y] + "WangTileContext"];
        var imageData = tileContext.getImageData(0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE);
        context.putImageData(imageData, x * this.BLOCK_SIZE, y * this.BLOCK_SIZE);
      }
    }
  }
});

$(function() {
  new WangView();
});
