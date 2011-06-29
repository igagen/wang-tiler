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
    node.parent = parent
    node.parentEdge = edge
    node.tree = parent.tree

  orphan: (node) ->
    # Removes the parent connection, but does not remove the node from its tree
    node.parentEdge = null
    node.parent = null
    @orphaned.push(node) if @orphaned.indexOf(node) == -1

  setMultiSource: (node) ->
    @source.addEdge node, Infinity

  setMultiSink: (node) ->
    node.addEdge @sink, Infinity

  validatePath: (path) ->
    return if path.length == 0

    if path[0].src != @source
      throw new Error("Path must start at source")

    if path[path.length - 1].dest != @sink
      throw new Error("Path must start at sink")

    for i in [0...path.length - 1]
      if path[i].dest != path[i + 1].src
        throw new Error("Interior path edges must match")

  computeMaxFlow: ->
    while true
      path = @grow()

      # @validatePath path

      if path.length == 0 then break else @augment(path)
      @adopt()

    # Sum the flow going out of the source
    @maxFlow = 0
    @maxFlow += edge.flow for edge in @source.edges
    @maxFlow

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
    q = if p == edge.src then edge.dest else edge.src
    return false if p.tree == "source" && edge.dest == p
    return false if p.tree == "sink" && edge.src == p

    # throw new Error("attemptParent() with invalid edge") if p.tree == null || p.tree == "source" && edge.src != p || p.tree == "sink" && edge.dest != p

    # Returns true and sets parent if q is a valid parent of p
    # This means q is in the same tree as p, and q is rooted at the source or sink

    if p.tree == q.tree && edge.residualCapacity() > 0
      # verify that q is rooted at a terminal node, not detached
      while q.parent
        if q.parent == @source || q.parent == @sink
          @setParent p, q, edge # Valid parent found, set it and return true
          return true

        q = q.parent

    false

  addActive: (p) ->
    @active.push p if @active.indexOf(p) == -1

  process: (p) ->
    for edge in p.edges
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
          leftColorDiff = @colorDifference x, y, x - 1, y
          node.addEdge leftNode, leftColorDiff
          leftNode.addEdge node, leftColorDiff

        if y > 0 # Top
          topNode = @nodes[x][y - 1]
          topColorDiff = @colorDifference x, y, x, y - 1
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
        else
          @sinkNodes.push(node)

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
      debugger
      @nodes[i][i].addEdge @sink, Infinity
      @nodes[i][@height - 2 - i].addEdge @sink, Infinity

# Exports
window.Node = Node
window.Edge = Edge
window.Graph = Graph
window.ImageGraph = ImageGraph