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
    path('api/forms/ai-generate', forms_views.ai_generate),
    path('api/forms/<int:form_id>/one-time-tokens', forms_views.one_time_tokens),
    path('api/forms/<int:form_id>/one-time-tokens/<str:token>', forms_views.revoke_one_time_token),
    path('api/forms/<int:form_id>/responses', forms_views.get_responses),
    path('api/forms/<int:form_id>/responses/bulk-delete', forms_views.bulk_delete_responses),
    path('api/forms/<int:form_id>/export', forms_views.export_responses),
    path('api/forms/<int:form_id>/export/json', forms_views.export_responses_json),
    path('api/forms/<int:form_id>/analytics', forms_views.get_analytics),
    path('api/forms/<int:form_id>/duplicate', forms_views.duplicate_form),
    path('api/forms/<int:form_id>/retention', forms_views.apply_retention_policy),
    path('api/audit-logs', forms_views.get_audit_logs),
    
    # Fields CRUD (Builder)
    path('api/forms/<int:form_id>/fields', builder_views.add_field),
    path('api/fields/<int:field_id>', builder_views.field_detail),
    
    # Conditional Rules
    path('api/forms/<int:form_id>/rules', builder_views.get_create_rules),
    path('api/rules/<int:rule_id>', builder_views.delete_rule),
    
    # Lifecycle
    path('api/forms/<int:form_id>/publish', builder_views.publish_form),
    path('api/forms/<int:form_id>/archive', builder_views.archive_form),
    
    # Public Resolution & Submission
    path('api/public/upload', public_views.upload_file),
    path('api/public/<str:share_slug>', public_views.get_public_form),
    path('api/public/<str:share_slug>/submit', public_views.submit_response),
]

from django.views.generic import TemplateView
from django.views.decorators.csrf import ensure_csrf_cookie

# Serve media files
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Serve frontend static assets from /assets/
urlpatterns += static('/assets/', document_root=settings.BASE_DIR.parent / 'frontend' / 'dist' / 'assets')

# Catch-all to serve index.html for frontend routing
urlpatterns += [
    path('', ensure_csrf_cookie(TemplateView.as_view(template_name='index.html'))),
    path('<path:path>', ensure_csrf_cookie(TemplateView.as_view(template_name='index.html'))),
]
