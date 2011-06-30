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
          this.graph.partition();
          expect(this.graph.sourceNodes).toEqual([this.source]);
          return expect(this.graph.sinkNodes).toHaveSameElementsAs([this.a, this.b, this.sink]);
        });
      });
      return describe("internal methods", function() {
        return it("should perform correct intermediate calculations", function() {});
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
          return expect(maxFlow).toBe(23);
        });
      });
    });
  });
}).call(this);
