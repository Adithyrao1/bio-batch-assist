"""
URL configuration for config project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('api/auth/', include('rest_framework.urls')),
    path('debug-broker/', lambda r: __import__('django.http').http.JsonResponse({'broker': __import__('django.conf').conf.settings.CELERY_BROKER_URL, 'eager': getattr(__import__('django.conf').conf.settings, 'CELERY_TASK_ALWAYS_EAGER', False), 'app': str(__import__('core.tasks').tasks.generate_production_excel_task.app.conf.broker_url)})),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
