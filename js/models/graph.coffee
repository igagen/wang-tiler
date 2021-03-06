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


# Exports
window.Node = Node
window.Edge = Edge
window.Graph = Graph