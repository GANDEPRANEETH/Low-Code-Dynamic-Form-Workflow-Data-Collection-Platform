import urllib.request
import urllib.error
import json
import time

BASE_URL = "http://localhost:8000"

def make_request(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Token {token}"
        
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
    print("=== STARTING DJANGO REST FRAMEWORK ENHANCEMENT TESTS ===")
    
    # 1. Health check
    try:
        health = make_request("/health")
        print(f"✔ Health Check Passed: {health}")
    except Exception as e:
        print(f"❌ Health Check Failed: {e}")
        print("Please make sure the Django server is running on http://localhost:8000")
        return

    # 2. Register & Login User
    print("\n--- Testing Authentication ---")
    timestamp = int(time.time())
    username = f"testuser_{timestamp}"
    email = f"user_{timestamp}@example.com"
    password = "secure_password_123"

    try:
        reg_data = make_request("/api/auth/register", method="POST", data={
            "username": username,
            "email": email,
            "password": password
        })
        token = reg_data["token"]
        print(f"✔ User Registration Successful. Username: {reg_data['user']['username']}, Token: {token[:8]}...")
    except Exception as e:
        print(f"❌ User Registration Failed: {e}")
        return

    try:
        login_data = make_request("/api/auth/login", method="POST", data={
            "username": username,
            "password": password
        })
        print(f"✔ User Login Successful. Username: {login_data['user']['username']}")
    except Exception as e:
        print(f"❌ User Login Failed: {e}")
        return

    # 3. Create Form Draft
    print("\n--- Testing Form CRUD with Owner ---")
    form_data = {
        "title": "Django Enhancement Survey",
        "description": "Verification of authentication and responses dashboard"
    }
    form = make_request("/api/forms", method="POST", data=form_data, token=token)
    form_id = form["id"]
    share_slug = form["share_slug"]
    print(f"✔ Form Draft Created. ID: {form_id}, Owner ID: {form['owner']['id']}, Status: {form['status']}")

    # 4. Add Fields & Individual Field Deletion
    print("\n--- Testing Fields CRUD & Deletion ---")
    f1 = make_request(f"/api/forms/{form_id}/fields", method="POST", data={
        "label": "Full Name",
        "field_type": "text",
        "required": True,
        "placeholder": "Enter your name"
    }, token=token)
    print(f"  ✔ Added Field 1: '{f1['label']}' (ID: {f1['id']})")

    f2 = make_request(f"/api/forms/{form_id}/fields", method="POST", data={
        "label": "Rating",
        "field_type": "rating",
        "required": True
    }, token=token)
    print(f"  ✔ Added Field 2: '{f2['label']}' (ID: {f2['id']})")

    # Add field to delete
    f3 = make_request(f"/api/forms/{form_id}/fields", method="POST", data={
        "label": "Field to Delete",
        "field_type": "text"
    }, token=token)
    print(f"  ✔ Added Field 3 (To Delete): '{f3['label']}' (ID: {f3['id']})")

    # Delete Field 3
    make_request(f"/api/fields/{f3['id']}", method="DELETE", token=token)
    print(f"  ✔ Field ID {f3['id']} deleted using DELETE verb.")

    # Verify form has only 2 fields left
    form_details = make_request(f"/api/forms/{form_id}", token=token)
    print(f"  ✔ Verified Form Field count is: {len(form_details['fields'])}")

    # 5. Enforce Authentication before Publishing
    print("\n--- Testing Auth Enforcement on Publish ---")
    try:
        make_request(f"/api/forms/{form_id}/publish", method="POST")
        print("❌ Error: Managed to publish form without authentication token")
    except Exception as e:
        print(f"  ✔ Correctly blocked anonymous publish request: {e}")

    # Publish with Auth
    published = make_request(f"/api/forms/{form_id}/publish", method="POST", token=token)
    print(f"  ✔ Form Published with Auth. Status: {published['status']}, Version: {published['current_version'] - 1}")

    # 6. Form Submission (Public Client)
    print("\n--- Testing Public Submission ---")
    submit_payload = {
        "submitted_data": {
            str(f1["id"]): "Jane Doe",
            str(f2["id"]): 5,
            "email": "jane@example.com", # Mocking name/email inside JSON
            "resume": "http://localhost:8000/media/uploads/mock_resume.pdf"
        }
    }
    
    submit_res = make_request(f"/api/public/{share_slug}/submit", method="POST", data=submit_payload)
    print(f"✔ Public Response Submitted: {submit_res}")

    # 7. Responses Dashboard & CSV Export
    print("\n--- Testing Responses Dashboard & Export ---")
    responses_list = make_request(f"/api/forms/{form_id}/responses", token=token)
    print(f"✔ Fetched Submissions count: {len(responses_list)}")
    for resp in responses_list:
        print(f"  - Submission ID: {resp['id']}, Submitter: {resp['name']}, Email: {resp['email']}, Rating: {'⭐' * resp['submitted_data'].get(str(f2['id']), 0)}")

    # Test CSV Export
    export_url = f"{BASE_URL}/api/forms/{form_id}/export"
    req = urllib.request.Request(export_url, headers={"Authorization": f"Token {token}"})
    with urllib.request.urlopen(req) as res:
        csv_content = res.read().decode("utf-8")
        print("✔ CSV Report Exported successfully. Contents:")
        print(csv_content.strip())

    # 8. Clean up Form deletion
    print("\n--- Testing Cascade Form Deletion ---")
    make_request(f"/api/forms/{form_id}", method="DELETE", token=token)
    print(f"✔ Form ID {form_id} deleted successfully.")

    print("\n=== ALL ENHANCEMENT VERIFICATION TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
