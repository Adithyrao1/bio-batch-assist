# This makes the Celery app load whenever Django starts,
# so @shared_task decorators work correctly across all apps.
from .celery import app as celery_app

__all__ = ("celery_app",)
