__all__ = ["xml"]

from xml.etree import ElementTree


def xml(data: str) -> ElementTree.Element | None:
    """Parse an XML string using ElementTree

    Args:
        data (str): The XML document to parse

    Returns:
        ElementTree.Element: The root element of the parsed XML string
    """
    return ElementTree.XML(data)
