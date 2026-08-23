from django.db import models
from django.contrib.auth.models import User

class Form(models.Model):
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Published', 'Published'),
        ('Archived', 'Archived'),
    ]

    owner = models.ForeignKey(User, related_name='forms', on_delete=models.CASCADE, null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    current_version = models.IntegerField(default=1)
    share_slug = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_count = models.IntegerField(default=0)
    retention_days = models.IntegerField(null=True, blank=True)
    publish_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    max_submissions = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.title

class Field(models.Model):
    form = models.ForeignKey(Form, related_name='fields', on_delete=models.CASCADE)
    label = models.CharField(max_length=255)
    field_type = models.CharField(max_length=50)  # text, number, email, dropdown, checkbox, date, file, rating
    required = models.BooleanField(default=False)
    placeholder = models.CharField(max_length=255, blank=True, null=True)
    options = models.JSONField(default=list, blank=True, null=True)  # List of options (choices)
    validation_rules = models.JSONField(default=dict, blank=True, null=True)  # min_value, max_value, etc.
    display_order = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.label} ({self.field_type})"

class FormVersion(models.Model):
    form = models.ForeignKey(Form, related_name='versions', on_delete=models.CASCADE)
    version = models.IntegerField()
    schema_snapshot = models.JSONField()  # JSON representation of all fields
    conditional_rules_snapshot = models.JSONField(default=list, blank=True, null=True)
    published_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.form.title} - v{self.version}"

class Response(models.Model):
    form = models.ForeignKey(Form, related_name='responses', on_delete=models.CASCADE)
    form_version = models.ForeignKey(FormVersion, related_name='responses', on_delete=models.SET_NULL, null=True)
    submitted_data = models.JSONField(default=dict)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Response to {self.form.title} at {self.submitted_at}"

class ConditionalRule(models.Model):
    OPERATOR_CHOICES = [
        ('equals', 'equals'),
        ('not_equals', 'not_equals'),
        ('contains', 'contains'),
        ('greater_than', 'greater_than'),
        ('is_empty', 'is_empty'),
    ]
    ACTION_CHOICES = [
        ('show', 'show'),
        ('hide', 'hide'),
        ('require', 'require'),
    ]
    form = models.ForeignKey(Form, related_name='conditional_rules', on_delete=models.CASCADE)
    trigger_field = models.ForeignKey(Field, related_name='trigger_rules', on_delete=models.CASCADE)
    operator = models.CharField(max_length=20, choices=OPERATOR_CHOICES)
    comparison_value = models.CharField(max_length=255, blank=True, null=True)
    target_field = models.ForeignKey(Field, related_name='target_rules', on_delete=models.CASCADE)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)

    def __str__(self):
        return f"IF {self.trigger_field.label} {self.operator} {self.comparison_value} THEN {self.action} {self.target_field.label}"

class Submission(models.Model):
    form = models.ForeignKey(Form, related_name='submissions', on_delete=models.CASCADE)
    form_version = models.ForeignKey(FormVersion, related_name='submissions', on_delete=models.SET_NULL, null=True)
    response_id = models.CharField(max_length=50, unique=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='Completed')  # Completed, Started
    completion_time = models.IntegerField(null=True, blank=True)  # in seconds
    is_archived = models.BooleanField(default=False)

    def __str__(self):
        return f"Submission {self.response_id} to {self.form.title}"

class ResponseValue(models.Model):
    submission = models.ForeignKey(Submission, related_name='values', on_delete=models.CASCADE)
    field_id = models.IntegerField()
    value = models.JSONField(blank=True, null=True)

    def __str__(self):
        return f"Value for field {self.field_id}: {self.value}"

class UploadedFileReference(models.Model):
    submission = models.ForeignKey(Submission, related_name='files', on_delete=models.CASCADE)
    field_id = models.IntegerField()
    file_name = models.CharField(max_length=255)
    file_url = models.CharField(max_length=1024)

    def __str__(self):
        return f"File {self.file_name} for field {self.field_id}"

class AuditLog(models.Model):
    user = models.ForeignKey(User, related_name='audit_logs', on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=255)
    target = models.CharField(max_length=255, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    context = models.JSONField(default=dict, blank=True, null=True)

    def __str__(self):
        return f"{self.user.username if self.user else 'System'} - {self.action} on {self.target} at {self.timestamp}"

class OneTimeToken(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Used', 'Used'),
        ('Expired', 'Expired'),
        ('Revoked', 'Revoked'),
    ]
    form = models.ForeignKey(Form, related_name='one_time_tokens', on_delete=models.CASCADE)
    token = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    used_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Token {self.token} for {self.form.title} ({self.status})"
