beforeEach -> @addMatchers
  toBeNode: (expected) -> @actual.val == expected.val

  toHaveSameElementsAs: (expected) ->
    return false if expected.length != @actual.length
    for val in expected
      return false if @actual.indexOf(val) == -1

    true