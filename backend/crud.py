import secrets
from sqlalchemy.orm import Session
from sqlalchemy import desc
import models, schemas

# Helper to generate unique URL-safe slugs
def generate_unique_slug(db: Session) -> str:
    while True:
        slug = secrets.token_urlsafe(8).lower().replace("_", "-").replace("~", "-")
        # Check uniqueness
        exists = db.query(models.Form).filter(models.Form.share_slug == slug).first()
        if not exists:
            return slug

# --- FORM OPERATIONS ---

def get_forms(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Form).offset(skip).limit(limit).all()

def get_form(db: Session, form_id: int):
    return db.query(models.Form).filter(models.Form.id == form_id).first()

def get_form_by_slug(db: Session, slug: str):
    return db.query(models.Form).filter(models.Form.share_slug == slug).first()

def create_form(db: Session, form: schemas.FormCreate):
    share_slug = generate_unique_slug(db)
    db_form = models.Form(
        title=form.title,
        description=form.description,
        share_slug=share_slug,
        is_published=False,
        is_archived=False,
        current_version=1
    )
    db.add(db_form)
    db.commit()
    db.refresh(db_form)
    return db_form

def update_form(db: Session, form_id: int, form_update: schemas.FormUpdate):
    db_form = get_form(db, form_id)
    if not db_form:
        return None
    for key, value in form_update.model_dump(exclude_unset=True).items():
        setattr(db_form, key, value)
    db.commit()
    db.refresh(db_form)
    return db_form

def delete_form(db: Session, form_id: int):
    db_form = get_form(db, form_id)
    if not db_form:
        return False
    db.delete(db_form)
    db.commit()
    return True

# --- FIELD OPERATIONS ---

def get_fields(db: Session, form_id: int):
    return db.query(models.Field).filter(models.Field.form_id == form_id).order_by(models.Field.order).all()

def get_field(db: Session, field_id: int):
    return db.query(models.Field).filter(models.Field.id == field_id).first()

def create_field(db: Session, form_id: int, field: schemas.FieldCreate):
    # Auto-assign order if not set
    if field.order == 0:
        max_order = db.query(models.Field).filter(models.Field.form_id == form_id).count()
        order_val = max_order
    else:
        order_val = field.order

    db_field = models.Field(
        form_id=form_id,
        label=field.label,
        field_type=field.field_type,
        required=field.required,
        placeholder=field.placeholder,
        options=field.options,
        order=order_val
    )
    db.add(db_field)
    db.commit()
    db.refresh(db_field)
    return db_field

def update_field(db: Session, field_id: int, field_update: schemas.FieldUpdate):
    db_field = get_field(db, field_id)
    if not db_field:
        return None
    for key, value in field_update.model_dump(exclude_unset=True).items():
        setattr(db_field, key, value)
    db.commit()
    db.refresh(db_field)
    return db_field

def delete_field(db: Session, field_id: int):
    db_field = get_field(db, field_id)
    if not db_field:
        return False
    db.delete(db_field)
    db.commit()
    return True

# --- PUBLISH & ARCHIVE LIFECYCLE ---

def publish_form(db: Session, form_id: int):
    db_form = get_form(db, form_id)
    if not db_form:
        return None

    # Get active draft fields to freeze in version snapshot
    fields = get_fields(db, form_id)
    fields_snapshot = []
    for f in fields:
        fields_snapshot.append({
            "id": f.id,
            "label": f.label,
            "field_type": f.field_type,
            "required": f.required,
            "placeholder": f.placeholder,
            "options": f.options,
            "order": f.order
        })

    # Create new FormVersion
    version_num = db_form.current_version
    db_version = models.FormVersion(
        form_id=form_id,
        version=version_num,
        fields_snapshot=fields_snapshot
    )
    db.add(db_version)

    # Update form state for publication
    db_form.is_published = True
    db_form.is_archived = False
    db_form.current_version += 1  # Increment version for next draft edit session

    db.commit()
    db.refresh(db_form)
    return db_form

def archive_form(db: Session, form_id: int):
    db_form = get_form(db, form_id)
    if not db_form:
        return None
    db_form.is_published = False
    db_form.is_archived = True
    db.commit()
    db.refresh(db_form)
    return db_form

def get_latest_published_version(db: Session, form_id: int):
    return db.query(models.FormVersion)\
        .filter(models.FormVersion.form_id == form_id)\
        .order_by(desc(models.FormVersion.version))\
        .first()
