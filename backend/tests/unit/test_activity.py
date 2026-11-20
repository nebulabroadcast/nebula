from nebula.activity import activities_from_changes


def test_untracked_keys_write_nothing() -> None:
    changes = {
        "mtime": (1, 2),
        "ctime": (1, 2),
        "updated_by": (1, 2),
        "__file/written": (None, 10),
    }
    assert activities_from_changes(changes) == []


def test_meta() -> None:
    rows = activities_from_changes({"title": ("A", "B"), "subtitle": (None, "S")})
    assert rows == [
        (
            "meta",
            {"keys": ["subtitle", "title"]},
            {"changes": {"title": ["A", "B"], "subtitle": [None, "S"]}},
        )
    ]


def test_own_kinds_are_split_off() -> None:
    rows = activities_from_changes(
        {"title": ("A", "B"), "qc/state": (None, 4), "status": (1, 3)}
    )
    assert [r[0] for r in rows] == ["meta", "qc", "status"]
    assert rows[0][1] == {"keys": ["title"]}
    assert rows[1] == ("qc", {"old": None, "new": 4}, None)
    assert rows[2] == ("status", {"old": 1, "new": 3}, None)


def test_only_qc() -> None:
    assert activities_from_changes({"qc/state": (4, 3), "mtime": (1, 2)}) == [
        ("qc", {"old": 4, "new": 3}, None)
    ]


def test_object_values_kept_in_full() -> None:
    subclips = [{"title": "Intro", "mark_in": 0, "mark_out": 12.4}]
    [(_, summary, detail)] = activities_from_changes({"subclips": (None, subclips)})
    assert summary == {"keys": ["subclips"]}
    assert detail == {"changes": {"subclips": [None, subclips]}}


def test_long_values_not_cut() -> None:
    text = "x" * 5000
    [(_, _, detail)] = activities_from_changes({"description": ("", text)})
    assert detail is not None
    assert detail["changes"]["description"][1] == text
