describe "Graph", ->
  describe "Simple flow network", ->
    beforeEach ->
      @graph = new Graph
      @source = @graph.source
      @sink = @graph.sink
      @active = @graph.active
      @orphaned = @graph.orphaned

      @a = new Node "A"
      @b = new Node "B"

      # Add nodes
      @graph.addNode @a
      @graph.addNode @b

      # Add flags for checking state during the algorithm
      @source.source = true
      @sink.sink = true

      # Add edges
      @sourceToA = @source.addEdge @a, 4
      @sourceToB = @source.addEdge @b, 3
      @aToB = @a.addEdge @b, 3
      @aToSink = @a.addEdge @sink, 4
      @bToSink = @b.addEdge @sink, 5

    describe "maxFlow", ->
      it "should determine the correct max flow", ->
        maxFlow = @graph.computeMaxFlow()
        expect(maxFlow).toBe 7
    
      it "should correctly partition the nodes along the min-cut", ->
        maxFlow = @graph.computeMaxFlow()
        expect(@graph.sourceNodes).toEqual [@source]
        expect(@graph.sinkNodes).toHaveSameElementsAs [@a, @b, @sink]

    describe "internal methods", ->
      it "should perform correct intermediate calculations", ->
        # This is a 'white box' test that ensures the internals
        # of the algorithm behave as expected at each step

        # Grow
        path = @graph.grow()

        expect(path).toEqual [@sourceToA, @aToSink]
        expect(@active).toEqual [@sink, @a, @b]

        # Augment
        expect(path[0].flow).toBe 0
        expect(path[1].flow).toBe 0

        @graph.augment path

        expect(@a.tree).toBe "source"
        expect(@b.tree).toBe "source"
        expect(@a.parent == null && @a.parentEdge == null).toBe true
        expect(path[0].flow).toBe 4
        expect(path[1].flow).toBe 4
        expect(@orphaned).toEqual [@a]

        # Adopt
        @graph.adopt()

        expect(@active).toEqual [@sink, @a, @b]
        expect(@orphaned.length).toBe 0
        expect(@a.parent).toBe @b
        expect(@b.parent).toBe @source

        # Grow
        path = @graph.grow()

        expect(@active).toEqual [@sink, @a, @b]
        expect(path).toEqual [@sourceToB, @bToSink]

        # Augment
        expect(path[0].flow).toBe 0
        expect(path[1].flow).toBe 0

        @graph.augment path

        expect(path[0].flow == 3 && path[1].flow == 3).toBe true
        expect(@b.parent).toBeNull()
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
        expect(@a.parent).toBe @b
        expect(@b.parent).toBe @sink

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

      # Add flags for checking state during the algorithm
      @source.source = true
      @sink.sink = true

      # Add nodes
      @a = @graph.addNode(new Node "A")
      @b = @graph.addNode(new Node "B")
      @c = @graph.addNode(new Node "C")
      @d = @graph.addNode(new Node "D")

      # Add edges
      @sourceToA = @source.addEdge @a, 16
      @sourceToB = @source.addEdge @b, 13
      @aToB = @a.addEdge @b, 10
      @bToA = @b.addEdge @a, 4
      @aToC = @a.addEdge @c, 12
      @bToD = @b.addEdge @d, 14
      @cToB = @c.addEdge @b, 9
      @dToC = @d.addEdge @c, 7
      @cToSink = @c.addEdge @sink, 20
      @dToSink = @d.addEdge @sink, 4

    describe "maxFlow", ->
      it "should determine the correct max flow", ->
        maxFlow = @graph.computeMaxFlow()
        expect(maxFlow).toBe 23
