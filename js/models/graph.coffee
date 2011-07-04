# Implementation of:
# 'An Experimental Comparison of Min-Cut / Max-Flow Algorithms for Energy Minimization in Vision'
# By Yuri Boykov and Vladimir Kolmogorov
# Described here: http://www.csd.uwo.ca/~yuri/Papers/pami04.pdf

class Node
  constructor: (@id, val = null) ->
    @val = val if val?

class Edge
  constructor: (@capacity) ->

class Graph
  SOURCE: "source"
  SINK: "sink"
  ROUNDING_TOLERANCE: 0.001
  TERMINAL_WEIGHT_MULT: 10
  TERMINAL_MULT_DECAY: 0.8
  WEIGHT_TERMINAL_EDGES: true
  SIMPLE_WEIGHT_CALC: false

  constructor: ->
    @numNodes = 0 # Doesn't include source and sink
    @nodes = {}
    @edges = {}
    @residualEdges = {}

    @source = @addNode @SOURCE, @SOURCE
    @sink = @addNode @SINK, @SINK
    @source.tree = @SOURCE
    @sink.tree = @SINK
    @active = [@source, @sink]
    @orphaned = []

  addNode: (val, id = null) ->
    if id? && @nodes[id]?
      throw new Error "Duplicate node" 

    id ?= @numNodes++
    @nodes[id] = new Node id, val
    node = @nodes[id]
    node.tree = null
    node.parentId = null
    node

  addEdge: (p, q, capacity) ->
    throw new Error "Duplicate edge" if @edges[p.id]?[q.id]

    edge = new Edge capacity
    @edges[p.id] ?= {}
    @edges[p.id][q.id] = edge
    edge.flow = 0

    if p.id == undefined || q.id == undefined
      throw new Error "Bad node in call to addEdge"

    @residualEdges[p.id] ?= {}
    @residualEdges[q.id] ?= {}
    @residualEdges[p.id][q.id] ?= new Edge 0
    @residualEdges[q.id][p.id] ?= new Edge 0

    @residualEdges[p.id][q.id].capacity += capacity

    edge

  setCapacity: (p, q, capacity) ->
    @edges[p.id][q.id].capacity = capacity
    @residualEdges[p.id][q.id].capacity = capacity

  setMultiSource: (p) ->
    p.multiSource = true
    p.terminalDistance = 0
    @addEdge @source, p, Infinity

  setMultiSink: (p) ->
    p.multiSink = true
    p.terminalDistance = 0
    @addEdge p, @sink, Infinity

  solve: ->
    loop
      path = @grow()
      # @printPath path
      if path.length == 0 then break else @augment path
      @adopt()

  maxFlow: ->
    flow = 0
    flow += @edges[@source.id][id].flow for id of @edges[@source.id]
    flow

  findTree: (p) ->
    return p.tree if p.tree?
    for q in @neighbors p
      return q.tree if q.tree?
      return @findTree q

  partition: ->
    @sourceNodes = []; @sinkNodes = []

    for id of @nodes
      p = @nodes[id]
      unless p.tree?
        p.tree = @findTree p
        # console.debug "Unclassified node '#{p.id}'"

      @sourceNodes.push p if p.tree == @SOURCE
      @sinkNodes.push p if p.tree == @SINK

    [@sourceNodes, @sinkNodes]

  grow: ->
    while @active.length
      p = @active[0]
      for q in @neighbors p when @treeCapacity(p, q) > 0
        if q.tree == null
          @setTree q, p.tree
          @setParent q, p
          @addActive q
        else if q.tree != p.tree != null
          return @getPath p, q

      @removeActive p

    [] # No more active nodes to search, return an empty path to indicate completion

  getPath: (p, q) ->
    # Get path from source to sink, assuming p and q are frontier nodes
    # in the source and sink trees that are connected by an edge

    if p.tree == null || q.tree == null || p.tree == q.tree
      throw new Error "Invalid nodes in call to getPath - p and q must be from different trees"

    path = []

    if p.tree == @SOURCE then sourceNode = p else sourceNode = q
    loop
      path.unshift sourceNode
      if sourceNode.parentId? then sourceNode = @nodes[sourceNode.parentId] else break

    if p.tree == @SINK then sinkNode = p else sinkNode = q
    loop
      path.push sinkNode
      if sinkNode.parentId? then sinkNode = @nodes[sinkNode.parentId] else break

    path

  augment: (path) ->
    @addFlowToPath path, @bottleneckCapacity(path)

  clamp: (val, clamp) ->
    # If val is within rounding tolerance of clamp, return clamp, otherwise return val
    if val > clamp - @ROUNDING_TOLERANCE && val < clamp + @ROUNDING_TOLERANCE
      return clamp
    else
      return val

  addResidualCapacity: (p, q, capacity) ->
    @residualEdges[p.id][q.id].capacity += capacity

  removeResidualCapacity: (p, q, capacity) ->
    # To prevent rounding error, we clamp to zero
    @residualEdges[p.id][q.id].capacity = @clamp(@residualCapacity(p, q) - capacity, 0)
    throw new Error "Negative residual capacity" if @residualCapacity(p, q) < 0

  addFlow: (p, q, flow) ->
    # Update residual capacities
    @removeResidualCapacity p, q, flow
    @addResidualCapacity q, p, flow

    if @residualCapacity(p, q) == 0
      # Edge is saturated, orphan the leaf node
      @addOrphan q if p.tree == q.tree == @SOURCE
      @addOrphan p if p.tree == q.tree == @SINK

    # Push flow through the given edge if it is present
    edge = @edges[p.id]?[q.id]
    edgeCapacity = 0
    if edge?
      edgeCapacity = edge.capacity - edge.flow
      if edgeCapacity < flow
        edge.flow += edgeCapacity
        flow -= edgeCapacity
      else
        edge.flow += flow
        flow = 0

    # If there is still flow left, push it through the reverse edge
    if flow > 0
      edge = @edges[q.id]?[p.id]
      if edge?
        edge.flow -= flow
        edge.flow = @clamp edge.flow, 0

  addFlowToPath: (path, flow) ->
    @addFlow path[i], path[i + 1], flow for i in [0...path.length - 1]

  residualCapacity: (p, q) ->
    @residualEdges[p.id][q.id].capacity

  bottleneckCapacity: (path) ->
    # Returns the bottleneck residual capacity along the augmenting path

    minCapacity = Infinity
    for i in [0...path.length - 1]
      p = path[i]; q = path[i + 1]
      capacity = @residualCapacity p, q
      minCapacity = capacity if capacity < minCapacity

    # throw new Error "Infinite capacity path" if minCapacity == Infinity
    throw new Error "No residual capacity in this path" if minCapacity <= 0

    minCapacity

  adopt: ->
    while @orphaned.length
      @process @orphaned.pop()

  process: (p) ->
    return if @findParent p

    for q in @neighbors p when q.tree == p.tree
      @addActive q if @treeCapacity(q, p) > 0
      @addOrphan q if q.parentId == p.id

    @setTree p, null
    @removeActive p

    # p is now free, all neighbors connected by non-saturated edges should be active

  setTree: (p, tree) -> p.tree = tree

  setParent: (child, parent) ->
    throw new Error "Invalid parent" unless parent.tree?
    if parent? then child.parentId = parent.id else child.parentId = null

  neighbors: (p) ->
    # Returns all nodes that are connected to this node with an edge, either as a source, or destination
    nodes = []
    for id of @residualEdges[p.id]
      throw "Undefined edge" if @nodes[id] == undefined
      nodes.push(@nodes[id])

    nodes

  outgoingNeighbors: (p) ->
    # Returns all nodes that are connected to this node as a destination
    (@nodes[id] for id of @edges[p.id])

  treeCapacity: (p, q) ->
    throw new Error "Invalid node in call to treeCapacity" if !p || !q

    # Returns the residual capacity as appropriate for the tree the node is in
    if p.tree == @SOURCE
      @residualEdges[p.id][q.id].capacity
    else if p.tree == @SINK
      @residualEdges[q.id][p.id].capacity
    else
      throw new Error "treeCapacity called on node with no tree"

  addOrphan: (p) ->
    # Removes the parent connection, but does not remove the node from its tree
    throw new Error "Node is already in the orphaned list" if @orphaned.indexOf(p) != -1
    p.parentId = null
    @orphaned.push p

  addActive: (p) ->
    @active.push p if @active.indexOf(p) == -1

  removeActive: (p) ->
    i = @active.indexOf p
    # console.debug("Attempted to remove active node that was not active") if i == -1
    @active.splice i, 1

  findParent: (p) ->
    for q in @neighbors p
      if q.tree == p.tree && @treeCapacity(q, p) > 0 && @isRooted q
        @setParent p, q
        return true

    false

  isRooted: (p) ->
    while p.parent?
      return true if q.parentId == @SOURCE || q.parentId == @SINK

    false

  validatePath: (path) ->
    return true if path.length == 0

    throw new Error "Path must start at source" if path[0] != @source
    throw new Error "Path must end at sink" if path[path.length - 1] != @sink

    for i in [0...path.length - 1]
      edge = @edges[path[i].id][path[i + 1].id]
      throw new Error "Path has a gap" unless edge?
      throw new Error "Infinite flow" if edge.flow == Infinity

  validateFlow: ->
    if @sourceFlow() != @sinkFlow()
      throw new Error "Source and sink flows don't match"

  printPath: (path) ->
    pathVals = []
    for p in path
      if p == @source
        pathVals.push "SOURCE"
      else if p == @sink
        pathVals.push "SINK"
      else
        pathVals.push "(#{p.val.x},#{p.val.y})"

    console.debug pathVals.join(" - ")


# Flow network representation of an image difference where each node is a pixel.
# Each edge represents the pixel color difference between images.
# A min-cut of the flow network can be used to graft the two images while
# minimizing the appearance of seams.
class ImageGraph extends Graph
  constructor: (imageData1, imageData2, weightData = null) ->
    super()

    if imageData1.width != imageData2.width || imageData1.height != imageData2.height
      throw "Image dimensions don't match"

    @imageData1 = new PixelData imageData1
    @imageData2 = new PixelData imageData2
    @weightData = new PixelData weightData if weightData?

    @width = @imageData1.width
    @height = @imageData1.height

    @edgeMult = 4
    @edgeMultDecay = 0.8
    @fullGraph = true

    totalWeight = 0

    # Initialize nodes
    for y in [0...@height]
      for x in [0...@width]
        node = @addNode { x: x, y: y }

        if x > 0 # Left
          leftNode = @getNode x - 1, y
          weight = @weight(x - 1, y, x, y)
          totalWeight += weight
          @addEdge leftNode, node, weight
          @addEdge node, leftNode, weight

        if y > 0 # Top
          topNode = @getNode x, y - 1
          weight = @weight(x, y - 1, x, y)
          totalWeight += weight
          @addEdge node, topNode, weight
          @addEdge topNode, node, weight

          # Adds source and sink nodes as appropriate for solving the min-cut for a strict Wang-tile
          # Source nodes around the borders, and sink nodes diagonally crossing thru

          if @width != @height || @width % 2 != 0
            throw "Wang tiles must be square with even width and height"

    @meanWeight = totalWeight / (2 * @numNodes)

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

  getNode: (x, y) ->
    @nodes[y * @height + x]

  getEdge: (px, py, qx, qy) ->
    @edges[py * @width + px][qy * @width + qx]

  weight: (sx, sy, tx, ty) ->
    if @weightData
      sw = @weightData.color(sx, sy)[0] / 255
      return 0.1 + sw

    s1 = @imageData1.labColor(sx, sy); s2 = @imageData2.labColor(sx, sy)
    t1 = @imageData1.labColor(tx, ty); t2 = @imageData2.labColor(tx, ty)

    diff = ImageUtil.colorDifference(s1, s2) + ImageUtil.colorDifference(t1, t2)
    return diff if @SIMPLE_WEIGHT_CALC

    dx = tx - sx
    dy = ty - sy

    gs1 = ImageUtil.magnitude @imageData1.gradient(sx, sy, dx, dy)
    gs2 = ImageUtil.magnitude @imageData2.gradient(sx, sy, dx, dy)
    gt1 = ImageUtil.magnitude @imageData1.gradient(tx, ty, dx, dy)
    gt2 = ImageUtil.magnitude @imageData2.gradient(tx, ty, dx, dy)

    mult = 1
    if sx == 0 || tx == 0 || sx == (@width - 1) || tx == (@width - 1) || sy == 0 || ty == 0 || sy == (@height - 1) || ty == (@height - 1)
      mult = @TERMINAL_WEIGHT_MULT

    if sx == sy || tx == ty || sx == (@height - 1 - sy) || tx == (@height - 1 - ty)
      mult = @TERMINAL_WEIGHT_MULT

    mult * diff / (gs1 + gs2 + gt1 + gt2)

  colorDifference: (sx, sy, tx, ty) ->
    s1 = @imageData1.labColor(sx, sy); s2 = @imageData2.labColor(sx, sy)
    t1 = @imageData1.labColor(tx, ty); t2 = @imageData2.labColor(tx, ty)

    ImageUtil.colorDifference(s1, s2) + ImageUtil.colorDifference(t1, t2)

  # weightTerminalEdges: ->
  #   # Cutting paths too close to the sink give diamond artifacts
  #   # Cutting paths too close to the source give square artifacts
  #   # We weight edges that lead to nearby source or sink nodes higher to lessen these artifactss
  # 
  #   for x in [0...@width]
  #     for y in [0...@height]
  #       p = @getNode x, y
  #       for q in @outgoingNeighbors p
  #         unless @isTerminal q
  #           mult = @getWeightMult x, y
  #           capacity = @edges[p.id][q.id].capacity * mult
  #           @setCapacity p, q, capacity
  #           # console.debug "(#{p.val.x},#{p.val.y})-(#{q.val.x},#{q.val.y}): #{@getWeightMult x, y}"

  terminalDistance: (x, y) ->
    # Returns the distance to the nearest source or sink

    return 0 if x == 0 || y == 0 # Source node

    sourceDist = Math.min(x, @width - x - 1, y, @height - y - 1)

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

    Math.min sourceDist, sinkDist

  isTerminal: (p) ->
    p == @source || p == @sink

  getWeightMult: (x, y) ->
    weightMult = @TERMINAL_WEIGHT_MULT * Math.pow(@TERMINAL_WEIGHT_DECAY, @terminalDistance(x, y))
    if weightMult < 1 then 1 else weightMult

  computeGraft: ->
    @solve()
    @partition()

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

    maxWeight = @meanWeight * 2
    for x in [0...@width - 1]
      for y in [0...@height]
        weight = Math.min(@weight(x, y, x + 1, y) / maxWeight, 1)
        imageData.setColor x, y, [weight * 255, weight * 255, weight * 255, 255]

    context.putImageData rawImageData, 0, 0

  drawYWeight: (context) ->
    rawImageData = context.createImageData @width, @height
    imageData = new PixelData rawImageData

    maxWeight = @meanWeight * 2
    for x in [0...@width]
      for y in [0...@height - 1]
        weight = Math.min(@weight(x, y, x, y + 1) / maxWeight, 1)
        imageData.setColor x, y, [weight * 255, weight * 255, weight * 255, 255]

    context.putImageData rawImageData, 0, 0

  drawDiff: (context) ->
    rawImageData = context.createImageData @width, @height
    imageData = new PixelData rawImageData

    maxDiff = ImageUtil.colorDifference [100, 127, 127], [0, -128, -128]

    for x in [0...@width]
      for y in [0...@height]
        c1 = @imageData1.labColor x, y
        c2 = @imageData2.labColor x, y
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

    maxGrad = ImageUtil.magnitude [100, -128, -128]

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

  printWangTile: ->
    console.debug "---------- SOURCE ----------"
    for node in @sourceNodes
      x = node.val.x
      y = node.val.y
      console.debug "(#{x},#{y})"

    console.debug "---------- SINK ----------"
    for node in @sinkNodes
      x = node.val.x
      y = node.val.y
      console.debug "(#{x},#{y})"

# Exports
window.Node = Node
window.Edge = Edge
window.Graph = Graph
window.ImageGraph = ImageGraph