from nebula.utils import slugify


def fulltext_ranges(query: str) -> list[tuple[str, str]]:
    """Search words of a query as `ft.value` index ranges.

    Each word becomes (lo, hi): tokens starting with the word are those with
    `lo <= value < hi`. Use them with `~>=~` and `~<~`, the operators
    `idx_ft` (text_pattern_ops) supports. Unlike `LIKE 'word%'`, they use
    the index with bound parameters too.

    Slugified words are lower case ASCII letters and digits only, so
    incrementing the last character always gives a valid upper bound.
    """
    words = sorted(slugify(query, make_set=True, min_length=3))
    return [(word, word[:-1] + chr(ord(word[-1]) + 1)) for word in words]
