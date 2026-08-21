import os
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import transaction
from django.utils import timezone
from .models import Form, Field, FormVersion, ConditionalRule, Submission, ResponseValue, UploadedFileReference

class Module2TestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='test_admin', password='secure_password123')
        self.client.login(username='test_admin', password='secure_password123')

        # Create a form
        self.form = Form.objects.create(
            owner=self.user,
            title="Employment Survey",
            description="Survey form",
            status="Draft",
            current_version=1,
            share_slug="employment-survey"
        )

        # Create fields
        # Field 1: Married (Dropdown: Yes/No)
        self.field_married = Field.objects.create(
            form=self.form,
            label="Are you married?",
            field_type="dropdown",
            required=True,
            options=["Yes", "No"],
            display_order=0
        )
        # Field 2: Spouse Name (Text, dependent on Married)
        self.field_spouse = Field.objects.create(
            form=self.form,
            label="Spouse Name",
            field_type="text",
            required=False,
            validation_rules={"min_length": 3, "max_length": 20},
            display_order=1
        )
        # Field 3: Email
        self.field_email = Field.objects.create(
            form=self.form,
            label="Email Address",
            field_type="email",
            required=True,
            display_order=2
        )
        # Field 4: Age (Number)
        self.field_age = Field.objects.create(
            form=self.form,
            label="Your Age",
            field_type="number",
            required=False,
            validation_rules={"min_value": 18, "max_value": 65},
            display_order=3
        )
        # Field 5: Birthday (Date)
        self.field_birthday = Field.objects.create(
            form=self.form,
            label="Birthday",
            field_type="date",
            required=False,
            display_order=4
        )
        # Field 6: Resume (File)
        self.field_resume = Field.objects.create(
            form=self.form,
            label="Resume Attachment",
            field_type="file",
            required=False,
            display_order=5
        )

        # Create conditional rules
        # IF Married = Yes THEN Show Spouse Name
        self.rule_show_spouse = ConditionalRule.objects.create(
            form=self.form,
            trigger_field=self.field_married,
            operator="equals",
            comparison_value="Yes",
            target_field=self.field_spouse,
            action="show"
        )
        # IF Married = Yes THEN Require Spouse Name
        self.rule_require_spouse = ConditionalRule.objects.create(
            form=self.form,
            trigger_field=self.field_married,
            operator="equals",
            comparison_value="Yes",
            target_field=self.field_spouse,
            action="require"
        )

    def test_invalid_uuid_slug(self):
        response = self.client.get('/api/public/non-existent-slug')
        self.assertEqual(response.status_code, 404)

    def test_unpublished_form(self):
        # Submission on draft form should be rejected
        payload = {
            "submitted_data": {
                str(self.field_married.id): "No",
                str(self.field_email.id): "test@example.com"
            }
        }
        response = self.client.post('/api/public/employment-survey/submit', payload, content_type='application/json')
        self.assertEqual(response.status_code, 403)

    def publish_form_helper(self):
        self.client.post(f'/api/forms/{self.form.id}/publish')
        self.form.refresh_from_db()

    def test_missing_required_field(self):
        self.publish_form_helper()
        # Email field is required but missing
        payload = {
            "submitted_data": {
                str(self.field_married.id): "No"
            }
        }
        response = self.client.post('/api/public/employment-survey/submit', payload, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("required", str(response.json()['errors'][str(self.field_email.id)]))

    def test_invalid_email(self):
        self.publish_form_helper()
        payload = {
            "submitted_data": {
                str(self.field_married.id): "No",
                str(self.field_email.id): "invalid-email-address"
            }
        }
        response = self.client.post('/api/public/employment-survey/submit', payload, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("valid email address", str(response.json()['errors'][str(self.field_email.id)]))

    def test_number_outside_range(self):
        self.publish_form_helper()
        # Age under min_value
        payload = {
            "submitted_data": {
                str(self.field_married.id): "No",
                str(self.field_email.id): "valid@email.com",
                str(self.field_age.id): 15
            }
        }
        response = self.client.post('/api/public/employment-survey/submit', payload, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("at least 18", str(response.json()['errors'][str(self.field_age.id)]))

        # Age over max_value
        payload = {
            "submitted_data": {
                str(self.field_married.id): "No",
                str(self.field_email.id): "valid@email.com",
                str(self.field_age.id): 70
            }
        }
        response = self.client.post('/api/public/employment-survey/submit', payload, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("cannot exceed 65", str(response.json()['errors'][str(self.field_age.id)]))

    def test_invalid_dropdown_option(self):
        self.publish_form_helper()
        payload = {
            "submitted_data": {
                str(self.field_married.id): "Maybe",  # Not in ["Yes", "No"]
                str(self.field_email.id): "valid@email.com"
            }
        }
        response = self.client.post('/api/public/employment-survey/submit', payload, content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_string_too_short_or_too_long(self):
        self.publish_form_helper()
        # Married: Yes -> Spouse name required (min_length=3, max_length=20)
        # 1. Spouse Name too short
        payload = {
            "submitted_data": {
                str(self.field_married.id): "Yes",
                str(self.field_spouse.id): "Jo",
                str(self.field_email.id): "valid@email.com"
            }
        }
        response = self.client.post('/api/public/employment-survey/submit', payload, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("at least 3 characters", str(response.json()['errors'][str(self.field_spouse.id)]))

        # 2. Spouse Name too long
        payload = {
            "submitted_data": {
                str(self.field_married.id): "Yes",
                str(self.field_spouse.id): "JosephineBernadetteMellisa",
                str(self.field_email.id): "valid@email.com"
            }
        }
        response = self.client.post('/api/public/employment-survey/submit', payload, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("cannot exceed 20 characters", str(response.json()['errors'][str(self.field_spouse.id)]))

    def test_invalid_date_format(self):
        self.publish_form_helper()
        payload = {
            "submitted_data": {
                str(self.field_married.id): "No",
                str(self.field_email.id): "valid@email.com",
                str(self.field_birthday.id): "12-31-1990"  # Expect YYYY-MM-DD
            }
        }
        response = self.client.post('/api/public/employment-survey/submit', payload, content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_conditional_rule_true_flow(self):
        self.publish_form_helper()
        # Trigger: Married = "Yes" -> Spouse is required.
        # If Spouse name is empty, it fails
        payload = {
            "submitted_data": {
                str(self.field_married.id): "Yes",
                str(self.field_spouse.id): "",
                str(self.field_email.id): "valid@email.com"
            }
        }
        response = self.client.post('/api/public/employment-survey/submit', payload, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("required", str(response.json()['errors'][str(self.field_spouse.id)]))

        # If Spouse name is filled correctly, it succeeds
        payload = {
            "submitted_data": {
                str(self.field_married.id): "Yes",
                str(self.field_spouse.id): "Jane Doe",
                str(self.field_email.id): "valid@email.com"
            }
        }
        response = self.client.post('/api/public/employment-survey/submit', payload, content_type='application/json')
        self.assertEqual(response.status_code, 201)

    def test_conditional_rule_false_flow(self):
        self.publish_form_helper()
        # Trigger: Married = "No" -> Spouse Name is hidden.
        # If value is sent for Spouse Name anyway, reject it!
        payload = {
            "submitted_data": {
                str(self.field_married.id): "No",
                str(self.field_spouse.id): "Jane Doe",
                str(self.field_email.id): "valid@email.com"
            }
        }
        response = self.client.post('/api/public/employment-survey/submit', payload, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("hidden", str(response.json()['errors'][str(self.field_spouse.id)]))

    def test_file_upload_type_and_size(self):
        # 1. Invalid type
        file_txt = SimpleUploadedFile("resume.txt", b"plain text content")
        response = self.client.post('/api/public/upload', {'file': file_txt})
        self.assertEqual(response.status_code, 400)
        self.assertIn("not supported", response.json()['detail'])

        # 2. File size too large (> 5 MB)
        large_content = b"a" * (5 * 1024 * 1024 + 100) # just over 5 MB
        file_large = SimpleUploadedFile("photo.png", large_content, content_type="image/png")
        response = self.client.post('/api/public/upload', {'file': file_large})
        self.assertEqual(response.status_code, 400)
        self.assertIn("exceeds the 5 MB limit", response.json()['detail'])

        # 3. Valid file
        file_png = SimpleUploadedFile("resume.png", b"image content", content_type="image/png")
        response = self.client.post('/api/public/upload', {'file': file_png})
        self.assertEqual(response.status_code, 201)
        self.assertIn("file_url", response.json())

    def test_submission_and_response_value_records(self):
        self.publish_form_helper()
        payload = {
            "submitted_data": {
                str(self.field_married.id): "No",
                str(self.field_email.id): "john@example.com",
                str(self.field_resume.id): "/media/uploads/123_resume.pdf"
            }
        }
        response = self.client.post('/api/public/employment-survey/submit', payload, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        resp_id = response.json()['response_id']
        self.assertTrue(resp_id.startswith("RESP-"))

        # Verify database persistency
        submission = Submission.objects.get(response_id=resp_id)
        self.assertEqual(submission.form, self.form)

        # Response Values
        val_married = ResponseValue.objects.get(submission=submission, field_id=self.field_married.id)
        self.assertEqual(val_married.value, "No")

        val_email = ResponseValue.objects.get(submission=submission, field_id=self.field_email.id)
        self.assertEqual(val_email.value, "john@example.com")

        # File references
        file_ref = UploadedFileReference.objects.get(submission=submission, field_id=self.field_resume.id)
        self.assertEqual(file_ref.file_name, "resume.pdf")

    def test_transaction_rollback(self):
        self.publish_form_helper()
        # Construct payload
        payload = {
            "submitted_data": {
                str(self.field_married.id): "No",
                str(self.field_email.id): "rollback@example.com"
            }
        }

        # Mock ResponseValue.objects.create to force an exception
        from unittest.mock import patch
        with patch('forms.models.ResponseValue.objects.create', side_effect=Exception("Database crash!")):
            response = self.client.post('/api/public/employment-survey/submit', payload, content_type='application/json')
            self.assertEqual(response.status_code, 500)
            
            # Verify no Submission record was committed to the DB
            self.assertFalse(Submission.objects.filter(form=self.form).exists())

    def test_milestone3_features(self):
        # 1. Login user to get auth token
        self.client.login(username='testuser', password='testpassword')
        
        # 2. Test Form Duplication
        response = self.client.post(f'/api/forms/{self.form.id}/duplicate')
        self.assertEqual(response.status_code, 201)
        dup_data = response.json()
        self.assertIn("Copy of", dup_data['title'])
        self.assertEqual(dup_data['status'], 'Draft')
        
        # Verify fields and rules were duplicated
        dup_form = Form.objects.get(id=dup_data['id'])
        self.assertEqual(dup_form.fields.count(), self.form.fields.count())
        self.assertEqual(dup_form.conditional_rules.count(), self.form.conditional_rules.count())

        # 3. Test Analytics (initial state)
        response = self.client.get(f'/api/forms/{self.form.id}/analytics')
        self.assertEqual(response.status_code, 200)
        analytics_data = response.json()
        self.assertEqual(analytics_data['total_submissions'], 0)
        self.assertEqual(analytics_data['started_submissions'], 0)
        self.assertEqual(analytics_data['completion_rate'], 100.0)

        # 4. Test Submission tracking
        # Load form (simulates a view / started submission)
        self.publish_form_helper()
        response = self.client.get('/api/public/employment-survey')
        self.assertEqual(response.status_code, 200)
        resp_id = response.json().get('response_id')
        self.assertIsNotNone(resp_id)
        
        # Submit response referencing response_id
        payload = {
            "response_id": resp_id,
            "submitted_data": {
                str(self.field_married.id): "No",
                str(self.field_email.id): "submitter@email.com"
            }
        }
        response = self.client.post('/api/public/employment-survey/submit', payload, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        
        # Load analytics again and verify
        response = self.client.get(f'/api/forms/{self.form.id}/analytics')
        self.assertEqual(response.status_code, 200)
        analytics_data = response.json()
        self.assertEqual(analytics_data['total_submissions'], 1)
        self.assertEqual(analytics_data['started_submissions'], 1)
        self.assertEqual(analytics_data['completion_rate'], 100.0)

        # 5. Test exports
        # CSV Export
        response = self.client.get(f'/api/forms/{self.form.id}/export')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/csv')
        
        # JSON Export
        response = self.client.get(f'/api/forms/{self.form.id}/export/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        json_export = response.json()
        self.assertEqual(len(json_export), 1)
        self.assertEqual(json_export[0]['Response ID'], resp_id)

        # 6. Test Retention Policy Configuration
        payload = {"retention_days": 30}
        response = self.client.post(f'/api/forms/{self.form.id}/retention', payload, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['retention_days'], 30)

        # 7. Test Bulk Response Deletion
        submission = Submission.objects.get(response_id=resp_id)
        payload = {"submission_ids": [submission.id]}
        response = self.client.post(f'/api/forms/{self.form.id}/responses/bulk-delete', payload, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['deleted_count'], 1)
        self.assertFalse(Submission.objects.filter(id=submission.id).exists())

        # 8. Test Audit Logs
        response = self.client.get('/api/audit-logs')
        self.assertEqual(response.status_code, 200)
        logs = response.json()
        self.assertTrue(len(logs) >= 3) # duplicated form, apply retention, bulk delete
        actions = [log['action'] for log in logs]
        self.assertIn("duplicate_form", actions)
        self.assertIn("apply_retention_policy", actions)
        self.assertIn("bulk_delete_responses", actions)
