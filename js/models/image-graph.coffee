# Flow network representation of an image difference where each node is a pixel.
# Each edge represents the pixel color difference between images.
# A min-cut of the flow network can be used to graft the two images while
# minimizing the appearance of seams.
class ImageGraph extends Graph
  constructor: (imageData1, imageData2, weightData = null) ->
    super()

    if imageData1.width != imageData2.width || imageData1.height != imageData2.height
      throw "Image dimensions don't match"

    @imageData1 = new PixelData imageData1
    @imageData2 = new PixelData imageData2

    @width = @imageData1.width
    @height = @imageData1.height

    # Initialize nodes
    for y in [0...@height]
      for x in [0...@width]
        node = @addNode { x: x, y: y }

  getNode: (x, y) ->
    @nodes[y * @height + x]

  getEdge: (p, q) ->
    @edges[p.id][q.id]

  colorDifference: (sx, sy, tx, ty) ->
    s1 = @imageData1.labColor(sx, sy); s2 = @imageData2.labColor(sx, sy)
    t1 = @imageData1.labColor(tx, ty); t2 = @imageData2.labColor(tx, ty)

    ImageUtil.colorDifference(s1, s2) + ImageUtil.colorDifference(t1, t2)

  isTerminal: (p) ->
    p == @source || p == @sink

  computeGraft: ->
    @solve()
    @partition()

  weight: (sx, sy, tx, ty) ->
    if @weightData
      sw = @weightData.color(sx, sy)[0] / 255
      return 0.1 + sw

    s1 = @imageData1.labColor(sx, sy); s2 = @imageData2.labColor(sx, sy)
    t1 = @imageData1.labColor(tx, ty); t2 = @imageData2.labColor(tx, ty)

    diff = ImageUtil.colorDifference(s1, s2) + ImageUtil.colorDifference(t1, t2)
    return diff if @SIMPLE_WEIGHT_CALC

    dx = tx - sx
    dy = ty - sy

    gs1 = ImageUtil.magnitude @imageData1.gradient(sx, sy, dx, dy)
    gs2 = ImageUtil.magnitude @imageData2.gradient(sx, sy, dx, dy)
    gt1 = ImageUtil.magnitude @imageData1.gradient(tx, ty, dx, dy)
    gt2 = ImageUtil.magnitude @imageData2.gradient(tx, ty, dx, dy)


window.ImageGraph = ImageGraph