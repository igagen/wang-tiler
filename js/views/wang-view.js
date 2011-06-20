var WangView = Backbone.View.extend({
  el: "body",

  events: {
    "change #image-upload-button": "setSourceImage",
    "load #source-image": "imageLoaded",
    "mousedown canvas": "handleMouseDown",
    "mouseup canvas": "handleMouseUp",
    "mousemove canvas": "handleMouseMove"
  },

  BLOCK_SIZE: 48,
  MAX_ITERATIONS: 100,
  TILES: ["rygb", "gbgb", "ryry", "gbry", "rbgy", "gygy", "rbrb", "gyrb"],
  COLORS: "rgby",

  initialize: function() {
    _.bindAll(this, "setSourceImage", "imageLoaded", "handleMouseDown", "handleMouseUp", "handleMouseMove");

    this.sourceCanvas = $("#source-canvas");
    this.scratchCanvas = $("#scratch");
    this.tiles = {};

    for (var i = 0; i < this.TILES.length; i++) {
      var tile = this.TILES[i];
      this.tiles[tile] = {};
      this.tiles[tile].canvas = this[tile + 'DiamondTileCanvas'] = $("#diamond-tiles ." + tile);
      this.tiles[tile].context = this[tile + 'DiamondTileContext'] = this[tile + 'DiamondTileCanvas'][0].getContext("2d");
      this.tiles[tile].canvas = this[tile + 'SubSampleCanvas'] = $("#sub-samples ." + tile);
      this.tiles[tile].context = this[tile + 'SubSampleContext'] = this[tile + 'SubSampleCanvas'][0].getContext("2d");
    }

    this.sourceContext = this.sourceCanvas[0].getContext("2d");
    this.scratchContext = this.scratchCanvas[0].getContext("2d");

    this.imageUploadButton = $("#image-upload-button");

    var blockSize = this.BLOCK_SIZE;
    $("#diamond-tiles canvas, #sub-samples canvas, #wang-tiles canvas, #scratch").each(function() {
      $(this).attr('width', blockSize);
      $(this).attr('height', blockSize);
    })

    this.sampling = false;
  },

  setSourceImage: function() {
    this.sourceImage = new Image();
    this.sourceImage.onload = this.imageLoaded;
    this.sourceImage.src = this.imageUploadButton.val().replace(/C:\\fakepath\\/, 'images/');
  },

  imageLoaded: function() {
    this.sourceWidth = this.sourceImage.width;
    this.sourceHeight = this.sourceImage.height;

    this.sourceCanvas.attr('width', this.sourceWidth);
    this.sourceCanvas.attr('height', this.sourceHeight);

    this.sourceContext.drawImage(this.sourceImage, 0, 0);
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

  generateSubSamples: function() {
    this.subSamples = [];
    this.subSampleMap = {};
    for (var i = 0; i < this.TILES.length; i++) {
      var tile = this.TILES[i];
      var r = this.addRandomRect(this.subSamples);
      this.subSampleMap[tile] = r;

      this.drawSubSampleRect(r.x, r.y, tile);
    }
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
    return xyzToLab(xyz[0], xyz[1], xyz[2]);
  },

  colorDifference: function(c1, c2) {
    // e76 algorithm is simply the Euclidean distance between the two colors in the Lab color space
    var dL = c2[0] - c1[0];
    var da = c2[1] - c1[1];
    var db = c2[2] - c1[2];
    return Math.sqrt(dL * dL + da * da + db * db);
  }
});

$(function() {
  new WangView();
});
