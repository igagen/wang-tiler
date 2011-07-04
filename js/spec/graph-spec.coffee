describe "Graph", ->
  describe "Simple flow network", ->
    beforeEach ->
      @graph = new Graph
      @source = @graph.source
      @sink = @graph.sink
      @active = @graph.active
      @orphaned = @graph.orphaned

      # Add nodes
      @a = @graph.addNode "A"
      @b = @graph.addNode "B"

      # Add edges
      @sourceToA = @graph.addEdge @source, @a, 4
      @sourceToB = @graph.addEdge @source, @b, 3
      @aToB = @graph.addEdge @a, @b, 3
      @aToSink = @graph.addEdge @a, @sink, 4
      @bToSink = @graph.addEdge @b, @sink, 5

    describe "@maxFlow", ->
      it "should determine the correct max flow", ->
        @graph.solve()
        expect(@graph.maxFlow()).toBe 7

      it "should correctly partition the nodes along the min-cut", ->
        @graph.solve()
        partition = @graph.partition()
        expect(partition[0]).toEqual [@source]
        expect(partition[1]).toHaveSameElementsAs [@a, @b, @sink]

    describe "internal methods", ->
      it "should perform correct intermediate calculations", ->
        # This is a 'white box' test that ensures the internals
        # of the algorithm behave as expected at each step

        # Grow
        path = @graph.grow()

        expect(path).toEqual [@source, @a, @sink]
        expect(@active).toEqual [@sink, @a, @b]

        # Augment
        expect(@sourceToA.flow).toBe 0
        expect(@aToSink.flow).toBe 0

        @graph.augment path

        expect(@a.tree).toBe "source"
        expect(@b.tree).toBe "source"
        expect(@a.parentId).toBe null
        expect(@sourceToA.flow).toBe 4
        expect(@aToSink.flow).toBe 4
        expect(@orphaned).toEqual [@a]

        # Adopt
        @graph.adopt()

        expect(@active).toEqual [@sink, @b]
        expect(@orphaned.length).toBe 0
        expect(@a.parentId).toBeNull()
        expect(@b.parentId).toBe @source.id

        # Grow
        path = @graph.grow()

        expect(@active).toEqual [@sink, @b]
        expect(path).toEqual [@source, @b, @sink]

        # # Augment
        expect(@sourceToB.flow).toBe 0
        expect(@bToSink.flow).toBe 0

        @graph.augment path

        expect(@sourceToB.flow).toBe 3
        expect(@bToSink.flow).toBe 3
        expect(@b.parentId).toBeNull()
        expect(@orphaned).toEqual [@b]

        # Adopt
        @graph.adopt()

        expect(@orphaned.length).toBe 0
        expect(@active).toEqual [@sink]
        expect(@a.tree).toBeNull()
        expect(@b.tree).toBeNull()

        # Grow
        path = @graph.grow()

        expect(path.length).toBe 0
        expect(@active.length).toBe 0
        expect(@orphaned.length).toBe 0
        expect(@a.parentId).toBe @b.id
        expect(@b.parentId).toBe @sink.id

        expect(@sourceToA.flow).toBe 4
        expect(@sourceToB.flow).toBe 3
        expect(@aToB.flow).toBe 0
        expect(@aToSink.flow).toBe 4
        expect(@bToSink.flow).toBe 3

  describe "Complex flow network", ->
    beforeEach ->
      @graph = new Graph
      @source = @graph.source
      @sink = @graph.sink
      @active = @graph.active
      @orphaned = @graph.orphaned

      # Add nodes
      @a = @graph.addNode "A"
      @b = @graph.addNode "B"
      @c = @graph.addNode "C"
      @d = @graph.addNode "D"

      # Add edges
      @sourceToA = @graph.addEdge @source, @a, 16
      @sourceToB = @graph.addEdge @source, @b, 13
      @aToB = @graph.addEdge @a, @b, 10
      @bToA = @graph.addEdge @b, @a, 4
      @aToC = @graph.addEdge @a, @c, 12
      @bToD = @graph.addEdge @b, @d, 14
      @cToB = @graph.addEdge @c, @b, 9
      @dToC = @graph.addEdge @d, @c, 7
      @cToSink = @graph.addEdge @c, @sink, 20
      @dToSink = @graph.addEdge @d, @sink, 4

    describe "@maxFlow", ->
      it "should determine the correct max flow", ->
        @graph.solve()
        expect(@graph.maxFlow()).toBe 23

  describe "@addFlow", ->
    beforeEach ->
      @graph = new Graph
      @a = @graph.addNode "A"
      @b = @graph.addNode "B"

    describe "when only the given edge is present in the graph", ->
      beforeEach -> @aToB = @graph.addEdge @a, @b, 10

      it "should update the given edge's flow correctly", ->
        @graph.addFlow @a, @b, 6
        expect(@aToB.flow).toBe 6

      it "should update residual capacities correctly", ->
        @graph.addFlow @a, @b, 6
        expect(@graph.residualCapacity @a, @b).toBe 4
        expect(@graph.residualCapacity @b, @a).toBe 6

    describe "when only the reverse edge is present in the graph", ->
      beforeEach ->
        @bToA = @graph.addEdge @b, @a, 4
        @graph.addFlow @b, @a, 4
        expect(@bToA.flow).toBe 4

      it "should update reverse edge's flow correctly", ->
        @graph.addFlow @a, @b, 4
        expect(@bToA.flow).toBe 0

    describe "when the given edge and the reverse edge are present in the graph", ->
      beforeEach ->

        @aToB = @graph.addEdge @a, @b, 10
        @bToA = @graph.addEdge @b, @a, 4
        @graph.addFlow @b, @a, 4

        expect(@graph.residualCapacity @a, @b).toBe 14
        expect(@graph.residualCapacity @b, @a).toBe 0
        expect(@aToB.flow).toBe 0
        expect(@bToA.flow).toBe 4

      it "updates both edges as appropriate", ->
        @graph.addFlow @a, @b, 14

        expect(@graph.residualCapacity @a, @b).toBe 0
        expect(@graph.residualCapacity @b, @a).toBe 14
        expect(@aToB.flow).toBe 10
        expect(@bToA.flow).toBe 0

  describe "@terminalDistance", ->
    beforeEach ->
      @graph = new WangTile { width: 0, height: 0 }, { width: 0, height: 0 }
      @graph.width = 16
      @graph.height = 16

    describe "when the node is a source node", ->
      it "returns zero", ->
        expect(@graph.terminalDistance(0, 0)).toBe 0
        expect(@graph.terminalDistance(4, 0)).toBe 0
        expect(@graph.terminalDistance(0, 4)).toBe 0
        expect(@graph.terminalDistance(0, 4)).toBe 0

    describe "when the node is a sink node", ->
      it "returns zero", ->
        expect(@graph.terminalDistance(5, 5)).toBe 0
        expect(@graph.terminalDistance(1, 14)).toBe 0

    describe "when the node is not a source or sink", ->
      it "returns the distance to the nearest source or sink", ->
        expect(@graph.terminalDistance(1, 3)).toBe 1
        expect(@graph.terminalDistance(2, 4)).toBe 2
        expect(@graph.terminalDistance(5, 3)).toBe 2
        expect(@graph.terminalDistance(9, 3)).toBe 3
        expect(@graph.terminalDistance(12, 5)).toBe 2
        expect(@graph.terminalDistance(9, 12)).toBe 3
        expect(@graph.terminalDistance(12, 11)).toBe 1
        expect(@graph.terminalDistance(8, 14)).toBe 1
        expect(@graph.terminalDistance(3, 11)).toBe 1
        expect(@graph.terminalDistance(1, 7)).toBe 1