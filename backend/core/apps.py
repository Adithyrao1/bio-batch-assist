from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = 'core'

    def ready(self):
        # Eagerly compile the LangGraph agent once per worker process at startup,
        # so the first real user request is not penalised by the ~300 ms build cost.
        # Guard against the double-call Django makes during autoreload in dev.
        import os
        if os.environ.get('RUN_MAIN') != 'true':  # production / gunicorn workers
            try:
                from core.agent.agent import get_agent
                get_agent()
            except Exception:
                # Missing API key or misconfiguration during startup should not
                # crash the server — the view will return a 503 gracefully.
                pass
