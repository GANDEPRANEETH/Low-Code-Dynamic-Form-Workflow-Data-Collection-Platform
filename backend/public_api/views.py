from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from forms.models import Form, FormVersion

@api_view(['GET'])
def get_public_form(request, share_slug):
    form_obj = get_object_or_404(Form, share_slug=share_slug)
    
    if form_obj.status == 'Archived':
        return Response(
            {"detail": "This form has been archived and is no longer active."},
            status=status.HTTP_403_FORBIDDEN
        )
        
    if form_obj.status != 'Published':
        return Response(
            {"detail": "This form is currently in draft mode and not published."},
            status=status.HTTP_403_FORBIDDEN
        )

    # Fetch latest version snapshot
    latest_version = FormVersion.objects.filter(form=form_obj).order_by('-version').first()
    if not latest_version:
        return Response(
            {"detail": "Published version mismatch error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return Response({
        "title": form_obj.title,
        "description": form_obj.description,
        "version": latest_version.version,
        "fields": latest_version.schema_snapshot
    }, status=status.HTTP_200_OK)
