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
  TARGET_SIZE: 6,
  MAX_ITERATIONS: 100,
  TILES: ["rygb", "gbgb", "ryry", "gbry", "rbgy", "gygy", "rbrb", "gyrb"],
  COLORS: "rgby",

  initialize: function() {
    _.bindAll(this, "setSourceImage", "imageLoaded", "weightImageLoaded", "handleMouseDown", "handleMouseUp", "handleMouseMove");

    this.sourceCanvas = $("#source-canvas");
    this.targetCanvas = $("#target-canvas");
    this.scratchCanvas = $("#scratch-canvas");
    this.scratch2Canvas = $("#scratch2-canvas");
    this.weightCanvas = $("#weight-canvas");
    this.sourceContext = this.sourceCanvas[0].getContext("2d");
    this.targetContext = this.targetCanvas[0].getContext("2d");
    this.scratchContext = this.scratchCanvas[0].getContext("2d");
    this.scratch2Context = this.scratch2Canvas[0].getContext("2d");
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

    $("#target-canvas").attr('width', this.TARGET_SIZE * this.BLOCK_SIZE).attr('height', this.TARGET_SIZE * this.BLOCK_SIZE);

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
    this.scratch2Canvas.attr('width', this.sourceWidth);
    this.scratch2Canvas.attr('height', this.sourceHeight);

    this.sourceContext.drawImage(this.sourceImage, 0, 0);
    this.scratch2Context.drawImage(this.sourceImage, 0, 0);
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
      r.x = Math.floor(r.x);
      r.y = Math.floor(r.y);
      r.width = Math.floor(r.width);
      r.height = Math.floor(r.height);
      if (r.x + r.width > this.sourceImage.width) {
        r.width = this.sourceImage.width - r.x;
      }
      if (r.y + r.height > this.sourceImage.height) {
        r.height = this.sourceImage.height - r.y;
      }
      this.sampleRect = r;
      this.drawSampleRect(this.sampleRect);
      this.generateDiamonds();
      this.generateDiamondTiles();
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

  generateWangTiles: function() {
    this.subSamples = [];
    this.subSampleMap = {};

    for (var i = 0; i < this.TILES.length; i++) {
      var tile = this.TILES[i];

      var diamondTileData = this[tile + 'DiamondTileContext'].getImageData(0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE);

      var rect, wangTile;
      var minWeight = Infinity;

      for (var j = 0; j < this.MAX_ITERATIONS; j++) {
        var r = this.getRandomRectWithoutDupCheck();
        var subSampleData = this.scratch2Context.getImageData(this.sampleRect.x + r.x, this.sampleRect.y + r.y, this.BLOCK_SIZE, this.BLOCK_SIZE);
        var wt = new WangTile(diamondTileData, subSampleData);
        wt.init();

        if (wt.maxRegionWeight < minWeight) {
          rect = r;
          wangTile = wt;
          minWeight = wt.maxRegionWeight;

          console.debug("Found lower error sub-sample (" + j + "): " + wt.maxRegionWeight);
        }
      }

      console.debug("Drawing tile " + i + " with error: " + wangTile.maxRegionWeight);
      try {
        this[tile + 'SubSampleContext'].drawImage(this.sourceImage, this.sampleRect.x + rect.x, this.sampleRect.y + rect.y, this.BLOCK_SIZE, this.BLOCK_SIZE, 0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE);
      }
      catch (e) {
        debugger;
      }
      this.subSampleMap[tile] = rect;
      this.subSamples.push(rect);
      this.drawSubSampleRect(rect.x, rect.y, tile);
      this[tile + 'CuttingPathContext'].drawImage(this.sourceImage, this.sampleRect.x + rect.x, this.sampleRect.y + rect.y, this.BLOCK_SIZE, this.BLOCK_SIZE, 0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE);

      wangTile.computeGraft();
      wangTile.drawWangTile(this[tile + 'WangTileContext']);
      wangTile.drawPath(this[tile + 'CuttingPathContext']);
      wangTile.drawXWeight(this[tile + 'XWeightContext']);
      wangTile.drawYWeight(this[tile + 'YWeightContext']);
      wangTile.drawDiff(this[tile + 'ImageDiffContext']);
      wangTile.drawX1Gradient(this[tile + 'XGradientContext']);
      wangTile.drawY1Gradient(this[tile + 'YGradientContext']);
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
    var rect = null;
    var dist;
    var maxDist = 0;
    var i = this.MAX_ITERATIONS;
    while (i-- > 0) {
      r = this.getRandomRectWithoutDupCheck();
      if (!this.rectanglesOverlap(r, rects)) {
        rects.push(r);
        return r;
      }
      else {
        dist = this.getMinDist(r, rects);
        if (dist > maxDist) {
          maxDist = dist;
          rect = r;
        }
      }
    }

    rects.push(rect);
    return r;
  },

  getMinDist: function(r, rects) {
    // Returns the minimum distance to the other rectangles
    var minDist = Infinity;
    for (var i = 0; i < rects.length; i++) {
      var dist = this.getDist(r, rects[i]);
      if (dist < minDist) minDist = dist;
    }

    return minDist;
  },

  getDist: function(r1, r2) {
    var dx = r2.x - r1.x;
    var dy = r2.y - r1.y;
    return Math.sqrt(dx * dx + dy * dy);
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

    var x = Math.floor(Math.random() * validWidth);
    var y = Math.floor(Math.random() * validHeight);

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
    try {
      this.scratchContext.drawImage(this.sourceImage, x, y, this.BLOCK_SIZE, this.BLOCK_SIZE / 2, 0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE / 2);
    }
    catch (e) {
      debugger;
    }
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

  tileMatches: function(colors) {
    var matches = [];
    for (var i = 0; i < this.TILES.length; i++) {
      var tile = this.TILES[i];
      if (tile.match(colors)) matches.push(tile);
    }

    return matches;
  },

  matchTile: function(x, y, colors) {
    var duplicates = [];
    var duplicate;
    var matches = this.tileMatches(colors);
    if (x > 0) {
      var leftTile = this.tiles[x - 1][y];
      duplicate = this.removeColor(matches, leftTile);
      if (duplicate) duplicates.push(duplicate);
    }

    if (y > 0) {
      var upperTile = this.tiles[x][y - 1];
      duplicate = this.removeColor(matches, upperTile);
      if (duplicate) duplicates.push(duplicate);
    }

    if (x > 0 && y > 0) {
      var upperLeftTile = this.tiles[x - 1][y - 1];
      duplicate = this.removeColor(matches, upperLeftTile);
      if (duplicate) duplicates.push(duplicate);
    }

    if (x < this.tiles.length - 1 && y > 0) {
      var upperRightTile = this.tiles[x + 1][y - 1];
      duplicate = this.removeColor(matches, upperRightTile);
      if (duplicate) duplicates.push(duplicate);
    }

    if (matches.length) {
      return matches[this.random(matches.length)];
    }
    else {
      return duplicates[this.random(matches.length)];
    }
  },

  removeColor: function(tiles, color) {
    var match = tiles.indexOf(color);
    if (match == -1) {
      return null;
    }
    else {
      return tiles.splice(match, 1)[0];
    }
  },

  drawTiles: function(context, width, height) {
    var x, y, tile;
    var xTiles = width / this.BLOCK_SIZE;
    var yTiles = height / this.BLOCK_SIZE;
    this.tiles = new Array(xTiles);
    var tiles = this.tiles;
    for (x = 0; x < xTiles; x++) tiles[x] = new Array(yTiles);

    for (x = 0; x < xTiles; x++) {
      for (y = 0; y < yTiles; y++) {
        if (x == 0 && y == 0) {
          // Pick random tile for the first one
          tiles[x][y] = this.TILES[this.random(this.TILES.length)];
        }
        else if (x == 0) {
          // Left column, match top of this tile to bottom of above tile
          tiles[x][y] = this.matchTile(x, y, new RegExp(tiles[x][y - 1][2] + "..."));
        }
        else if (y == 0) {
          // Top row, match left
          tiles[x][y] = this.matchTile(x, y, new RegExp("..." + tiles[x - 1][y][1]));
        }
        else {
          // Interior tile, match top and left
          tiles[x][y] = this.matchTile(x, y, new RegExp(tiles[x][y - 1][2] + ".." + tiles[x - 1][y][1]));
        }

        // console.debug("tile(" + x + ", " + y + "): " + tiles[x][y]);

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
