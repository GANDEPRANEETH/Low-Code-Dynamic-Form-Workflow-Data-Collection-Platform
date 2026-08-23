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

from forms.models import Form, FormVersion, Response as FormResponse, Submission, ResponseValue, UploadedFileReference
import re
import datetime
import random
import string
from django.db import transaction

EMAIL_REGEX = re.compile(r"[^@]+@[^@]+\.[^@]+")

def is_valid_date(date_str):
    try:
        datetime.datetime.strptime(date_str, '%Y-%m-%d')
        return True
    except ValueError:
        return False

def evaluate_condition(trigger_val, operator, comparison_val):
    if trigger_val is None:
        trigger_val = ""
    comp_str = str(comparison_val or "")
    
    if operator == 'is_empty':
        return trigger_val == "" or trigger_val == [] or trigger_val == {}

    if isinstance(trigger_val, list):
        if operator == 'equals':
            return len(trigger_val) == 1 and str(trigger_val[0]).lower() == comp_str.lower()
        elif operator == 'not_equals':
            return not (len(trigger_val) == 1 and str(trigger_val[0]).lower() == comp_str.lower())
        elif operator == 'contains':
            return any(comp_str.lower() in str(item).lower() for item in trigger_val)
        elif operator == 'greater_than':
            return False
    else:
        val_str = str(trigger_val)
        if operator == 'equals':
            return val_str.lower() == comp_str.lower()
        elif operator == 'not_equals':
            return val_str.lower() != comp_str.lower()
        elif operator == 'contains':
            return comp_str.lower() in val_str.lower()
        elif operator == 'greater_than':
            try:
                return float(val_str) > float(comp_str)
            except ValueError:
                return False
    return False

def get_field_states(fields, rules, submitted_data):
    states = {}
    for f in fields:
        fid = f.get('id')
        states[fid] = {
            'visible': True,
            'required': f.get('required', False)
        }
    
    for r in rules:
        target_id = r.get('target_field_id')
        action = r.get('action')
        if action == 'show' and target_id in states:
            states[target_id]['visible'] = False
            
    for _ in range(5):
        state_changed = False
        for r in rules:
            trigger_id = r.get('trigger_field_id')
            target_id = r.get('target_field_id')
            operator = r.get('operator')
            comp_val = r.get('comparison_value')
            action = r.get('action')
            
            if trigger_id not in states or target_id not in states:
                continue
                
            trigger_visible = states[trigger_id]['visible']
            trigger_val = submitted_data.get(str(trigger_id)) if trigger_visible else None
            
            condition_met = evaluate_condition(trigger_val, operator, comp_val)
            if condition_met:
                if action == 'show' and not states[target_id]['visible']:
                    states[target_id]['visible'] = True
                    state_changed = True
                elif action == 'hide' and states[target_id]['visible']:
                    states[target_id]['visible'] = False
                    state_changed = True
                elif action == 'require' and not states[target_id]['required']:
                    states[target_id]['required'] = True
                    state_changed = True
        if not state_changed:
            break
    return states

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

    from django.utils import timezone
    now = timezone.now()

    # 1. Scheduled Publish Check
    if form_obj.publish_at and now < form_obj.publish_at:
        formatted_time = form_obj.publish_at.strftime('%d %B %Y at %I:%M %p')
        return Response(
            {"detail": f"This form will be available on {formatted_time}."},
            status=status.HTTP_403_FORBIDDEN
        )

    # 2. Expiration Date Check
    if form_obj.expires_at and now > form_obj.expires_at:
        return Response(
            {"detail": "This form is no longer accepting responses."},
            status=status.HTTP_403_FORBIDDEN
        )

    # 3. Max Submissions Count Check
    if form_obj.max_submissions is not None:
        completed_count = form_obj.submissions.filter(status='Completed').count()
        if completed_count >= form_obj.max_submissions:
            return Response(
                {"detail": "This form is no longer accepting responses."},
                status=status.HTTP_403_FORBIDDEN
            )

    # 4. One-Time Submission Token Check
    token_param = request.GET.get('token')
    if token_param:
        from forms.models import OneTimeToken
        try:
            token_obj = OneTimeToken.objects.get(form=form_obj, token=token_param)
            if token_obj.status == 'Active' and token_obj.expires_at and now > token_obj.expires_at:
                token_obj.status = 'Expired'
                token_obj.save(update_fields=['status'])
                
            if token_obj.status != 'Active':
                return Response(
                    {"detail": f"This submission link has already been used or is {token_obj.status.lower()}."},
                    status=status.HTTP_403_FORBIDDEN
                )
        except OneTimeToken.DoesNotExist:
            return Response(
                {"detail": "This submission link is invalid."},
                status=status.HTTP_403_FORBIDDEN
            )

    # Fetch latest version snapshot
    latest_version = FormVersion.objects.filter(form=form_obj).order_by('-version').first()
    if not latest_version:
        return Response(
            {"detail": "Published version mismatch error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Generate unique started submission
    attempts = 0
    resp_id = None
    while True:
        resp_id = 'RESP-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        if not Submission.objects.filter(response_id=resp_id).exists():
            break
        attempts += 1
        if attempts > 100:
            resp_id = None
            break
            
    if resp_id:
        Submission.objects.create(
            form=form_obj,
            form_version=latest_version,
            response_id=resp_id,
            status='Started'
        )
        form_obj.started_count = form_obj.started_count + 1
        form_obj.save(update_fields=['started_count'])

    return Response({
        "title": form_obj.title,
        "description": form_obj.description,
        "version": latest_version.version,
        "fields": latest_version.schema_snapshot,
        "conditional_rules": latest_version.conditional_rules_snapshot or [],
        "response_id": resp_id
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

    from django.utils import timezone
    now = timezone.now()

    # 1. Scheduled publish check
    if form_obj.publish_at and now < form_obj.publish_at:
        formatted_time = form_obj.publish_at.strftime('%d %B %Y at %I:%M %p')
        return Response(
            {"detail": f"This form will be available on {formatted_time}."},
            status=status.HTTP_403_FORBIDDEN
        )

    # 2. Expiration Date Check
    if form_obj.expires_at and now > form_obj.expires_at:
        return Response(
            {"detail": "This form is no longer accepting responses."},
            status=status.HTTP_403_FORBIDDEN
        )

    # 3. Max Submissions Check
    if form_obj.max_submissions is not None:
        completed_count = form_obj.submissions.filter(status='Completed').count()
        if completed_count >= form_obj.max_submissions:
            return Response(
                {"detail": "This form is no longer accepting responses."},
                status=status.HTTP_403_FORBIDDEN
            )

    # 4. Validate One-Time Submission Token
    token_param = request.data.get('token') or request.GET.get('token')
    token_obj = None
    if token_param:
        from forms.models import OneTimeToken
        try:
            token_obj = OneTimeToken.objects.get(form=form_obj, token=token_param)
            if token_obj.status == 'Active' and token_obj.expires_at and now > token_obj.expires_at:
                token_obj.status = 'Expired'
                token_obj.save(update_fields=['status'])
                
            if token_obj.status != 'Active':
                return Response(
                    {"detail": f"This submission link has already been used or is {token_obj.status.lower()}."},
                    status=status.HTTP_403_FORBIDDEN
                )
        except OneTimeToken.DoesNotExist:
            return Response(
                {"detail": "This submission link is invalid."},
                status=status.HTTP_403_FORBIDDEN
            )

    latest_version = FormVersion.objects.filter(form=form_obj).order_by('-version').first()
    if not latest_version:
        return Response(
            {"detail": "No published form version found."},
            status=status.HTTP_404_NOT_FOUND
        )

    fields = latest_version.schema_snapshot or []
    rules = latest_version.conditional_rules_snapshot or []
    submitted_data = request.data.get('submitted_data', {})

    # Evaluate conditional rules
    field_states = get_field_states(fields, rules, submitted_data)

    errors = {}
    for f in fields:
        fid = f.get('id')
        fid_str = str(fid)
        label = f.get('label', '')
        ftype = f.get('field_type', '')
        state = field_states.get(fid)
        if not state:
            continue
            
        val = submitted_data.get(fid_str)
        
        # 1. Hidden check: must be empty
        if not state['visible']:
            if val is not None and val != "" and val != [] and val != 0:
                errors[fid_str] = [f"Field '{label}' is hidden and cannot accept values."]
            continue
            
        # 2. Required check
        is_empty = (val is None or val == "" or val == [] or (isinstance(val, list) and len(val) == 0))
        if state['required'] and is_empty:
            errors[fid_str] = [f"Field '{label}' is required."]
            continue
            
        if is_empty:
            continue
            
        # 3. Type validations
        validation_rules = f.get('validation_rules') or {}
        
        if ftype == 'email':
            if not EMAIL_REGEX.match(str(val)):
                errors[fid_str] = ["Enter a valid email address."]
                
        elif ftype == 'number':
            try:
                num_val = float(val)
                min_v = validation_rules.get('min_value')
                max_v = validation_rules.get('max_value')
                if min_v is not None and min_v != "" and num_val < float(min_v):
                    errors[fid_str] = [f"Value must be at least {min_v}."]
                if max_v is not None and max_v != "" and num_val > float(max_v):
                    errors[fid_str] = [f"Value cannot exceed {max_v}."]
            except (ValueError, TypeError):
                errors[fid_str] = ["Value must be a valid number."]
                
        elif ftype == 'rating':
            try:
                num_val = int(val)
                min_v = validation_rules.get('min_value', 1)
                max_v = validation_rules.get('max_value', 5)
                if min_v is None or min_v == "": min_v = 1
                if max_v is None or max_v == "": max_v = 5
                if num_val < int(min_v) or num_val > int(max_v):
                    errors[fid_str] = [f"Rating must be between {min_v} and {max_v}."]
            except (ValueError, TypeError):
                errors[fid_str] = ["Rating must be a valid number."]
                
        elif ftype == 'dropdown':
            options = f.get('options') or []
            if str(val) not in options:
                errors[fid_str] = ["Value is not in the allowed options list."]
                
        elif ftype == 'checkbox':
            options = f.get('options') or []
            if not isinstance(val, list):
                errors[fid_str] = ["Value must be a list of choices."]
            else:
                invalid_choices = [x for x in val if x not in options]
                if invalid_choices:
                    errors[fid_str] = ["Selected options contain invalid choices."]
                    
        elif ftype == 'date':
            if not is_valid_date(str(val)):
                errors[fid_str] = ["Value must be a valid date in YYYY-MM-DD format."]
                
        elif ftype == 'file':
            if not isinstance(val, str) or not val.startswith(('http://', 'https://', '/media/')):
                errors[fid_str] = ["Invalid file path reference."]
                
        # Length check for text strings
        if ftype in ('text', 'long_text'):
            val_str = str(val)
            min_len = validation_rules.get('min_length')
            max_len = validation_rules.get('max_length')
            if min_len is not None and min_len != "" and len(val_str) < int(min_len):
                errors[fid_str] = [f"Text must be at least {min_len} characters long."]
            if max_len is not None and max_len != "" and len(val_str) > int(max_len):
                errors[fid_str] = [f"Text cannot exceed {max_len} characters."]

    if errors:
        return Response({"success": False, "errors": errors}, status=status.HTTP_400_BAD_REQUEST)

    client_response_id = request.data.get('response_id')
    
    # 1. Duplicate submission protection
    if client_response_id:
        existing_sub = Submission.objects.filter(response_id=client_response_id, status='Completed').first()
        if existing_sub:
            return Response({
                "response_id": client_response_id,
                "message": "Submitted Successfully"
            }, status=status.HTTP_201_CREATED)

    submission = None
    if client_response_id:
        submission = Submission.objects.filter(response_id=client_response_id, status='Started').first()

    try:
        with transaction.atomic():
            if submission:
                submission.status = 'Completed'
                import django.utils.timezone as timezone
                completion_time_sec = int((timezone.now() - submission.submitted_at).total_seconds())
                submission.completion_time = completion_time_sec
                submission.save(update_fields=['status', 'completion_time'])
                resp_id = submission.response_id
            else:
                attempts = 0
                while True:
                    resp_id = 'RESP-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
                    if not Submission.objects.filter(response_id=resp_id).exists():
                        break
                    attempts += 1
                    if attempts > 100:
                        raise Exception("Unable to generate unique Response ID")
                        
                submission = Submission.objects.create(
                    form=form_obj,
                    form_version=latest_version,
                    response_id=resp_id,
                    status='Completed'
                )
            
            for f in fields:
                fid = f.get('id')
                fid_str = str(fid)
                state = field_states.get(fid)
                if not state or not state['visible']:
                    continue
                val = submitted_data.get(fid_str)
                if val is not None:
                    ResponseValue.objects.create(
                        submission=submission,
                        field_id=fid,
                        value=val
                    )
                    
                    if f.get('field_type') == 'file':
                        url_str = str(val)
                        file_name = url_str.split('/')[-1]
                        if '_' in file_name:
                            file_name = file_name.split('_', 1)[1]
                        UploadedFileReference.objects.create(
                            submission=submission,
                            field_id=fid,
                            file_name=file_name,
                            file_url=url_str
                        )
            
            # Backwards compatibility: populate old Response model
            FormResponse.objects.create(
                form=form_obj,
                form_version=latest_version,
                submitted_data=submitted_data
            )
            
            # Mark one-time token as Used if valid
            if token_obj:
                token_obj.status = 'Used'
                token_obj.used_at = timezone.now()
                token_obj.save(update_fields=['status', 'used_at'])
                
                from forms.models import AuditLog
                AuditLog.objects.create(
                    user=None,
                    action="one_time_token_submitted",
                    target=form_obj.title,
                    context={"token": token_obj.token, "response_id": resp_id}
                )
            
            return Response({
                "response_id": resp_id,
                "message": "Submitted Successfully"
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        return Response({"success": False, "detail": f"Submission failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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

    # Validate file size (max 5 MB)
    max_size = 5 * 1024 * 1024
    if uploaded_file.size > max_size:
        return Response(
            {"detail": "File size exceeds the 5 MB limit."},
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
