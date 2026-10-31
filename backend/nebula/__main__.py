"""`python -m nebula --version` prints the version."""

import sys

from nebula.version import __version__

if "--version" in sys.argv[1:]:
    sys.stdout.write(__version__)
