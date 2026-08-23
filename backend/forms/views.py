import csv
from django.http import HttpResponse
from django.db import models
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404

from .models import Form, Response as FormResponse, Field, Submission, ResponseValue, UploadedFileReference, AuditLog, FormVersion
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
@permission_classes([AllowAny])
def get_responses(request, form_id):
    form_obj = get_object_or_404(Form, id=form_id)
    
    if form_obj.owner and form_obj.owner != request.user:
        return Response(
            {"detail": "You do not have permission to view responses for this form."},
            status=status.HTTP_403_FORBIDDEN
        )

    # Automatically apply retention policy on load if configured
    if form_obj.retention_days is not None:
        from django.utils import timezone
        cutoff_date = timezone.now() - timezone.timedelta(days=form_obj.retention_days)
        form_obj.submissions.filter(submitted_at__lt=cutoff_date, is_archived=False).update(is_archived=True)

    submissions_qs = form_obj.submissions.all().order_by('-submitted_at')

    # Apply filters
    show_archived = request.GET.get('show_archived') == 'true'
    if not show_archived:
        submissions_qs = submissions_qs.filter(is_archived=False)

    status_param = request.GET.get('status')
    if status_param:
        submissions_qs = submissions_qs.filter(status=status_param)

    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    if start_date:
        submissions_qs = submissions_qs.filter(submitted_at__date__gte=start_date)
    if end_date:
        submissions_qs = submissions_qs.filter(submitted_at__date__lte=end_date)

    search_query = request.GET.get('search')
    if search_query:
        submissions_qs = submissions_qs.filter(values__value__icontains=search_query).distinct()

    field_id_param = request.GET.get('field_id')
    field_value_param = request.GET.get('field_value')
    if field_id_param and field_value_param:
        try:
            fid = int(field_id_param)
            submissions_qs = submissions_qs.filter(values__field_id=fid, values__value__icontains=field_value_param)
        except ValueError:
            pass

    for key, value in request.GET.items():
        if key.startswith('field_') and key != 'field_id' and key != 'field_value' and value:
            try:
                fid = int(key.replace('field_', ''))
                submissions_qs = submissions_qs.filter(values__field_id=fid, values__value__icontains=value)
            except ValueError:
                pass

    results = []
    fields = form_obj.fields.all()
    name_field_id = None
    email_field_id = None
    
    for f in fields:
        label_lower = f.label.lower()
        if not name_field_id and ("name" in label_lower or "user" in label_lower or "submitter" in label_lower):
            name_field_id = str(f.id)
        if not email_field_id and ("email" in label_lower or f.field_type == "email"):
            email_field_id = str(f.id)
            
    for s in submissions_qs:
        data = {}
        for val in s.values.all():
            data[str(val.field_id)] = val.value

        snapshot_fields = s.form_version.schema_snapshot if s.form_version else []
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
        
        if not name_val:
            for key, val in data.items():
                if isinstance(val, str) and len(val) > 2 and "@" not in val:
                    name_val = val
                    break
        if not email_val:
            for key, val in data.items():
                if isinstance(val, str) and "@" in val:
                    email_val = val
                    break

        # Attach file references list
        file_refs = []
        for f_ref in s.files.all():
            file_refs.append({
                "field_id": f_ref.field_id,
                "file_name": f_ref.file_name,
                "file_url": f_ref.file_url
            })

        results.append({
            "id": s.id,
            "response_id": s.response_id,
            "submitted_at": s.submitted_at,
            "name": name_val or "Anonymous",
            "email": email_val or "N/A",
            "submitted_data": data,
            "version": s.form_version.version if s.form_version else 1,
            "status": s.status,
            "completion_time": s.completion_time,
            "file_references": file_refs
        })

    paginate = request.GET.get('paginate') == 'true' or 'page' in request.GET
    if paginate:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 10))
        total_count = len(results)
        start = (page - 1) * page_size
        end = start + page_size
        results_page = results[start:end]
        return Response({
            "count": total_count,
            "results": results_page,
            "page": page,
            "page_size": page_size
        }, status=status.HTTP_200_OK)
    else:
        return Response(results, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def export_responses(request, form_id):
    form_obj = get_object_or_404(Form, id=form_id)
    
    user = request.user
    if user.is_anonymous:
        token_key = request.GET.get('token')
        if token_key:
            from rest_framework.authtoken.models import Token
            try:
                token = Token.objects.get(key=token_key)
                user = token.user
            except Token.DoesNotExist:
                pass

    if form_obj.owner and form_obj.owner != user:
        return HttpResponse("Unauthorized", status=403)

    submissions_qs = form_obj.submissions.all().order_by('-submitted_at')

    # Apply same filters
    show_archived = request.GET.get('show_archived') == 'true'
    if not show_archived:
        submissions_qs = submissions_qs.filter(is_archived=False)

    status_param = request.GET.get('status')
    if status_param:
        submissions_qs = submissions_qs.filter(status=status_param)

    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    if start_date:
        submissions_qs = submissions_qs.filter(submitted_at__date__gte=start_date)
    if end_date:
        submissions_qs = submissions_qs.filter(submitted_at__date__lte=end_date)

    search_query = request.GET.get('search')
    if search_query:
        submissions_qs = submissions_qs.filter(values__value__icontains=search_query).distinct()

    for key, value in request.GET.items():
        if key.startswith('field_') and key != 'field_id' and key != 'field_value' and value:
            try:
                fid = int(key.replace('field_', ''))
                submissions_qs = submissions_qs.filter(values__field_id=fid, values__value__icontains=value)
            except ValueError:
                pass

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="form_{form_id}_responses.csv"'

    writer = csv.writer(response)
    
    fields_headers = []
    field_ids = []
    
    fields = form_obj.fields.all().order_by('display_order')
    for f in fields:
        fields_headers.append(f.label)
        field_ids.append(str(f.id))

    if not fields.exists() and submissions_qs.exists():
        first_s = submissions_qs.first()
        if first_s.form_version:
            for sf in first_s.form_version.schema_snapshot:
                fields_headers.append(sf.get("label"))
                field_ids.append(str(sf.get("id")))

    # CSV Header Row
    writer.writerow(["Response ID", "Submission Date", "Status"] + fields_headers)

    # Write Data rows
    for s in submissions_qs:
        data = {}
        for val in s.values.all():
            data[str(val.field_id)] = val.value

        row_fields = []
        for fid in field_ids:
            val = data.get(fid)
            if isinstance(val, list):
                val = ", ".join(map(str, val))
            row_fields.append(val if val is not None else "")
        writer.writerow([s.response_id, s.submitted_at.strftime('%Y-%m-%d %H:%M:%S'), s.status] + row_fields)

    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def export_responses_json(request, form_id):
    form_obj = get_object_or_404(Form, id=form_id)
    
    user = request.user
    if user.is_anonymous:
        token_key = request.GET.get('token')
        if token_key:
            from rest_framework.authtoken.models import Token
            try:
                token = Token.objects.get(key=token_key)
                user = token.user
            except Token.DoesNotExist:
                pass

    if form_obj.owner and form_obj.owner != user:
        return HttpResponse("Unauthorized", status=403)

    submissions_qs = form_obj.submissions.all().order_by('-submitted_at')

    # Apply same filters
    show_archived = request.GET.get('show_archived') == 'true'
    if not show_archived:
        submissions_qs = submissions_qs.filter(is_archived=False)

    status_param = request.GET.get('status')
    if status_param:
        submissions_qs = submissions_qs.filter(status=status_param)

    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    if start_date:
        submissions_qs = submissions_qs.filter(submitted_at__date__gte=start_date)
    if end_date:
        submissions_qs = submissions_qs.filter(submitted_at__date__lte=end_date)

    search_query = request.GET.get('search')
    if search_query:
        submissions_qs = submissions_qs.filter(values__value__icontains=search_query).distinct()

    for key, value in request.GET.items():
        if key.startswith('field_') and key != 'field_id' and key != 'field_value' and value:
            try:
                fid = int(key.replace('field_', ''))
                submissions_qs = submissions_qs.filter(values__field_id=fid, values__value__icontains=value)
            except ValueError:
                pass

    results = []
    fields = form_obj.fields.all().order_by('display_order')
    field_map = {str(f.id): f.label for f in fields}

    if not fields.exists() and submissions_qs.exists():
        first_s = submissions_qs.first()
        if first_s.form_version:
            for sf in first_s.form_version.schema_snapshot:
                field_map[str(sf.get("id"))] = sf.get("label")

    for s in submissions_qs:
        data = {
            "Response ID": s.response_id,
            "Submission Date": s.submitted_at.strftime('%Y-%m-%d %H:%M:%S'),
            "Status": s.status
        }
        for val in s.values.all():
            label = field_map.get(str(val.field_id), f"Field_{val.field_id}")
            data[label] = val.value
        results.append(data)

    import json
    response = HttpResponse(json.dumps(results, indent=2), content_type='application/json')
    response['Content-Disposition'] = f'attachment; filename="form_{form_id}_responses.json"'
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def get_analytics(request, form_id):
    form_obj = get_object_or_404(Form, id=form_id)
    
    if form_obj.owner and form_obj.owner != request.user:
        return Response(
            {"detail": "You do not have permission to view analytics for this form."},
            status=status.HTTP_403_FORBIDDEN
        )

    completed_submissions = form_obj.submissions.filter(status='Completed', is_archived=False).count()
    started_submissions = max(form_obj.started_count, form_obj.submissions.filter(is_archived=False).count())
    completion_rate = round((completed_submissions / started_submissions) * 100, 2) if started_submissions > 0 else 100.0
    
    avg_time = form_obj.submissions.filter(status='Completed', is_archived=False, completion_time__isnull=False).aggregate(avg_time=models.Avg('completion_time'))['avg_time']
    average_completion_time = round(avg_time, 1) if avg_time is not None else 0

    field_distributions = {}
    
    fields = form_obj.fields.all()
    if not fields.exists():
        latest_version = form_obj.versions.order_by('-version').first()
        if latest_version:
            for sf in latest_version.schema_snapshot:
                label = sf.get("label")
                fid = sf.get("id")
                ftype = sf.get("field_type")
                if label and ftype in ('dropdown', 'checkbox', 'rating', 'radio'):
                    dist = {}
                    vals = ResponseValue.objects.filter(submission__form=form_obj, submission__is_archived=False, field_id=fid)
                    for val_obj in vals:
                        val = val_obj.value
                        if val is not None:
                            if isinstance(val, list):
                                for item in val:
                                    item_str = str(item)
                                    dist[item_str] = dist.get(item_str, 0) + 1
                            else:
                                val_str = str(val)
                                dist[val_str] = dist.get(val_str, 0) + 1
                    field_distributions[label] = dist
    else:
        for f in fields:
            if f.field_type in ('dropdown', 'checkbox', 'rating', 'radio'):
                dist = {}
                vals = ResponseValue.objects.filter(submission__form=form_obj, submission__is_archived=False, field_id=f.id)
                for val_obj in vals:
                    val = val_obj.value
                    if val is not None:
                        if isinstance(val, list):
                            for item in val:
                                item_str = str(item)
                                dist[item_str] = dist.get(item_str, 0) + 1
                        else:
                            val_str = str(val)
                            dist[val_str] = dist.get(val_str, 0) + 1
                field_distributions[f.label] = dist

    from django.db.models.functions import TruncDate
    from django.db.models import Count
    daily_qs = form_obj.submissions.filter(status='Completed', is_archived=False)\
        .annotate(date=TruncDate('submitted_at'))\
        .values('date')\
        .annotate(count=Count('id'))\
        .order_by('date')
    daily_submissions = []
    for item in daily_qs:
        if item['date']:
            daily_submissions.append({
                "date": item['date'].strftime('%Y-%m-%d'),
                "count": item['count']
            })

    return Response({
        "total_submissions": completed_submissions,
        "started_submissions": started_submissions,
        "completed_submissions": completed_submissions,
        "completion_rate": completion_rate,
        "average_completion_time": average_completion_time,
        "field_distributions": field_distributions,
        "daily_submissions": daily_submissions
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_delete_responses(request, form_id):
    form_obj = get_object_or_404(Form, id=form_id)
    if form_obj.owner and form_obj.owner != request.user:
        return Response({"detail": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
    submission_ids = request.data.get('submission_ids', [])
    if not submission_ids:
        return Response({"detail": "No submissions selected"}, status=status.HTTP_400_BAD_REQUEST)
        
    submissions_to_delete = Submission.objects.filter(form=form_obj, id__in=submission_ids)
    deleted_count = submissions_to_delete.count()
    submissions_to_delete.delete()
    
    from .models import AuditLog
    AuditLog.objects.create(
        user=request.user,
        action="bulk_delete_responses",
        target=form_obj.title,
        context={"count": deleted_count, "submission_ids": submission_ids}
    )
    
    return Response({"deleted_count": deleted_count}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def duplicate_form(request, form_id):
    form_obj = get_object_or_404(Form, id=form_id)
    if form_obj.owner and form_obj.owner != request.user:
        return Response({"detail": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
    import secrets
    while True:
        slug = secrets.token_urlsafe(8).lower().replace("_", "-").replace("~", "-")
        if not Form.objects.filter(share_slug=slug).exists():
            break

    new_form = Form.objects.create(
        owner=request.user,
        title=f"Copy of {form_obj.title}",
        description=form_obj.description,
        status='Draft',
        current_version=1,
        share_slug=slug,
        retention_days=form_obj.retention_days
    )

    field_mapping = {}
    for original_field in form_obj.fields.all():
        new_field = Field.objects.create(
            form=new_form,
            label=original_field.label,
            field_type=original_field.field_type,
            required=original_field.required,
            placeholder=original_field.placeholder,
            options=original_field.options,
            validation_rules=original_field.validation_rules,
            display_order=original_field.display_order
        )
        field_mapping[original_field.id] = new_field

    for original_rule in form_obj.conditional_rules.all():
        new_trigger = field_mapping.get(original_rule.trigger_field_id)
        new_target = field_mapping.get(original_rule.target_field_id)
        if new_trigger and new_target:
            from .models import ConditionalRule
            ConditionalRule.objects.create(
                form=new_form,
                trigger_field=new_trigger,
                operator=original_rule.operator,
                comparison_value=original_rule.comparison_value,
                target_field=new_target,
                action=original_rule.action
            )

    from .models import AuditLog
    AuditLog.objects.create(
        user=request.user,
        action="duplicate_form",
        target=form_obj.title,
        context={"new_form_id": new_form.id, "new_title": new_form.title}
    )

    from .serializers import FormSerializer
    return Response(FormSerializer(new_form).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_retention_policy(request, form_id):
    form_obj = get_object_or_404(Form, id=form_id)
    if form_obj.owner and form_obj.owner != request.user:
        return Response({"detail": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
    retention_days = request.data.get('retention_days')
    if retention_days is not None:
        try:
            form_obj.retention_days = int(retention_days) if retention_days != "" else None
            form_obj.save(update_fields=['retention_days'])
        except ValueError:
            return Response({"detail": "Invalid retention days"}, status=status.HTTP_400_BAD_REQUEST)

    archived_count = 0
    if form_obj.retention_days is not None:
        from django.utils import timezone
        cutoff_date = timezone.now() - timezone.timedelta(days=form_obj.retention_days)
        archived_count = form_obj.submissions.filter(submitted_at__lt=cutoff_date, is_archived=False).update(is_archived=True)
        
        from .models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action="apply_retention_policy",
            target=form_obj.title,
            context={"archived_count": archived_count, "retention_days": form_obj.retention_days}
        )

    return Response({
        "message": f"Retention policy applied. {archived_count} submissions archived.",
        "retention_days": form_obj.retention_days,
        "archived_count": archived_count
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_audit_logs(request):
    from .models import AuditLog
    logs = AuditLog.objects.filter(user=request.user).order_by('-timestamp')
    results = []
    for l in logs:
        results.append({
            "id": l.id,
            "action": l.action,
            "target": l.target,
            "timestamp": l.timestamp,
            "context": l.context,
            "username": l.user.username if l.user else "System"
        })
    return Response(results, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_generate(request):
    prompt = request.data.get('prompt')
    if not prompt or not prompt.strip():
        return Response({"detail": "Prompt is required."}, status=status.HTTP_400_BAD_REQUEST)

    from .ai_service import generate_form_schema
    try:
        schema = generate_form_schema(prompt)
        
        # Create Form draft
        import secrets
        while True:
            slug = secrets.token_urlsafe(8).lower().replace("_", "-").replace("~", "-")
            if not Form.objects.filter(share_slug=slug).exists():
                break
        
        form_obj = Form.objects.create(
            owner=request.user,
            title=schema.get("title", "AI Generated Form"),
            description=schema.get("description", ""),
            status='Draft',
            share_slug=slug,
            current_version=1
        )
        
        # Create Fields
        fields_data = schema.get("fields", [])
        for idx, field in enumerate(fields_data):
            Field.objects.create(
                form=form_obj,
                label=field.get("label", "Field"),
                field_type=field.get("field_type", "text"),
                required=field.get("required", False),
                placeholder=field.get("placeholder", ""),
                options=field.get("options", []),
                display_order=idx
            )
            
        AuditLog.objects.create(
            user=request.user,
            action="ai_generate",
            target=form_obj.title,
            context={"prompt": prompt}
        )
        
        return Response(FormSerializer(form_obj).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"detail": f"AI Generation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def one_time_tokens(request, form_id):
    form_obj = get_object_or_404(Form, id=form_id)
    if form_obj.owner and form_obj.owner != request.user:
        return Response({"detail": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
    from .models import OneTimeToken
    
    if request.method == 'POST':
        import secrets
        token_val = secrets.token_urlsafe(24)
        expires_days = request.data.get('expires_days')
        
        expires_at = None
        if expires_days:
            from django.utils import timezone
            expires_at = timezone.now() + timezone.timedelta(days=int(expires_days))
            
        token_obj = OneTimeToken.objects.create(
            form=form_obj,
            token=token_val,
            status='Active',
            expires_at=expires_at,
            created_by=request.user
        )
        
        AuditLog.objects.create(
            user=request.user,
            action="generate_one_time_token",
            target=form_obj.title,
            context={"token": token_val}
        )
        
        return Response({
            "token": token_obj.token,
            "status": token_obj.status,
            "created_at": token_obj.created_at,
            "expires_at": token_obj.expires_at
        }, status=status.HTTP_201_CREATED)
        
    elif request.method == 'GET':
        tokens = form_obj.one_time_tokens.all().order_by('-created_at')
        results = []
        for t in tokens:
            if t.status == 'Active' and t.expires_at:
                from django.utils import timezone
                if timezone.now() > t.expires_at:
                    t.status = 'Expired'
                    t.save(update_fields=['status'])
            results.append({
                "token": t.token,
                "status": t.status,
                "created_at": t.created_at,
                "expires_at": t.expires_at,
                "used_at": t.used_at
            })
        return Response(results, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def revoke_one_time_token(request, form_id, token):
    form_obj = get_object_or_404(Form, id=form_id)
    if form_obj.owner and form_obj.owner != request.user:
        return Response({"detail": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
    from .models import OneTimeToken
    token_obj = get_object_or_404(OneTimeToken, form=form_obj, token=token)
    
    if token_obj.status == 'Active':
        token_obj.status = 'Revoked'
        token_obj.save(update_fields=['status'])
        
        AuditLog.objects.create(
            user=request.user,
            action="revoke_one_time_token",
            target=form_obj.title,
            context={"token": token}
        )
        
    return Response({"message": "Token revoked successfully."}, status=status.HTTP_200_OK)
