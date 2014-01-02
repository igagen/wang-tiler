wang-tiler
==========

A Coffeescript Wang-tile generator that runs in the browser

Implements the 'Strict Wang Tile' algorithm as described in: 'Efficient Texture Synthesis Using Strict Wang Tiles' by Xinyu Zhang and Young J. Kim.

Also implements a max flow / min cut image graph algorithm described in 'An Experimental Comparison of Min-Cut / Max-Flow Algorithms for Energy Minimization in Vision' # By Yuri Boykov and Vladimir Kolmogorov # Described here: http://www.csd.uwo.ca/~yuri/Papers/pami04.pdf. This is used to determine the minimum error cuts for each Wang tile.

The algorithm has tuneable parameters for tile size, number of tiles, tile patterns, etc.
