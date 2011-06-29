class Player
  play: (@currentlyPlayingSong) ->
    @isPlaying = true

  pause: ->
    @isPlaying = false

  resume: ->
    throw new Error "song is already playing" if @isPlaying
    @isPlaying = true

  makeFavorite: ->
    @currentlyPlayingSong.persistFavoriteStatus true

window.Player = Player