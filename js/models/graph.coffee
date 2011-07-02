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
    if @edges[p.id]?[q.id]
      debugger
      throw new Error "Duplicate edge"

    edge = new Edge capacity
    @edges[p.id] ?= {}
    @edges[p.id][q.id] = edge
    edge.flow = 0

    if p.id == undefined || q.id == undefined
      debugger
      throw new Error "Bad node in call to addEdge"

    @residualEdges[p.id] ?= {}
    @residualEdges[q.id] ?= {}
    @residualEdges[p.id][q.id] ?= new Edge 0
    @residualEdges[q.id][p.id] ?= new Edge 0

    @residualEdges[p.id][q.id].capacity += capacity

    edge

  setMultiSource: (p) ->
    p.multiSource = true
    @addEdge @source, p, Infinity

  setMultiSink: (p) ->
    p.multiSink = true
    @addEdge p, @sink, Infinity

  solve: ->
    loop
      path = @grow()
      @printPath path
      if path.length == 0 then break else @augment path
      @adopt()

  maxFlow: ->
    flow = 0
    flow += @edges[@source.id][id].flow for id of @edges[@source.id]
    flow

  partition: ->
    @sourceNodes = []; @sinkNodes = []

    for id of @nodes
      p = @nodes[id]
      unless p.tree?
        console.debug "Unclassified node '#{p.id}'"
        @sourceNodes.push p

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

    throw new Error "Infinite capacity path" if minCapacity == Infinity

    if minCapacity <= 0
      debugger
      throw new Error "No residual capacity in this path"

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
      if @nodes[id] == undefined
        debugger
        throw "Undefined edge"
      else
        nodes.push(@nodes[id])

    nodes

  treeCapacity: (p, q) ->
    if !p || !q
      debugger
      throw new Error "Invalid node in call to treeCapacity"

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
    console.debug("Attempted to remove active node that was not active") if i == -1
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
  constructor: (imageData1, imageData2) ->
    super()

    if imageData1.width != imageData2.width || imageData1.height != imageData2.height
      throw "Image dimensions don't match"

    @imageData1 = new PixelData imageData1
    @imageData2 = new PixelData imageData2

    @width = @imageData1.width
    @height = @imageData1.height

    @edgeMult = 1
    @edgeMultDecay = 1
    @fullGraph = true

    # Initialize nodes
    for y in [0...@height]
      for x in [0...@width]
        node = @addNode { x: x, y: y }

        if @fullGraph
          if x > 0 # Left
            leftNode = @getNode x - 1, y
            leftColorDiff = @colorDifference x - 1, y, x, y
            @addEdge leftNode, node, leftColorDiff
            @addEdge node, leftNode, leftColorDiff

          if y > 0 # Top
            topNode = @getNode x, y - 1
            topColorDiff = @colorDifference x, y - 1, x, y
            @addEdge node, topNode, topColorDiff
            @addEdge topNode, node, topColorDiff

  getNode: (x, y) ->
    @nodes[y * @height + x]

  colorDifference: (sx, sy, tx, ty) ->
    s1 = @imageData1.labColor(sx, sy); s2 = @imageData2.labColor(sx, sy)
    t1 = @imageData1.labColor(tx, ty); t2 = @imageData2.labColor(tx, ty)

    @imageData1.colorDifference(s1, s2) + @imageData1.colorDifference(t1, t2)

  initWangTile: ->
    # Adds source and sink nodes as appropriate for solving the min-cut for a strict Wang-tile
    # Source nodes around the borders, and sink nodes diagonally crossing thru

    if @width != @height || @width % 2 != 0
      throw "Wang tiles must be square with even width and height"

    # Add border source nodes
    for x in [0...@width]
      edge.capacity *= @edgeMult for edge in @getNode x, 0
      edge.capacity *= @edgeMult for edge in @getNode x, @height - 1

      @setMultiSource @getNode(x, 0)
      @setMultiSource @getNode(x, @height - 1)

    for y in [1...@height - 1]
      edge.capacity *= @edgeMult for edge in @getNode 0, y
      edge.capacity *= @edgeMult for edge in @getNode @width - 1, y

      @setMultiSource @getNode(0, y)
      @setMultiSource @getNode(@width - 1, y)

    # Add interior sink nodes (X-shape that divides the image into four triangles, not including 1 pixel border)
    for i in [1...@width - 1]
      edge.capacity *= @edgeMult for edge in @getNode i, i
      edge.capacity *= @edgeMult for edge in @getNode i, @height - 1 - i

      @setMultiSink @getNode(i, i)
      @setMultiSink @getNode(i, @height - 1 - i)

    # if !@fullGraph
    #   for x in [1...@width - 1]
    #     edgeMult = @edgeMult
    #     # Top
    #     for y in [0...@height / 2]
    #       src = @nodes[x][y]
    #       src.addEdge @nodes[x][y - 1], edgeMult * @colorDifference x, y, x, y - 1 if y > 0
    #       src.addEdge @nodes[x][y + 1], edgeMult * @colorDifference x, y, x, y + 1
    #       src.addEdge @nodes[x - 1][y], edgeMult * @colorDifference x, y, x - 1, y
    #       src.addEdge @nodes[x + 1][y], edgeMult * @colorDifference x, y, x + 1, y
    #       
    #       edgeMult *= @edgeMultDecay
    #       edgeMult = 1 if edgeMult < 1
    #       
    #       break if @nodes[x][y + 1].multiSink
    # 
    #     edgeMult = @edgeMult
    # 
    #     # Bottom
    #     for y in [@height - 1...@height / 2]
    #       src = @nodes[x][y]
    #       src.addEdge @nodes[x][y + 1], edgeMult * @colorDifference x, y, x, y + 1 if y < @height - 1
    #       src.addEdge @nodes[x][y - 1], edgeMult * @colorDifference x, y, x, y - 1
    #       src.addEdge @nodes[x - 1][y], edgeMult * @colorDifference x, y, x - 1, y
    #       src.addEdge @nodes[x + 1][y], edgeMult * @colorDifference x, y, x + 1, y
    #       
    #       edgeMult *= @edgeMultDecay
    #       edgeMult = 1 if edgeMult < 1
    #       
    #       break if @nodes[x][y - 1].multiSink
    # 
    #   for y in [1...@height - 1]
    #     
    #     edgeMult = @edgeMult
    #     
    #     # Left
    #     for x in [0...@width / 2]
    #       src = @nodes[x][y]
    #       src.addEdge @nodes[x - 1][y], edgeMult * @colorDifference x, y, x - 1, y if x > 1
    #       src.addEdge @nodes[x + 1][y], edgeMult * @colorDifference x, y, x + 1, y
    #       src.addEdge @nodes[x][y - 1], edgeMult * @colorDifference x, y, x, y - 1
    #       src.addEdge @nodes[x][y + 1], edgeMult * @colorDifference x, y, x, y + 1
    #       
    #       edgeMult *= @edgeMultDecay
    #       edgeMult = 1 if edgeMult < 1
    #       
    #       break if @nodes[x + 1][y].multiSink
    # 
    #     edgeMult = @edgeMult
    # 
    #     # Right
    #     for x in [@width - 1...@width / 2]
    #       src = @nodes[x][y]
    #       src.addEdge @nodes[x - 1][y], edgeMult * @colorDifference x, y, x - 1, y
    #       src.addEdge @nodes[x + 1][y], edgeMult * @colorDifference x, y, x + 1, y if x < @width - 1
    #       src.addEdge @nodes[x][y - 1], edgeMult * @colorDifference x, y, x, y - 1
    #       src.addEdge @nodes[x][y + 1], edgeMult * @colorDifference x, y, x, y + 1
    #       
    #       edgeMult *= @edgeMultDecay
    #       edgeMult = 1 if edgeMult < 1
    #       
    #       break if @nodes[x - 1][y].multiSink

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