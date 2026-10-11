from nebula.helpers.fulltext import fulltext_ranges


def test_ranges_are_prefix_bounds():
    assert fulltext_ranges("Star Trek") == [("star", "stas"), ("trek", "trel")]


def test_last_character_boundaries():
    assert fulltext_ranges("buzz 2009") == [("2009", "200:"), ("buzz", "buz{")]


def test_short_and_duplicate_words_are_dropped():
    assert fulltext_ranges("a an the the") == [("the", "thf")]


def test_words_are_slugified():
    assert fulltext_ranges("Šťastný-den") == [("den", "deo"), ("stastny", "stastnz")]


def test_nothing_to_search():
    assert fulltext_ranges("!! ..") == []
