from django.contrib import admin
from django.urls import path
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter

from forms.views import FormViewSet
from builder import views as builder_views
from public_api import views as public_views

# Health check view
def health_check(request):
    return JsonResponse({"status": "ok", "message": "Django Form Schema engine is running"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health', health_check),
    
    # Forms CRUD
    path('api/forms', FormViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('api/forms/<int:pk>', FormViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'})),
    
    # Fields CRUD (Builder)
    path('api/forms/<int:form_id>/fields', builder_views.add_field),
    path('api/fields/<int:field_id>', builder_views.update_field),
    
    # Lifecycle
    path('api/forms/<int:form_id>/publish', builder_views.publish_form),
    path('api/forms/<int:form_id>/archive', builder_views.archive_form),
    
    # Public Resolution
    path('api/public/<str:share_slug>', public_views.get_public_form),
]
