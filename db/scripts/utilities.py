import logging
import sys

def configure_logging(logging_level=logging.DEBUG):
    root = logging.getLogger()
    root.setLevel(logging_level)

    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging_level)

    formatter = logging.Formatter("[%(levelname)s] %(asctime)s - %(module)s.%(funcName)s - %(message)s")
    ch.setFormatter(formatter)

    root.addHandler(ch)