(function() {
  describe("Graph", function() {
    describe("Simple flow network", function() {
      beforeEach(function() {
        this.graph = new Graph;
        this.source = this.graph.source;
        this.sink = this.graph.sink;
        this.active = this.graph.active;
        this.orphaned = this.graph.orphaned;
        this.a = this.graph.addNode("A");
        this.b = this.graph.addNode("B");
        this.sourceToA = this.graph.addEdge(this.source, this.a, 4);
        this.sourceToB = this.graph.addEdge(this.source, this.b, 3);
        this.aToB = this.graph.addEdge(this.a, this.b, 3);
        this.aToSink = this.graph.addEdge(this.a, this.sink, 4);
        return this.bToSink = this.graph.addEdge(this.b, this.sink, 5);
      });
      describe("maxFlow", function() {
        it("should determine the correct max flow", function() {
          this.graph.solve();
          return expect(this.graph.maxFlow()).toBe(7);
        });
        return it("should correctly partition the nodes along the min-cut", function() {
          var partition;
          this.graph.solve();
          partition = this.graph.partition();
          expect(partition[0]).toEqual([this.source]);
          return expect(partition[1]).toHaveSameElementsAs([this.a, this.b, this.sink]);
        });
      });
      return describe("internal methods", function() {
        return it("should perform correct intermediate calculations", function() {
          var path;
          path = this.graph.grow();
          expect(path).toEqual([this.source, this.a, this.sink]);
          expect(this.active).toEqual([this.sink, this.a, this.b]);
          expect(this.sourceToA.flow).toBe(0);
          expect(this.aToSink.flow).toBe(0);
          this.graph.augment(path);
          expect(this.a.tree).toBe("source");
          expect(this.b.tree).toBe("source");
          expect(this.a.parentId).toBe(null);
          expect(this.sourceToA.flow).toBe(4);
          expect(this.aToSink.flow).toBe(4);
          expect(this.orphaned).toEqual([this.a]);
          this.graph.adopt();
          expect(this.active).toEqual([this.sink, this.b]);
          expect(this.orphaned.length).toBe(0);
          expect(this.a.parentId).toBeNull();
          expect(this.b.parentId).toBe(this.source.id);
          path = this.graph.grow();
          expect(this.active).toEqual([this.sink, this.b]);
          expect(path).toEqual([this.source, this.b, this.sink]);
          expect(this.sourceToB.flow).toBe(0);
          expect(this.bToSink.flow).toBe(0);
          this.graph.augment(path);
          expect(this.sourceToB.flow).toBe(3);
          expect(this.bToSink.flow).toBe(3);
          expect(this.b.parentId).toBeNull();
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
          expect(this.a.parentId).toBe(this.b.id);
          expect(this.b.parentId).toBe(this.sink.id);
          expect(this.sourceToA.flow).toBe(4);
          expect(this.sourceToB.flow).toBe(3);
          expect(this.aToB.flow).toBe(0);
          expect(this.aToSink.flow).toBe(4);
          return expect(this.bToSink.flow).toBe(3);
        });
      });
    });
    describe("Complex flow network", function() {
      beforeEach(function() {
        this.graph = new Graph;
        this.source = this.graph.source;
        this.sink = this.graph.sink;
        this.active = this.graph.active;
        this.orphaned = this.graph.orphaned;
        this.a = this.graph.addNode("A");
        this.b = this.graph.addNode("B");
        this.c = this.graph.addNode("C");
        this.d = this.graph.addNode("D");
        this.sourceToA = this.graph.addEdge(this.source, this.a, 16);
        this.sourceToB = this.graph.addEdge(this.source, this.b, 13);
        this.aToB = this.graph.addEdge(this.a, this.b, 10);
        this.bToA = this.graph.addEdge(this.b, this.a, 4);
        this.aToC = this.graph.addEdge(this.a, this.c, 12);
        this.bToD = this.graph.addEdge(this.b, this.d, 14);
        this.cToB = this.graph.addEdge(this.c, this.b, 9);
        this.dToC = this.graph.addEdge(this.d, this.c, 7);
        this.cToSink = this.graph.addEdge(this.c, this.sink, 20);
        return this.dToSink = this.graph.addEdge(this.d, this.sink, 4);
      });
      return describe("maxFlow", function() {
        return it("should determine the correct max flow", function() {
          this.graph.solve();
          return expect(this.graph.maxFlow()).toBe(23);
        });
      });
    });
    return describe("addFlow", function() {
      beforeEach(function() {
        this.graph = new Graph;
        this.a = this.graph.addNode("A");
        return this.b = this.graph.addNode("B");
      });
      describe("when only the given edge is present in the graph", function() {
        beforeEach(function() {
          return this.aToB = this.graph.addEdge(this.a, this.b, 10);
        });
        it("should update the given edge's flow correctly", function() {
          this.graph.addFlow(this.a, this.b, 6);
          return expect(this.aToB.flow).toBe(6);
        });
        return it("should update residual capacities correctly", function() {
          this.graph.addFlow(this.a, this.b, 6);
          expect(this.graph.residualCapacity(this.a, this.b)).toBe(4);
          return expect(this.graph.residualCapacity(this.b, this.a)).toBe(6);
        });
      });
      describe("when only the reverse edge is present in the graph", function() {
        beforeEach(function() {
          this.bToA = this.graph.addEdge(this.b, this.a, 4);
          this.graph.addFlow(this.b, this.a, 4);
          return expect(this.bToA.flow).toBe(4);
        });
        return it("should update reverse edge's flow correctly", function() {
          this.graph.addFlow(this.a, this.b, 4);
          return expect(this.bToA.flow).toBe(0);
        });
      });
      return describe("when the given edge and the reverse edge are present in the graph", function() {
        beforeEach(function() {
          this.aToB = this.graph.addEdge(this.a, this.b, 10);
          this.bToA = this.graph.addEdge(this.b, this.a, 4);
          this.graph.addFlow(this.b, this.a, 4);
          expect(this.graph.residualCapacity(this.a, this.b)).toBe(14);
          expect(this.graph.residualCapacity(this.b, this.a)).toBe(0);
          expect(this.aToB.flow).toBe(0);
          return expect(this.bToA.flow).toBe(4);
        });
        return it("updates both edges as appropriate", function() {
          this.graph.addFlow(this.a, this.b, 14);
          expect(this.graph.residualCapacity(this.a, this.b)).toBe(0);
          expect(this.graph.residualCapacity(this.b, this.a)).toBe(14);
          expect(this.aToB.flow).toBe(10);
          return expect(this.bToA.flow).toBe(0);
        });
      });
    });
  });
}).call(this);
