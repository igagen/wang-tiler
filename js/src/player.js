(function() {
  var Player;
  Player = (function() {
    function Player() {}
    Player.prototype.play = function(currentlyPlayingSong) {
      this.currentlyPlayingSong = currentlyPlayingSong;
      return this.isPlaying = true;
    };
    Player.prototype.pause = function() {
      return this.isPlaying = false;
    };
    Player.prototype.resume = function() {
      if (this.isPlaying) {
        throw new Error("song is already playing");
      }
      return this.isPlaying = true;
    };
    Player.prototype.makeFavorite = function() {
      return this.currentlyPlayingSong.persistFavoriteStatus(true);
    };
    return Player;
  })();
  window.Player = Player;
}).call(this);
