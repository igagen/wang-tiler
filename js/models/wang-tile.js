var WangTile = Backbone.Model.extend({
  initialize: function(diamondTileData, subSampleData) {
    this.imageGraph = new ImageGraph(diamondTileData, subSampleData);
    this.imageGraph.initWangTile();
    this.imageGraph.computeMaxFlow();
    debugger;

    this.diamondTileData = diamondTileData;
    this.subSampleData = subSampleData;
    this.wangTileData = subSampleData;
  },

  draw: function(context) {
    context.putImageData(this.wangTileData, 0, 0);
  }
});