from django.db import models

class Form(models.Model):
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Published', 'Published'),
        ('Archived', 'Archived'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    current_version = models.IntegerField(default=1)
    share_slug = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
    published_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.form.title} - v{self.version}"
