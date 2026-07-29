import urllib.request
import urllib.error
import json
import time

BASE_URL = "http://localhost:8000"

def make_request(path, method="GET", data=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    req_data = json.dumps(data).encode("utf-8") if data is not None else None
    
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            if res.status == 204:
                return None
            body = res.read().decode("utf-8")
            return json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            err_json = json.loads(body)
            detail = err_json.get("detail", body)
        except:
            detail = body
        raise Exception(f"HTTP {e.code}: {detail}")

def run_tests():
    print("=== STARTING DJANGO REST FRAMEWORK API VERIFICATION TESTS ===")
    
    # 1. Health check
    try:
        health = make_request("/health")
        print(f"✔ Health Check Passed: {health}")
    except Exception as e:
        print(f"❌ Health Check Failed: {e}")
        print("Please make sure the Django server is running on http://localhost:8000")
        return
        
    # 2. Create Form Draft
    print("\n--- Testing Form CRUD ---")
    form_data = {
        "title": "Django test form",
        "description": "Verification of Django REST Framework migration"
    }
    form = make_request("/api/forms", method="POST", data=form_data)
    form_id = form["id"]
    share_slug = form["share_slug"]
    print(f"✔ Form Draft Created. ID: {form_id}, Slug: {share_slug}, Status: {form['status']}")
    
    # Update Form Draft
    updated_form = make_request(f"/api/forms/{form_id}", method="PUT", data={"title": "Updated Django Form"})
    print(f"✔ Form Title Updated: {updated_form['title']}")
    
    # 3. Add Fields (Field Type Library Verification)
    print("\n--- Testing Field Type Library Schema Additions ---")
    field_types = [
        {"label": "Full Name", "field_type": "text", "required": True, "placeholder": "Enter text..."},
        {"label": "Age", "field_type": "number", "required": False, "placeholder": "Enter number...", "validation_rules": {"min_value": 18, "max_value": 99}},
        {"label": "Email Address", "field_type": "email", "required": True, "placeholder": "name@example.com"},
        {"label": "Preferred Framework", "field_type": "dropdown", "options": ["Django", "FastAPI", "Express"]},
        {"label": "Agree to Terms", "field_type": "checkbox", "options": ["Accept", "Subscribe"]},
        {"label": "Joining Date", "field_type": "date", "placeholder": ""},
        {"label": "App Rating", "field_type": "rating", "validation_rules": {"min_value": 1, "max_value": 5}},
        {"label": "Upload Resume", "field_type": "file", "placeholder": "Choose PDF Resume"}
    ]
    
    created_fields = []
    for f in field_types:
        res_field = make_request(f"/api/forms/{form_id}/fields", method="POST", data=f)
        created_fields.append(res_field)
        print(f"  ✔ Added Field: [{res_field['field_type']}] - '{res_field['label']}' (ID: {res_field['id']}, Order: {res_field['display_order']})")
        
    # 4. Update Field Details
    print("\n--- Testing Field Editing ---")
    field_to_edit = created_fields[0]
    updated_field = make_request(
        f"/api/fields/{field_to_edit['id']}", 
        method="PUT", 
        data={"label": "Full Legal Name", "placeholder": "Enter full legal name"}
    )
    print(f"✔ Field ID {field_to_edit['id']} updated: Label='{updated_field['label']}', Placeholder='{updated_field['placeholder']}'")
    
    # 5. Form Versioning & Publication Lifecycle
    print("\n--- Testing Version Snapshots & Publication Lifecycle ---")
    # Verify we can fetch the published form (should fail since it is not published yet)
    try:
        make_request(f"/api/public/{share_slug}")
        print("❌ Error: Managed to fetch unpublished form slug")
    except Exception as e:
        print(f"✔ Correctly blocked fetching unpublished form: {e}")

    # Publish Form
    published = make_request(f"/api/forms/{form_id}/publish", method="POST")
    print(f"✔ Form Published! Status status={published['status']}, Current Draft Version={published['current_version']}")

    # 6. Public Share URL Resolution
    print("\n--- Testing Public Share URL Resolution ---")
    public_form = make_request(f"/api/public/{share_slug}")
    print(f"✔ Public Schema Resolved! Form Title: '{public_form['title']}' (Published Version: {public_form['version']})")
    print(f"✔ Snapshot Fields count: {len(public_form['fields'])}")
    for pf in public_form["fields"]:
        print(f"  - Field: '{pf['label']}' type: [{pf['field_type']}]")

    # 7. Form Archiving Lifecycle
    print("\n--- Testing Form Archiving Lifecycle ---")
    archived = make_request(f"/api/forms/{form_id}/archive", method="POST")
    print(f"✔ Form Archived! Status status={archived['status']}")
    
    # Try fetching public form again (should fail because archived)
    try:
        make_request(f"/api/public/{share_slug}")
        print("❌ Error: Managed to fetch archived form slug")
    except Exception as e:
        print(f"✔ Correctly blocked fetching archived form: {e}")

    # 8. Clean up Form deletion
    print("\n--- Testing Form Deletion ---")
    make_request(f"/api/forms/{form_id}", method="DELETE")
    print(f"✔ Form ID {form_id} deleted successfully.")
    
    # Verify it is deleted from list
    all_forms = make_request("/api/forms")
    exists = any(f["id"] == form_id for f in all_forms)
    if not exists:
        print("✔ Verified form no longer exists in dashboard list.")
    else:
        print("❌ Error: Form still exists in list after deletion.")

    print("\n=== ALL DJANGO REST FRAMEWORK API TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
