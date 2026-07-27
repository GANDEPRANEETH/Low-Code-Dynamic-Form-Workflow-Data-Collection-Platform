from pydantic import BaseModel, Field as PydanticField
from typing import List, Optional
from datetime import datetime

# --- FIELD SCHEMAS ---
class FieldBase(BaseModel):
    label: str
    field_type: str  # text, number, email, dropdown, checkbox, date, rating, file
    required: bool = False
    placeholder: Optional[str] = None
    options: Optional[List[str]] = None  # e.g., ["Red", "Green", "Blue"]
    order: int = 0

class FieldCreate(FieldBase):
    pass

class FieldUpdate(BaseModel):
    label: Optional[str] = None
    field_type: Optional[str] = None
    required: Optional[bool] = None
    placeholder: Optional[str] = None
    options: Optional[List[str]] = None
    order: Optional[int] = None

class FieldResponse(FieldBase):
    id: int
    form_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- FORM SCHEMAS ---
class FormBase(BaseModel):
    title: str
    description: Optional[str] = None

class FormCreate(FormBase):
    pass

class FormUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class FormResponse(FormBase):
    id: int
    is_published: bool
    is_archived: bool
    current_version: int
    share_slug: str
    created_at: datetime
    updated_at: datetime
    fields: List[FieldResponse] = []

    class Config:
        from_attributes = True


# --- FORM VERSION SCHEMAS ---
class FormVersionResponse(BaseModel):
    id: int
    form_id: int
    version: int
    fields_snapshot: List[dict]
    published_at: datetime

    class Config:
        from_attributes = True


# --- PUBLIC SCHEMAS ---
class PublicFormResponse(BaseModel):
    title: str
    description: Optional[str] = None
    version: int
    fields: List[dict]  # The fields_snapshot from the published version

    class Config:
        from_attributes = True
