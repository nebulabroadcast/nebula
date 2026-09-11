__all__ = ["xml"]

from xml.etree import ElementTree as ET


def xml(data: str) -> ET.Element | None:
    """Parse an XML string using ElementTree

    Args:
        data (str): The XML document to parse

    Returns:
        ElementTree.Element: The root element of the parsed XML string
    """
    return ET.XML(data)
