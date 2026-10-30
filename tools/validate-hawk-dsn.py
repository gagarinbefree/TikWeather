"""Validate the public Hawk collector configuration without printing its value."""

import os
import re
import sys
from urllib.parse import urlsplit


def valid_dsn(value):
    """valid_dsn. Check the public Sentry compatible collector address.

    Parameters
        value The configured collector DSN.
    Returns
        True for a bounded HTTPS DSN without private credentials or query data.
    """
    try:
        address = urlsplit(value)
        port = address.port
        valid = (len(value) <= 512 and address.scheme == "https" and bool(address.hostname)
                 and bool(re.fullmatch(r"[A-Za-z0-9]{1,128}", address.username or ""))
                 and address.password is None and not address.query and not address.fragment
                 and bool(re.search(r"/\d+$", address.path)) and (port is None or port > 0))
    except ValueError:
        valid = False

    return valid


def main():
    """main. Check configuration before publishing without exposing the collector key.

    Returns
        Zero for valid or optional absent configuration and one for invalid settings.
    """
    value = os.environ.get("HAWK_DSN", "")
    required = os.environ.get("REQUIRE_HAWK_DSN") == "true"
    valid = valid_dsn(value) if value else not required
    if not valid:
        print("HAWK_DSN must be the Sentry compatible HTTPS DSN from the Hawk project settings.", file=sys.stderr)

    return 0 if valid else 1


if __name__ == "__main__":
    sys.exit(main())
