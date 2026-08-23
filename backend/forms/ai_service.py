import os
import json
import urllib.request
import urllib.error

def generate_form_schema(prompt):
    api_key = os.environ.get("OPENAI_API_KEY")
    
    if api_key:
        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            }
            system_instruction = (
                "You are an AI assistant that generates structured form schemas for a low-code builder.\n"
                "Return ONLY a valid JSON object matching the requested schema. Do not return any markdown wraps or explainers.\n"
                "JSON format:\n"
                "{\n"
                '  "title": "Form Title",\n'
                '  "description": "Form description",\n'
                '  "fields": [\n'
                "    {\n"
                '      "label": "Field Label",\n'
                '      "field_type": "text" | "number" | "email" | "dropdown" | "checkbox" | "date" | "file" | "rating",\n'
                '      "required": true | false,\n'
                '      "placeholder": "Placeholder text",\n'
                '      "options": ["Option 1", "Option 2"] // Only for dropdown and checkbox\n'
                "    }\n"
                "  ]\n"
                "}"
            )
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": f"Generate a form draft for: {prompt}"}
                ],
                "temperature": 0.7,
                "response_format": {"type": "json_object"}
            }
            
            req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
            with urllib.request.urlopen(req, timeout=15) as response:
                resp_data = json.loads(response.read().decode('utf-8'))
                content = resp_data["choices"][0]["message"]["content"]
                result = json.loads(content)
                
                # Basic validation
                if "title" in result and "fields" in result and isinstance(result["fields"], list):
                    return result
        except Exception as e:
            import logging
            logging.error(f"OpenAI schema generation failed: {str(e)}")
            
    prompt_lower = prompt.lower()
    
    if "restaurant" in prompt_lower or "food" in prompt_lower or "customer" in prompt_lower or "feedback" in prompt_lower:
        return {
            "title": "Restaurant Customer Feedback Form",
            "description": "Please share your dining experience with us.",
            "fields": [
                {
                    "label": "Full Name",
                    "field_type": "text",
                    "required": False,
                    "placeholder": "John Doe"
                },
                {
                    "label": "Email Address",
                    "field_type": "email",
                    "required": True,
                    "placeholder": "john@example.com"
                },
                {
                    "label": "Visit Date",
                    "field_type": "date",
                    "required": True,
                    "placeholder": ""
                },
                {
                    "label": "Food Quality Rating",
                    "field_type": "rating",
                    "required": True,
                    "placeholder": ""
                },
                {
                    "label": "Service Rating",
                    "field_type": "rating",
                    "required": True,
                    "placeholder": ""
                },
                {
                    "label": "Would you recommend us?",
                    "field_type": "dropdown",
                    "required": True,
                    "placeholder": "Select an option",
                    "options": ["Yes, absolutely", "No, unfortunately", "Maybe, with improvements"]
                },
                {
                    "label": "Additional Comments",
                    "field_type": "text",
                    "required": False,
                    "placeholder": "Share your thoughts here..."
                }
            ]
        }
    elif "event" in prompt_lower or "registration" in prompt_lower or "college" in prompt_lower or "university" in prompt_lower:
        return {
            "title": "College Event Registration Form",
            "description": "Register for the upcoming academic conference.",
            "fields": [
                {
                    "label": "Full Name",
                    "field_type": "text",
                    "required": True,
                    "placeholder": "Jane Smith"
                },
                {
                    "label": "Email Address",
                    "field_type": "email",
                    "required": True,
                    "placeholder": "jane.smith@college.edu"
                },
                {
                    "label": "Academic Department",
                    "field_type": "dropdown",
                    "required": True,
                    "placeholder": "Select department",
                    "options": ["Computer Science", "Information Technology", "Business Administration", "Engineering", "Arts & Sciences"]
                },
                {
                    "label": "Academic Year",
                    "field_type": "dropdown",
                    "required": True,
                    "placeholder": "Select year",
                    "options": ["Freshman", "Sophomore", "Junior", "Senior"]
                },
                {
                    "label": "Phone Number",
                    "field_type": "text",
                    "required": True,
                    "placeholder": "123-456-7890"
                },
                {
                    "label": "Special Dietary Requirements",
                    "field_type": "checkbox",
                    "required": False,
                    "placeholder": "",
                    "options": ["Vegetarian", "Vegan", "Gluten-Free", "None"]
                }
            ]
        }
    elif "job" in prompt_lower or "application" in prompt_lower or "hiring" in prompt_lower or "career" in prompt_lower:
        return {
            "title": "Job Application Form",
            "description": "Apply for open positions at FormFlow Studio.",
            "fields": [
                {
                    "label": "Full Name",
                    "field_type": "text",
                    "required": True,
                    "placeholder": "John Smith"
                },
                {
                    "label": "Email",
                    "field_type": "email",
                    "required": True,
                    "placeholder": "john@email.com"
                },
                {
                    "label": "Position of Interest",
                    "field_type": "dropdown",
                    "required": True,
                    "placeholder": "Select position",
                    "options": ["Frontend Engineer", "Backend Developer", "Full-Stack Engineer", "Product Manager"]
                },
                {
                    "label": "Years of Experience",
                    "field_type": "number",
                    "required": True,
                    "placeholder": "E.g., 3"
                },
                {
                    "label": "Upload Resume",
                    "field_type": "file",
                    "required": True,
                    "placeholder": "Choose file"
                },
                {
                    "label": "Cover Letter / Notes",
                    "field_type": "text",
                    "required": False,
                    "placeholder": "Tell us why you are a fit..."
                }
            ]
        }
    else:
        title = prompt.strip()[:100] if prompt.strip() else "AI Generated Form"
        if not title.endswith("Form"):
            title = f"{title} Form"
        return {
            "title": title,
            "description": f"Generated form draft for: {prompt}",
            "fields": [
                {
                    "label": "Full Name",
                    "field_type": "text",
                    "required": True,
                    "placeholder": "Your Name"
                },
                {
                    "label": "Email Address",
                    "field_type": "email",
                    "required": True,
                    "placeholder": "yourname@email.com"
                },
                {
                    "label": "Message Details",
                    "field_type": "text",
                    "required": False,
                    "placeholder": "Enter details here..."
                }
            ]
        }
