# Implementation of Strict Wang Tiles as described in:
# 'Efficient Texture Synthesis Using Strict Wang Tiles' by Xinyu Zhang and Young J. Kim

class WangTile extends ImageGraph
  ROUNDING_TOLERANCE: 0.001
  WEIGHT_MULT: 1
  SQUARE_WEIGHTS: false
  TERMINAL_WEIGHT_MULT: 5
  TERMINAL_WEIGHT_DECAY: 0.2
  ADD_DIAGONAL_EDGES: true
  SIMPLE_WEIGHT_CALC: false
  CORNER_SIZE: 6

  constructor: (imageData1, imageData2, weightData = null) ->
    super(imageData1, imageData2)

    if @width != @height || @width % 2 != 0
      throw "Wang tiles must be square with even width and height"

    @size = @width

  init: ->
    maxRegionWeight = 0
    base = @size - @CORNER_SIZE - 1

    # Corners
    topLeftWeight = @imageData1.regionWeight @imageData2, 0, 0, @CORNER_SIZE, @CORNER_SIZE
    topRightWeight = @imageData1.regionWeight @imageData2, base, 0, @CORNER_SIZE, @CORNER_SIZE
    bottomRightWeight = @imageData1.regionWeight @imageData2, base, base, @CORNER_SIZE, @CORNER_SIZE
    bottomLeftWeight = @imageData1.regionWeight @imageData2, 0, 0, @CORNER_SIZE, @CORNER_SIZE

    @maxRegionWeight = Math.max topLeftWeight, topRightWeight, bottomRightWeight, bottomLeftWeight

    @weightData = new PixelData(weightData) if weightData?

    weightSum = 0
    diffSum = 0

    # Initialize nodes
    for y in [0...@height]
      for x in [0...@width]
        node = @getNode x, y

        diffSum += ImageUtil.colorDifference(@imageData1.color(x, y), @imageData2.color(x, y))

        if x > 0 # Left
          leftNode = @getNode x - 1, y
          weight = @weight(x - 1, y, x, y)
          weightSum += weight
          @addEdge leftNode, node, weight
          @addEdge node, leftNode, weight

        if y > 0 # Top
          topNode = @getNode x, y - 1
          weight = @weight(x, y - 1, x, y)
          weightSum += weight
          @addEdge node, topNode, weight
          @addEdge topNode, node, weight

    @avgDiff = diffSum / @numNodes

    # Add diagonal edges, the weight for these edges is the
    # minimum of the hypotenuses of the two different non-diagonal straight routes
    if @ADD_DIAGONAL_EDGES
      for x in [0...@width]
        for y in [1...@height]
          n = @getNode x, y # node
          u = @getNode x, y - 1 # upper node
          uw = @getEdge(n, u).capacity # weight of edge from n to u

          # Upper left
          if x > 0 && y > 0
            l = @getNode x - 1, y # left node
            ul = @getNode x - 1, y - 1 # upper left node
            lw = @getEdge(n, l).capacity # weight of edge from n to l
            l2ulw = @getEdge(l, ul).capacity # weight of edge from l to ul
            u2ulw = @getEdge(u, ul).capacity # weight of edge from u to ul
            luh = Math.sqrt lw * lw + l2ulw * l2ulw # hypotenuse of l - u triangle
            ulh = Math.sqrt uw * uw + u2ulw * u2ulw # hypotenuse of u - l triangle
            weight = Math.min luh, ulh # minimum of 2 hypotenuses

            @addEdge n, ul, weight
            @addEdge ul, n, weight

          # Upper right
          if x < (@width - 1) && y > 0
            r = @getNode x + 1, y
            ur = @getNode x + 1, y - 1
            rw = @getEdge(n, r).capacity
            r2urw = @getEdge(r, ur).capacity
            u2urw = @getEdge(u, ur).capacity
            ruh = Math.sqrt rw * rw + r2urw * r2urw
            urh = Math.sqrt uw * uw + u2urw * u2urw
            weight = Math.min ruh, urh

            @addEdge n, ur, weight
            @addEdge ur, n, weight

    # Adds source and sink nodes as appropriate for solving the min-cut for a strict Wang-tile
    # Source nodes around the borders, and sink nodes diagonally crossing thru

    @avgWeight = weightSum / (2 * @numNodes)

    # Add border source nodes
    for x in [0...@width]
      @setMultiSource @getNode(x, 0)
      @setMultiSource @getNode(x, @height - 1)

    for y in [1...@height - 1]
      @setMultiSource @getNode(0, y)
      @setMultiSource @getNode(@width - 1, y)

    # Add interior sink nodes (X-shape that divides the image into four triangles, not including 1 pixel border)
    for i in [1...@width - 1]
      @setMultiSink @getNode(i, i)
      @setMultiSink @getNode(i, @height - 1 - i)

  weight: (sx, sy, tx, ty) ->
    terminalDist = Math.min @sinkDistance(sx, sy), @sinkDistance(tx, ty)
    mult = @TERMINAL_WEIGHT_MULT * Math.pow @TERMINAL_WEIGHT_DECAY, terminalDist
    mult = 1 if mult < 1

    weight = @WEIGHT_MULT * mult * super(sx, sy, tx, ty)
    if @SQUARE_WEIGHTS then weight * weight else weight

  sourceDistance: (x, y) ->
    Math.min(x, @width - x - 1, y, @height - y - 1)

  sinkDistance: (x, y) ->
    if x < y
      sinkDist = y - x
    else if x == y
      return 0 # Sink node
    else # x > y
      sinkDist = x - y

    if x < @height - 1 - y
      sinkDist = Math.min(sinkDist, @height - 1 - y - x)
    else if x == @height - 1 - y
      return 0 # Sink node
    else
      sinkDist = Math.min(sinkDist, x - @height + 1 + y)

  terminalDistance: (x, y) ->
    Math.min @sourceDistance(x, y), @sinkDistance(x, y)

  drawWangTile: (context) ->
    rawImageData = context.createImageData @width, @height
    imageData = new PixelData rawImageData

    for node in @sourceNodes
      x = node.val.x
      y = node.val.y
      imageData.setColor(x, y, @imageData1.color(x, y))

    for node in @sinkNodes
      x = node.val.x
      y = node.val.y
      imageData.setColor(x, y, @imageData2.color(x, y))
      # imageData.setColor(x, y, [255, 0, 255, 255])

    context.putImageData imageData.rawImageData, 0, 0

  # Debug drawing methods

  drawPath: (context) ->
    rawImageData = context.createImageData @width, @height
    imageData = new PixelData rawImageData

    for node in @sourceNodes
      x = node.val.x
      y = node.val.y
      imageData.setColor x, y, [0, 255, 255, 255]

    for node in @sinkNodes
      x = node.val.x
      y = node.val.y
      imageData.setColor(x, y, @imageData2.color(x, y))

    context.putImageData rawImageData, 0, 0

  drawXWeight: (context) ->
    rawImageData = context.createImageData @width, @height
    imageData = new PixelData rawImageData

    maxWeight = @avgWeight * 2
    for x in [0...@width - 1]
      for y in [0...@height]
        weight = @weight(x, y, x + 1, y) / maxWeight
        imageData.setColor x, y, [weight * 255, weight * 255, weight * 255, 255]

    context.putImageData rawImageData, 0, 0

  drawYWeight: (context) ->
    rawImageData = context.createImageData @width, @height
    imageData = new PixelData rawImageData

    maxWeight = @avgWeight * 2
    for x in [0...@width]
      for y in [0...@height - 1]
        weight = @weight(x, y, x, y + 1) / maxWeight
        imageData.setColor x, y, [weight * 255, weight * 255, weight * 255, 255]

    context.putImageData rawImageData, 0, 0

  drawDiff: (context) ->
    rawImageData = context.createImageData @width, @height
    imageData = new PixelData rawImageData

    maxDiff = @avgDiff * 2

    for x in [0...@width]
      for y in [0...@height]
        c1 = @imageData1.color x, y
        c2 = @imageData2.color x, y
        diff = ImageUtil.colorDifference(c1, c2) / maxDiff
        imageData.setColor x, y, [diff * 255, diff * 255, diff * 255, 255]

    context.putImageData rawImageData, 0, 0

  drawXGradientSum: (context) -> @drawGradientSum context, 1, 0
  drawYGradientSum: (context) -> @drawGradientSum context, 0, 1
  drawX1Gradient: (context) -> @drawGradient context, @imageData1, 1, 0
  drawX2Gradient: (context) -> @drawGradient context, @imageData2, 1, 0
  drawY1Gradient: (context) -> @drawGradient context, @imageData1, 0, 1
  drawY2Gradient: (context) -> @drawGradient context, @imageData2, 0, 1

  drawGradient: (context, image, dx, dy) ->
    rawImageData = context.createImageData @width, @height
    imageData = new PixelData rawImageData

    maxGrad = ImageUtil.magnitude [255, 255, 255]

    for x in [0...@width]
      for y in [0...@height]
        g = ImageUtil.magnitude(image.gradient(x, y, dx, dy)) / maxGrad
        imageData.setColor x, y, [g * 255, g * 255, g * 255, 255]

    context.putImageData rawImageData, 0, 0

  drawGradientSum: (context, dx, dy) ->
    rawImageData = context.createImageData @width, @height
    imageData = new PixelData rawImageData

    maxGrad = ImageUtil.magnitude [100, -128, -128]

    for x in [0...@width]
      for y in [0...@height]
        g1 = ImageUtil.magnitude(@imageData1.gradient(x, y, dx, dy)) / maxGrad
        g2 = ImageUtil.magnitude(@imageData1.gradient(x, y, dx, dy)) / maxGrad
        gSum = (g1 + g2) / 2
        imageData.setColor x, y, [gSum * 255, gSum * 255, gSum * 255, 255]

    context.putImageData rawImageData, 0, 0

window.WangTile = WangTile