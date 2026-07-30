from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from forms.models import Form, Field, FormVersion
from forms.serializers import FormSerializer, FieldSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
def add_field(request, form_id):
    form_obj = get_object_or_404(Form, id=form_id)
    
    # Enforce: Only authenticated users can edit fields of published forms
    if form_obj.status == 'Published' and not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication is required to edit fields of published forms."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Auto-assign order if not set
    data = request.data.copy()
    if 'display_order' not in data or data['display_order'] is None:
        max_order = Field.objects.filter(form=form_obj).count()
        data['display_order'] = max_order

    serializer = FieldSerializer(data=data)
    if serializer.is_valid():
        serializer.save(form=form_obj)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT', 'DELETE'])
@permission_classes([AllowAny])
def field_detail(request, field_id):
    field_obj = get_object_or_404(Field, id=field_id)
    form_obj = field_obj.form
    
    # Enforce: Only authenticated users can edit fields of published forms
    if form_obj.status == 'Published' and not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication is required to edit fields of published forms."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if request.method == 'PUT':
        serializer = FieldSerializer(field_obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    elif request.method == 'DELETE':
        field_obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
@permission_classes([AllowAny]) # We handle check inline to display user login modal on frontend
def publish_form(request, form_id):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication is required to publish forms."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    form_obj = get_object_or_404(Form, id=form_id)
    
    # Check if form has fields to publish
    fields_qs = form_obj.fields.all().order_by('display_order')
    if not fields_qs.exists():
        return Response(
            {"detail": "Cannot publish an empty form. Please add fields first."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Freeze current schema snapshot
    schema_snapshot = []
    for f in fields_qs:
        schema_snapshot.append({
            "id": f.id,
            "label": f.label,
            "field_type": f.field_type,
            "required": f.required,
            "placeholder": f.placeholder,
            "options": f.options,
            "validation_rules": f.validation_rules,
            "display_order": f.display_order
        })

    # Save FormVersion
    version_num = form_obj.current_version
    FormVersion.objects.create(
        form=form_obj,
        version=version_num,
        schema_snapshot=schema_snapshot
    )

    # Update form state
    form_obj.status = 'Published'
    form_obj.owner = request.user  # Set form owner
    form_obj.current_version += 1
    form_obj.save()

    serializer = FormSerializer(form_obj)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def archive_form(request, form_id):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication is required to archive forms."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    form_obj = get_object_or_404(Form, id=form_id)
    
    # Update state to archived
    form_obj.status = 'Archived'
    form_obj.save()

    serializer = FormSerializer(form_obj)
    return Response(serializer.data, status=status.HTTP_200_OK)
