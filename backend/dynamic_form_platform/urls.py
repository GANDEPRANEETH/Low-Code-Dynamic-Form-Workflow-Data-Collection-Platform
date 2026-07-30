from django.contrib import admin
from django.urls import path
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static

from forms import views as forms_views
from forms import auth_views
from builder import views as builder_views
from public_api import views as public_views

# Health check view
def health_check(request):
    return JsonResponse({"status": "ok", "message": "Django Form Schema engine is running"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health', health_check),
    
    # Auth endpoints
    path('api/auth/register', auth_views.register_user),
    path('api/auth/login', auth_views.login_user),
    path('api/auth/me', auth_views.get_me),
    
    # Forms CRUD
    path('api/forms', forms_views.FormViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('api/forms/<int:pk>', forms_views.FormViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'})),
    
    # Form Submissions and Export
    path('api/forms/<int:form_id>/responses', forms_views.get_responses),
    path('api/forms/<int:form_id>/export', forms_views.export_responses),
    
    # Fields CRUD (Builder)
    path('api/forms/<int:form_id>/fields', builder_views.add_field),
    path('api/fields/<int:field_id>', builder_views.field_detail),
    
    # Lifecycle
    path('api/forms/<int:form_id>/publish', builder_views.publish_form),
    path('api/forms/<int:form_id>/archive', builder_views.archive_form),
    
    # Public Resolution & Submission
    path('api/public/upload', public_views.upload_file),
    path('api/public/<str:share_slug>', public_views.get_public_form),
    path('api/public/<str:share_slug>/submit', public_views.submit_response),
]

# Serve media files in development mode
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
