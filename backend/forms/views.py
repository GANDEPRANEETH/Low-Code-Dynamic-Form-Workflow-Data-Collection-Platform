import csv
from django.http import HttpResponse
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404

from .models import Form, Response as FormResponse, Field
from .serializers import FormSerializer, ResponseSerializer

class FormViewSet(viewsets.ModelViewSet):
    serializer_class = FormSerializer

    def get_queryset(self):
        # Authenticated users see their own forms plus unowned forms (for backwards compatibility).
        # Anonymous users can see unowned forms or all forms for builder previewing.
        if self.request.user.is_authenticated:
            return Form.objects.filter(Q(owner=self.request.user) | Q(owner__isnull=True)).order_by('-created_at')
        return Form.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(owner=self.request.user)
        else:
            serializer.save()

    def update(self, request, *args, **kwargs):
        # Enforce rule: Only authenticated users can edit published forms
        partial = kwargs.pop('partial', False)
        instance = self.get_object_handle_auth(request, kwargs.get('pk'))
        if isinstance(instance, Response):
            return instance # Returns 401/403 response if checked

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def get_object_handle_auth(self, request, pk):
        obj = get_object_or_404(Form, id=pk)
        if obj.status == 'Published' and not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication is required to edit published forms."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        return obj


# --- SUBMISSIONS AND EXPORTS APIS ---

@api_view(['GET'])
@permission_classes([AllowAny]) # We can allow check permissions if logged in
def get_responses(request, form_id):
    form_obj = get_object_or_404(Form, id=form_id)
    
    # Optional owner check: if form has owner, restrict to that owner
    if form_obj.owner and form_obj.owner != request.user:
        return Response(
            {"detail": "You do not have permission to view responses for this form."},
            status=status.HTTP_403_FORBIDDEN
        )

    responses_qs = form_obj.responses.all().order_by('-submitted_at')
    
    # We will build a list of responses with extracted Name and Email for dashboard display
    results = []
    
    # Fetch form fields to match keys
    fields = form_obj.fields.all()
    name_field_id = None
    email_field_id = None
    
    # Search for field ids matching Name and Email
    for f in fields:
        label_lower = f.label.lower()
        if not name_field_id and ("name" in label_lower or "user" in label_lower or "submitter" in label_lower):
            name_field_id = str(f.id)
        if not email_field_id and ("email" in label_lower or f.field_type == "email"):
            email_field_id = str(f.id)
            
    for r in responses_qs:
        data = r.submitted_data
        
        # If versions snapshot fields are available, scan them instead
        snapshot_fields = r.form_version.schema_snapshot if r.form_version else []
        if snapshot_fields:
            for sf in snapshot_fields:
                sf_label = sf.get("label", "").lower()
                sf_type = sf.get("field_type", "")
                if "name" in sf_label and not data.get(name_field_id):
                    name_field_id = str(sf.get("id"))
                if ("email" in sf_label or sf_type == "email") and not data.get(email_field_id):
                    email_field_id = str(sf.get("id"))

        name_val = data.get(name_field_id) or data.get("name") or data.get("Name")
        email_val = data.get(email_field_id) or data.get("email") or data.get("Email")
        
        # Fallbacks if name/email fields weren't explicitly found
        if not name_val:
            # Try finding any text field
            for key, val in data.items():
                if isinstance(val, str) and len(val) > 2 and "@" not in val:
                    name_val = val
                    break
        if not email_val:
            # Try finding any email string
            for key, val in data.items():
                if isinstance(val, str) and "@" in val:
                    email_val = val
                    break

        results.append({
            "id": r.id,
            "submitted_at": r.submitted_at,
            "name": name_val or "Anonymous",
            "email": email_val or "N/A",
            "submitted_data": data,
            "version": r.form_version.version if r.form_version else 1
        })

    return Response(results, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def export_responses(request, form_id):
    form_obj = get_object_or_404(Form, id=form_id)
    
    if form_obj.owner and form_obj.owner != request.user:
        return HttpResponse("Unauthorized", status=403)

    responses_qs = form_obj.responses.all().order_by('-submitted_at')

    # Create CSV response
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="form_{form_id}_responses.csv"'

    writer = csv.writer(response)
    
    # Gather all fields across versions or current fields to compile header
    fields_headers = []
    field_ids = []
    
    # We scan the latest fields to define headers
    fields = form_obj.fields.all().order_by('display_order')
    for f in fields:
        fields_headers.append(f.label)
        field_ids.append(str(f.id))

    # Fallback to scanning snapshots if fields were deleted
    if not fields.exists() and responses_qs.exists():
        first_r = responses_qs.first()
        if first_r.form_version:
            for sf in first_r.form_version.schema_snapshot:
                fields_headers.append(sf.get("label"))
                field_ids.append(str(sf.get("id")))

    # CSV Header Row
    writer.writerow(["Response ID", "Submission Date"] + fields_headers)

    # Write Data rows
    for r in responses_qs:
        data = r.submitted_data
        row_fields = []
        for fid in field_ids:
            val = data.get(fid)
            if isinstance(val, list):
                val = ", ".join(map(str, val))
            row_fields.append(val if val is not None else "")
        writer.writerow([r.id, r.submitted_at.strftime('%Y-%m-%d %H:%M:%S')] + row_fields)

    return response
