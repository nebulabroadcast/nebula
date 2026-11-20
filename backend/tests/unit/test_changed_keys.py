from nebula.objects.asset import Asset


def loaded(**meta: object) -> Asset:
    return Asset.from_meta({"id": 1, "id_folder": 1, **meta})


def test_unchanged() -> None:
    assert loaded(title="A").changed_keys() == {}


def test_item_assignment() -> None:
    asset = loaded(title="A")
    asset["title"] = "B"
    assert asset.changed_keys() == {"title": ("A", "B")}


def test_update_adds_key() -> None:
    asset = loaded(title="A")
    asset.update({"title": "A", "subtitle": "S"})
    assert asset.changed_keys() == {"subtitle": (None, "S")}


def test_removal() -> None:
    asset = loaded(title="A", subtitle="S")
    asset["subtitle"] = None
    assert asset.changed_keys() == {"subtitle": ("S", None)}


def test_nested_change_in_place() -> None:
    asset = loaded(subclips=[{"title": "x", "mark_in": 0, "mark_out": 1}])
    asset.meta["subclips"][0]["title"] = "y"
    old, new = asset.changed_keys()["subclips"]
    assert old[0]["title"] == "x"
    assert new[0]["title"] == "y"


def test_direct_meta_write() -> None:
    asset = loaded(title="A")
    asset.meta["title"] = "B"
    assert asset.changed_keys() == {"title": ("A", "B")}


def test_new_object_has_every_key_changed() -> None:
    asset = Asset(meta={"title": "A"})
    assert asset.changed_keys()["title"] == (None, "A")


def test_from_untrusted_is_new() -> None:
    asset = Asset.from_untrusted({"title": "A"})
    assert "title" in asset.changed_keys()
