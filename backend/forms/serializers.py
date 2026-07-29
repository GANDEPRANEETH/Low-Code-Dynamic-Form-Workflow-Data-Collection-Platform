import secrets
from rest_framework import serializers
from .models import Form, Field, FormVersion

class FieldSerializer(serializers.ModelSerializer):
    # Enable explicit form id in fields, but allow it to be optional for creation through nested paths
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
    # Nest fields list, ordered by display_order
    fields = serializers.SerializerMethodField(method_name='get_form_fields')

    class Meta:
        model = Form
        fields = [
            'id', 'title', 'description', 'status', 
            'current_version', 'share_slug', 'created_at', 'updated_at', 'fields'
        ]
        read_only_fields = ['id', 'status', 'current_version', 'share_slug', 'created_at', 'updated_at']

    def get_form_fields(self, obj):
        # Retrieve associated fields sorted by display_order
        ordered_fields = obj.fields.all().order_by('display_order')
        return FieldSerializer(ordered_fields, many=True).data

    def create(self, validated_data):
        # Generate unique slug
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
