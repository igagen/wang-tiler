(function() {
  describe("Graph", function() {
    describe("Simple flow network", function() {
      beforeEach(function() {
        this.graph = new Graph;
        this.source = this.graph.source;
        this.sink = this.graph.sink;
        this.active = this.graph.active;
        this.orphaned = this.graph.orphaned;
        this.a = new Node("A");
        this.b = new Node("B");
        this.graph.addNode(this.a);
        this.graph.addNode(this.b);
        this.source.source = true;
        this.sink.sink = true;
        this.graph.sourceTree.sourceTree = true;
        this.graph.sinkTree.sinkTree = true;
        this.sourceToA = this.source.addEdge(this.a, 4);
        this.sourceToB = this.source.addEdge(this.b, 3);
        this.aToB = this.a.addEdge(this.b, 3);
        this.aToSink = this.a.addEdge(this.sink, 4);
        return this.bToSink = this.b.addEdge(this.sink, 5);
      });
      describe("maxFlow", function() {
        it("should determine the correct max flow", function() {
          var maxFlow;
          maxFlow = this.graph.computeMaxFlow();
          return expect(maxFlow).toBe(7);
        });
        return it("should correctly partition the nodes along the min-cut", function() {
          var maxFlow;
          maxFlow = this.graph.computeMaxFlow();
          expect(this.graph.sourceNodes).toEqual([this.source]);
          return expect(this.graph.sinkNodes).toHaveSameElementsAs([this.a, this.b, this.sink]);
        });
      });
      return describe("internal methods", function() {
        return it("should perform correct intermediate calculations", function() {
          var path;
          path = this.graph.grow();
          expect(path).toEqual([this.sourceToA, this.aToSink]);
          expect(this.active).toEqual([this.sink, this.a, this.b]);
          expect(path[0].flow).toBe(0);
          expect(path[1].flow).toBe(0);
          this.graph.augment(path);
          expect(this.a.tree && this.a.tree.sourceTree).toBe(true);
          expect(this.b.tree && this.b.tree.sourceTree).toBe(true);
          expect(this.a.parent === null && this.a.parentEdge === null).toBe(true);
          expect(path[0].flow).toBe(4);
          expect(path[1].flow).toBe(4);
          expect(this.orphaned).toEqual([this.a]);
          this.graph.adopt();
          expect(this.active).toEqual([this.sink, this.a, this.b]);
          expect(this.orphaned.length).toBe(0);
          expect(this.a.parent).toBe(this.b);
          expect(this.b.parent).toBe(this.source);
          path = this.graph.grow();
          expect(this.active).toEqual([this.sink, this.a, this.b]);
          expect(path).toEqual([this.sourceToB, this.bToSink]);
          expect(path[0].flow).toBe(0);
          expect(path[1].flow).toBe(0);
          this.graph.augment(path);
          expect(path[0].flow === 3 && path[1].flow === 3).toBe(true);
          expect(this.b.parent).toBeNull();
          expect(this.orphaned).toEqual([this.b]);
          this.graph.adopt();
          expect(this.orphaned.length).toBe(0);
          expect(this.active).toEqual([this.sink]);
          expect(this.a.tree).toBeNull();
          expect(this.b.tree).toBeNull();
          path = this.graph.grow();
          expect(path.length).toBe(0);
          expect(this.active.length).toBe(0);
          expect(this.orphaned.length).toBe(0);
          expect(this.a.parent).toBe(this.b);
          expect(this.b.parent).toBe(this.sink);
          expect(this.sourceToA.flow).toBe(4);
          expect(this.sourceToB.flow).toBe(3);
          expect(this.aToB.flow).toBe(0);
          expect(this.aToSink.flow).toBe(4);
          return expect(this.bToSink.flow).toBe(3);
        });
      });
    });
    return describe("Complex flow network", function() {
      beforeEach(function() {
        this.graph = new Graph;
        this.source = this.graph.source;
        this.sink = this.graph.sink;
        this.active = this.graph.active;
        this.orphaned = this.graph.orphaned;
        this.source.source = true;
        this.sink.sink = true;
        this.graph.sourceTree.sourceTree = true;
        this.graph.sinkTree.sinkTree = true;
        this.a = this.graph.addNode(new Node("A"));
        this.b = this.graph.addNode(new Node("B"));
        this.c = this.graph.addNode(new Node("C"));
        this.d = this.graph.addNode(new Node("D"));
        this.sourceToA = this.source.addEdge(this.a, 16);
        this.sourceToB = this.source.addEdge(this.b, 13);
        this.aToB = this.a.addEdge(this.b, 10);
        this.bToA = this.b.addEdge(this.a, 4);
        this.aToC = this.a.addEdge(this.c, 12);
        this.bToD = this.b.addEdge(this.d, 14);
        this.cToB = this.c.addEdge(this.b, 9);
        this.dToC = this.d.addEdge(this.c, 7);
        this.cToSink = this.c.addEdge(this.sink, 20);
        return this.dToSink = this.d.addEdge(this.sink, 4);
      });
      return describe("maxFlow", function() {
        return it("should determine the correct max flow", function() {
          var maxFlow;
          maxFlow = this.graph.computeMaxFlow();
          expect(maxFlow).toBe(23);
          console.debug(this.graph.sourceNodes);
          return console.debug(this.graph.sinkNodes);
        });
      });
    });
  });
}).call(this);
