import logging
from rich.logging import RichHandler


def get_logger(name: str = "app"):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    if not logger.handlers:
        handler = RichHandler(
            markup=True,
            rich_tracebacks=True,
            show_time=True,
            show_level=True,
            show_path=False,
        )
        formatter = logging.Formatter("%(message)s")
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.propagate = False

    return logger


# Global default logger
logger = get_logger()
