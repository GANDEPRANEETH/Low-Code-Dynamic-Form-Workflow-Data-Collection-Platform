from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.core.files.storage import default_storage
from django.conf import settings
import os
import uuid

from forms.models import Form, FormVersion, Response as FormResponse

@api_view(['GET'])
@permission_classes([AllowAny])
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


@api_view(['POST'])
@permission_classes([AllowAny])
def submit_response(request, share_slug):
    form_obj = get_object_or_404(Form, share_slug=share_slug)
    
    if form_obj.status != 'Published':
        return Response(
            {"detail": "Submissions are only allowed on published forms."},
            status=status.HTTP_403_FORBIDDEN
        )

    latest_version = FormVersion.objects.filter(form=form_obj).order_by('-version').first()
    submitted_data = request.data.get('submitted_data', {})

    # Create submission record
    FormResponse.objects.create(
        form=form_obj,
        form_version=latest_version,
        submitted_data=submitted_data
    )

    return Response({"status": "success", "message": "Response submitted successfully"}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def upload_file(request):
    if 'file' not in request.FILES:
        return Response({"detail": "No file attachment provided"}, status=status.HTTP_400_BAD_REQUEST)
        
    uploaded_file = request.FILES['file']
    filename = uploaded_file.name
    ext = os.path.splitext(filename)[1].lower().replace('.', '')
    
    allowed_extensions = {'pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'}
    if ext not in allowed_extensions:
        return Response(
            {"detail": f"File type not supported. Allowed formats: {allowed_extensions}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Generate a unique filename prefix to prevent name clashes
    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    upload_path = os.path.join('uploads', unique_filename)
    
    # Save the file using default storage (local media folder)
    saved_path = default_storage.save(upload_path, uploaded_file)
    
    # Construct complete absolute URL
    file_url = request.build_absolute_uri(settings.MEDIA_URL + saved_path)
    
    return Response({
        "status": "success",
        "file_url": file_url,
        "filename": filename
    }, status=status.HTTP_201_CREATED)
