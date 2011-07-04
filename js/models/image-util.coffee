ImageUtil =
  rgbToXyz: (rgb) ->
    r = rgb[0] / 255; g = rgb[1] / 255; b = rgb[2] / 255

    if r > 0.04045 then r = Math.pow (r + 0.055) / 1.055, 2.4 else r = r / 12.92
    if g > 0.04045 then g = Math.pow (g + 0.055) / 1.055, 2.4 else g = g / 12.92
    if b > 0.04045 then b = Math.pow (b + 0.055) / 1.055, 2.4 else b = b / 12.92

    r = r * 100; g = g * 100; b = b * 100

    [ r * 0.4124 + g * 0.3576 + b * 0.1805,
      r * 0.2126 + g * 0.7152 + b * 0.0722,
      r * 0.0193 + g * 0.1192 + b * 0.9505 ]

  xyzToLab: (xyz) ->
    v1 = 1 / 3; v2 = 16 / 116 # Constants
    x = xyz[0] / 95.047; y = xyz[1] / 100; z = xyz[2] / 108.883

    if x > 0.008856 then x = Math.pow x, v1 else x = (7.787 * x) + v2
    if y > 0.008856 then y = Math.pow y, v1 else y = (7.787 * y) + v2
    if z > 0.008856 then z = Math.pow z, v1 else z = (7.787 * z) + v2

    [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]

  magnitude: (c) ->
    Math.sqrt(c[0] * c[0] + c[1] * c[1] + c[2] * c[2])

  subtract: (c1, c2) ->
    [c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]]

  colorDifference: (c1, c2) ->
    # e76 algorithm is simply the Euclidean distance between the two colors in the Lab color space
    ImageUtil.magnitude(ImageUtil.subtract(c1, c2))


class PixelData
  constructor: (rawImageData) ->
    @width = rawImageData.width
    @height = rawImageData.height
    @rawImageData = rawImageData
    @labColorData = null

  initLabColor: () ->
    @labColorData = new Array @width
    @labColorData[x] = new Array @height for x in [0...@width]
    for x in [0...@width]
      for y in [0...@height]
        @labColorData[x][y] = null

  color: (x, y) ->
    i = (y * @width + x) * 4
    [@rawImageData.data[i], @rawImageData.data[i + 1], @rawImageData.data[i + 2], @rawImageData.data[i + 3]]

  setColor: (x, y, c) ->
    i = (y * @width + x) * 4
    alpha = (if c.length == 4 then c[3] else 255)

    @rawImageData.data[i] = c[0];
    @rawImageData.data[i + 1] = c[1];
    @rawImageData.data[i + 2] = c[2]; 
    @rawImageData.data[i + 3] = alpha;

  labColor: (x, y) ->
    @initLabColor() unless @labColorData?
    return @labColorData[x][y] if @labColorData[x][y]
    @labColorData[x][y] = ImageUtil.xyzToLab(ImageUtil.rgbToXyz(@color(x, y)))

  gradient: (x, y, dx, dy) ->
    if dx == -1 && dy == 0
      kernel = [[1, 0, -1],
                [2, 0, -2],
                [1, 0, -1]]
    else if dx == 1 && dy == 0
      kernel = [[-1, 0, 1],
                [-2, 0, 2],
                [-1, 0, 1]]
    else if dx == 0 && dy == -1
      kernel = [[1, 2, 1],
                [0, 0, 0],
                [-1, -2, -1]]
    else if dx == 0 && dy == 1
      kernel = [[-1, -2, -1],
                [0, 0, 0],
                [1, 2, 1]]
    else
      throw new Error "Invalid dx/dy for call to gradient"

    @convolve x, y, kernel

  convolve: (x, y, kernel) ->
    convolution = [0, 0, 0]
    size = kernel.length
    offset = Math.floor(size / 2)

    for kx in [0...size]
      for ky in [0...size]
        clampedX = Math.min(Math.max(x + kx - offset, 0), @width - 1)
        clampedY = Math.min(Math.max(y + ky - offset, 0), @height - 1)

        color = @labColor clampedX, clampedY

        k = kernel[kx][ky]
        convolution[0] += color[0] * k
        convolution[1] += color[1] * k
        convolution[2] += color[2] * k

    convolution

  imageDiff: (imageData) ->
    return Infinity if @width != imageData.width || @height != imageData.height
    @regionDiff imageData, 0, 0, @width, @height

  regionDiff: (imageData, x, y, w, h) ->
    diffSum = 0
    for rx in [x...x + w]
      for ry in [y...y + h]
        diffSum += ImageUtil.colorDifference(@labColor(x, y), imageData.labColor(x, y))

    diffSum / (w * h)

window.ImageUtil = ImageUtil
window.PixelData = PixelData