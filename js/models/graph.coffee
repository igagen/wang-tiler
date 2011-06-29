# Implementation of:
# 'An Experimental Comparison of Min-Cut / Max-Flow Algorithms for Energy Minimization in Vision'
# By Yuri Boykov and Vladimir Kolmogorov
# Described here: http://www.csd.uwo.ca/~yuri/Papers/pami04.pdf

class Node
  constructor: (@val, @terminal = false) ->
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

class Tree
  constructor: (@root) ->
    @root.tree = @

class Graph
  constructor: ->
    @nodes = {}
    @edges = {}
    @residualEdges = {}
    @numNodes = 0 # not include source and sink
    @source = @nodes["source"] = new Node "Source", true
    @sink = @nodes["sink"] = new Node "Sink", true
    @sourceTree = new Tree @source
    @sinkTree = new Tree @sink
    @active = [@source, @sink]
    @orphaned = []

  addNode: (node) ->
    node.id = @numNodes++
    @nodes[node.id] = node
    @edges[node.id] = {}
    @residualEdges[node.id] = {}
    node

  # addEdge: (p, q, capacity) ->
  #   edge = p.addEdge q, capacity
  #   edge = new Edge p, q, capacity
  #   residualEdge = new Edge p, q, capacity
  #   
  #   @edges[p][q] = edge
  #   @residualEdges[p][q] = residualEdge
  #   edge

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

      @validatePath path

      if path.length == 0 then break else @augment(path)
      @adopt()

    @partition()

    # Sum the flow going out of the source
    @maxFlow = 0
    @maxFlow += edge.flow for edge in @source.edges
    @maxFlow

  partition: ->
    @sourceNodes = []
    @sinkNodes = []

    for id, node of @nodes
      if node.tree == @sourceTree
        @sourceNodes.push(node)
      else
        @sinkNodes.push(node)

  getPath: (p, q) ->
    path = []
    if p.tree == @sourceTree
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
        if p.tree == @sourceTree && edge.src == p || p.tree == @sinkTree && edge.dest == p
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
          if edge.src.tree == @sourceTree
            @orphan edge.dest
          else if edge.src.tree == @sinkTree
            @orphan edge.src

  adopt: ->
    while @orphaned.length
      @process @orphaned.pop()

  attemptParent: (p, edge) ->
    q = if p == edge.src then edge.dest else edge.src
    return false if p.tree == @sourceTree && edge.dest == p
    return false if p.tree == @sinkTree && edge.src == p

    # throw new Error("attemptParent() with invalid edge") if p.tree == null || p.tree == @sourceTree && edge.src != p || p.tree == @sinkTree && edge.dest != p

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
  constructor: (@imageData1, @imageData2) ->
    if @imageData1.width != @imagedata2.width || @imageData1.height != @imageData2.height
      throw "Image dimensions don't match"

    @width = @rawImageData1.width
    @height = @rawImageData1.height

    # Convert to lab color
    @rawImageData1.toLab
    @rawImageData2.toLab

    # Initialize nodes
    @nodes = new Array @imageData1.width
    node = new Array @imageData1.height for node in @nodes
    for x in [0...@width]
      for y in [0...@height]
        node = @nodes[x][y] = new FlowNode { x: x, y: y }

        # Add this node as a neighbor of the node to the left and above
        @nodes[x - 1][y].addEdge(node, colorDifference(x - 1, y, x, y)) if x > 0
        @nodes[x][y - 1].addEdge(node, colorDifference(x, y - 1, x, y)) if y > 0

    @sink = new Node null, true
    @source = new Node null, true

  colorDifference: (sx, sy, tx, ty) ->
    s1 = @imageData1.color(sx, sy); s2 = @imageData2.color(sx, sy)
    t1 = @imageData1.color(tx, ty); t2 = @imageData2.color(tx, ty)

    ImageData.colorDifference(s1, s2) + ImageData.colorDifference(t1, t2)

  getNode: (x, y) ->
    @nodes[x][y]

  initWangTile: ->
    # Adds source and sink nodes as appropriate for solving the min-cut for a strict Wang-tile
    # Source nodes around the borders, and sink nodes diagonally crossing thru

    if @width != @height || @width % 2 != 0
      throw "Wang tiles must be square with even width and height"

    # Add border source nodes
    for x in [0..@width]
      @source.addEdge @nodes[x][0], Infinity # Top
      @source.addEdge @nodes[x][@height - 1], Infinity # Bottom

    for y in [0..@height]
      @source.addEdge @nodes[0][y], Infinity # Left
      @source.addEdge @nodes[@width - 1][y], Infinity # Right

    # Add interior sink nodes (X-shape that divides the image into four triangles, not including 1 pixel border)
    for i in [0..@width]
      @nodes[i][i].addEdge @sink, Infinity
      @nodes[i][@height - 2 - i].addEdge @sink, Infinity

# Exports
window.Node = Node
window.Edge = Edge
window.Tree = Tree
window.Graph = Graph
window.ImageGraph = Graph