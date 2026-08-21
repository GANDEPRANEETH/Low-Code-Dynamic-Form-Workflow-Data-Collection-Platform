import secrets
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Form, Field, FormVersion, Response

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class FieldSerializer(serializers.ModelSerializer):
    form_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Field
        fields = [
            'id', 'form_id', 'label', 'field_type', 'required', 
            'placeholder', 'options', 'validation_rules', 'display_order'
        ]

    def validate_field_type(self, value):
        valid_types = {'text', 'number', 'email', 'dropdown', 'checkbox', 'date', 'file', 'rating'}
        if value.lower() not in valid_types:
            raise serializers.ValidationError(f"Invalid field type. Must be one of: {valid_types}")
        return value.lower()

class FormSerializer(serializers.ModelSerializer):
    fields = serializers.SerializerMethodField(method_name='get_form_fields')
    owner = UserSerializer(read_only=True)

    class Meta:
        model = Form
        fields = [
            'id', 'owner', 'title', 'description', 'status', 
            'current_version', 'share_slug', 'created_at', 'updated_at', 'fields',
            'started_count', 'retention_days'
        ]
        read_only_fields = ['id', 'owner', 'status', 'current_version', 'share_slug', 'created_at', 'updated_at', 'started_count']

    def get_form_fields(self, obj):
        ordered_fields = obj.fields.all().order_by('display_order')
        return FieldSerializer(ordered_fields, many=True).data

    def create(self, validated_data):
        while True:
            slug = secrets.token_urlsafe(8).lower().replace("_", "-").replace("~", "-")
            if not Form.objects.filter(share_slug=slug).exists():
                break
        validated_data['share_slug'] = slug
        validated_data['status'] = 'Draft'
        validated_data['current_version'] = 1
        return super().create(validated_data)

class FormVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormVersion
        fields = ['id', 'form', 'version', 'schema_snapshot', 'published_at']
        read_only_fields = ['id', 'published_at']

class ResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Response
        fields = ['id', 'form', 'form_version', 'submitted_data', 'submitted_at']
        read_only_fields = ['id', 'submitted_at']
