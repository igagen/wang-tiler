# Implementation of:
# 'An Experimental Comparison of Min-Cut / Max-Flow Algorithms for Energy Minimization in Vision'
# By Yuri Boykov and Vladimir Kolmogorov
# Described here: http://www.csd.uwo.ca/~yuri/Papers/pami04.pdf

class Node
  constructor: (@val) ->
    @parent = null
    @parentEdge = null
    @tree = null
    @edges = []

  addEdge: (node, capacity) ->
    edge = new Edge @, node, capacity
    @edges.push edge
    node.edges.push edge
    edge

class Edge
  constructor: (@src, @dest, @capacity) -> @flow = 0
  residualCapacity: -> @capacity - @flow
  saturated: -> @flow == @capacity

class Graph
  constructor: ->
    @nodes = []
    @source = @addNode(new Node("source"))
    @sink = @addNode(new Node("sink"))
    @source.tree = "source"
    @sink.tree = "sink"
    @active = [@source, @sink]
    @orphaned = []

  # TODO: Store nodes and edges in an associative array by node id to remove circular references
  addNode: (node) ->
    @nodes.push(node)
    node

  setParent: (node, parent, edge) ->
    throw new Error("Can't set parent to a node with no tree") if parent.tree == null

    if parent.tree == "source" && (edge.src != parent || edge.dest != node)
      throw new Error "Invalid edge"

    if parent.tree == "sink" && (edge.dest != parent || edge.src != node)
      throw new Error "Invalid edge"

    node.parent = parent
    node.parentEdge = edge
    node.tree = parent.tree

  orphan: (node) ->
    # Removes the parent connection, but does not remove the node from its tree
    node.parentEdge = null
    node.parent = null
    @orphaned.push(node) if @orphaned.indexOf(node) == -1

  validatePath: (path) ->
    return if path.length == 0

    if path[0].src != @source
      throw new Error("Path must start at source")

    if path[path.length - 1].dest != @sink
      throw new Error("Path must start at sink")

    for i in [0...path.length - 1]
      if path[i].dest != path[i + 1].src
        throw new Error("Interior path edges must match")

  printEdge: (edge) ->
    s = edge.src.val
    d = edge.dest.val
    console.debug "#{if s.x != undefined then "(#{s.x}, #{s.y}) - " else "(#{s}) - "} #{if d.x != undefined then "(#{d.x}, #{d.y}): " else "(#{d}): "} #{edge.flow} / #{edge.capacity}"

  printPath: (path) ->
    console.debug "-------- Path -------"
    @printEdge(edge) for edge in path

  sourceFlow: ->
    sourceFlow = 0
    sourceFlow += edge.flow for edge in @source.edges
    sourceFlow

  sinkFlow: ->
    sinkFlow = 0
    sinkFlow += edge.flow for edge in @source.edges
    sinkFlow

  validateFlow: ->
    if @sourceFlow() != @sinkFlow()
      throw new Error "Source and sink flows don't match"

  computeMaxFlow: ->
    while true
      path = @grow()

      if path.length == 0 then break else @augment(path)

      # @printPath(path)
      @validateFlow()

      @adopt()

    @validateFlow()
    @maxFlow = @sourceFlow()

  partition: ->
    @sourceNodes = []
    @sinkNodes = []

    for node in @nodes
      if node.tree == "source"
        @sourceNodes.push(node)
      else
        @sinkNodes.push(node)

  getPath: (p, q) ->
    path = []
    if p.tree == "source"
      sourceNode = p; sinkNode = q;
    else
      sourceNode = q; sinkNode = p;

    # Add the connecting edge between the source and sink tree frontiers
    for edge in sourceNode.edges
      if edge.dest == sinkNode
        path.push edge
        break

    while sourceNode.parent
      path.unshift sourceNode.parentEdge
      sourceNode = sourceNode.parent

    while sinkNode.parent
      path.push sinkNode.parentEdge
      sinkNode = sinkNode.parent

    @validatePath path

    path

  grow: ->
    while @active.length
      p = @active[0]
      q = null

      for edge in p.edges when edge.residualCapacity() > 0
        if p.tree == "source" && edge.src == p || p.tree == "sink" && edge.dest == p
          q = (if edge.src == p then edge.dest else edge.src)
          if q.tree == null
            @setParent q, p, edge
            @addActive q
          else if q.tree != p.tree
            return @getPath p, q

      @active.shift()

    []

  augment: (path) ->
    minCapacity = Infinity
    for edge in path when edge.residualCapacity() < minCapacity
      minCapacity = edge.residualCapacity()

    for edge in path
      edge.flow += minCapacity
      if edge.saturated
        if edge.src.tree == edge.dest.tree
          if edge.src.tree == "source"
            @orphan edge.dest
          else if edge.src.tree == "sink"
            @orphan edge.src

  adopt: ->
    while @orphaned.length
      @process @orphaned.pop()

  attemptParent: (p, edge) ->
    return false if p.tree == "source" && edge.src == p || p.tree == "sink" && edge.dest == p

    q = (if p == edge.src then edge.dest else edge.src)

    # throw new Error("attemptParent() with invalid edge") if p.tree == null || p.tree == "source" && edge.src != p || p.tree == "sink" && edge.dest != p

    # Returns true and sets parent if q is a valid parent of p
    # This means q is in the same tree as p, and q is rooted at the source or sink

    if p.tree == q.tree && edge.residualCapacity() > 0
      # verify that q is rooted at a terminal node, not detached
      n = q
      while n.parent
        if n.parent == @source || n.parent == @sink
          @setParent p, q, edge # Valid parent found, set it and return true
          return true

        n = n.parent

    false

  addActive: (p) ->
    @active.push p if @active.indexOf(p) == -1

  process: (p) ->
    for edge in p.edges
      if p.tree == "source" && edge.dest == p || p.tree == "sink" && edge.src == p
        
        return if @attemptParent p, edge # Return if we found a valid parent

    for edge in p.edges
      q = if p == edge.src then edge.dest else edge.src

      if p.tree == q.tree
        @addActive(q) if edge.residualCapacity() > 0
        @orphan(q) if q.parent == p

    p.tree = null
    @active.splice(@active.indexOf(p), 1)

# Flow network representation of an image difference where each node is a pixel.
# Each edge represents the pixel color difference between images.
# A min-cut of the flow network can be used to graft the two images while
# minimizing the appearance of seams.
class ImageGraph extends Graph
  constructor: (imageData1, imageData2) ->
    if imageData1.width != imageData2.width || imageData1.height != imageData2.height
      throw "Image dimensions don't match"

    @imageData1 = new PixelData imageData1
    @imageData2 = new PixelData imageData2

    @width = @imageData1.width
    @height = @imageData1.height

    @source = new Node "source"
    @sink = new Node "sink"
    @source.tree = "source"
    @sink.tree = "sink"
    @active = [@source, @sink]
    @orphaned = []

    # Initialize nodes
    @nodes = new Array @imageData1.width
    for x in [0...@width]
      @nodes[x] = new new Array @imageData1.height
      for y in [0...@height]
        node = @nodes[x][y] = new Node { x: x, y: y }

        if x > 0 # Left
          leftNode = @nodes[x - 1][y]
          leftColorDiff = @colorDifference x - 1, y, x, y
          node.addEdge leftNode, leftColorDiff
          leftNode.addEdge node, leftColorDiff

        if y > 0 # Top
          topNode = @nodes[x][y - 1]
          topColorDiff = @colorDifference x, y - 1, x, y
          node.addEdge topNode, topColorDiff
          topNode.addEdge node, topColorDiff

  partition: ->
    @sourceNodes = []
    @sinkNodes = []

    for x in [0...@width]
      for y in [0...@height]
        node = @nodes[x][y]
        if node.tree == "source"
          @sourceNodes.push(node)
        else if node.tree == "sink"
          @sinkNodes.push(node)
        else
          @sourceNodes.push(node)
          # console.debug "ERROR: (" + x + ", " + y + ") not in source or sink"
          # throw new Error "All nodes should be in the source or sink"

  colorDifference: (sx, sy, tx, ty) ->
    s1 = @imageData1.labColor(sx, sy); s2 = @imageData2.labColor(sx, sy)
    t1 = @imageData1.labColor(tx, ty); t2 = @imageData2.labColor(tx, ty)

    @imageData1.colorDifference(s1, s2) + @imageData1.colorDifference(t1, t2)

  getNode: (x, y) ->
    @nodes[x][y]

  initWangTile: ->
    # Adds source and sink nodes as appropriate for solving the min-cut for a strict Wang-tile
    # Source nodes around the borders, and sink nodes diagonally crossing thru

    if @width != @height || @width % 2 != 0
      throw "Wang tiles must be square with even width and height"

    # Add border source nodes
    for x in [0...@width]
      @source.addEdge @nodes[x][0], Infinity # Top
      @source.addEdge @nodes[x][@height - 1], Infinity # Bottom

    for y in [0...@height]
      @source.addEdge @nodes[0][y], Infinity # Left
      @source.addEdge @nodes[@width - 1][y], Infinity # Right

    # Add interior sink nodes (X-shape that divides the image into four triangles, not including 1 pixel border)
    for i in [1...@width - 1]
      @nodes[i][i].addEdge @sink, Infinity
      @nodes[i][@height - 1 - i].addEdge @sink, Infinity

  computeGraft: ->
    @computeMaxFlow()
    @partition()

  drawPath: (context) ->
    rawImageData = context.createImageData @width, @height
    imageData = new PixelData rawImageData

    for node in @sourceNodes
      x = node.val.x
      y = node.val.y
      imageData.setColor x, y, [0, 0, 0, 255]

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