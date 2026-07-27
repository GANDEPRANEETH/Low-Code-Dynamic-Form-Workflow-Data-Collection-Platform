from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from .database import engine, Base, get_db
from . import crud, schemas, models

# Auto-initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Low-Code Dynamic Form Platform API",
    description="Milestone 1 API for building, editing, and publishing dynamic forms",
    version="1.0.0"
)

# CORS Configuration for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Form Schema engine is running"}

# --- ADMIN FORM APIS ---

@app.post("/api/forms", response_model=schemas.FormResponse, status_code=status.HTTP_201_CREATED, tags=["Admin Forms"])
def create_form(form: schemas.FormCreate, db: Session = Depends(get_db)):
    return crud.create_form(db=db, form=form)

@app.get("/api/forms", response_model=List[schemas.FormResponse], tags=["Admin Forms"])
def list_forms(db: Session = Depends(get_db)):
    return crud.get_forms(db=db)

@app.get("/api/forms/{id}", response_model=schemas.FormResponse, tags=["Admin Forms"])
def get_form(id: int, db: Session = Depends(get_db)):
    db_form = crud.get_form(db=db, form_id=id)
    if not db_form:
        raise HTTPException(status_code=404, detail="Form not found")
    return db_form

@app.put("/api/forms/{id}", response_model=schemas.FormResponse, tags=["Admin Forms"])
def update_form(id: int, form_update: schemas.FormUpdate, db: Session = Depends(get_db)):
    db_form = crud.update_form(db=db, form_id=id, form_update=form_update)
    if not db_form:
        raise HTTPException(status_code=404, detail="Form not found")
    return db_form

@app.delete("/api/forms/{id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Admin Forms"])
def delete_form(id: int, db: Session = Depends(get_db)):
    success = crud.delete_form(db=db, form_id=id)
    if not success:
        raise HTTPException(status_code=404, detail="Form not found")
    return None


# --- ADMIN FIELD APIS ---

@app.post("/api/forms/{form_id}/fields", response_model=schemas.FieldResponse, status_code=status.HTTP_201_CREATED, tags=["Admin Fields"])
def add_field(form_id: int, field: schemas.FieldCreate, db: Session = Depends(get_db)):
    # Verify form exists first
    db_form = crud.get_form(db=db, form_id=form_id)
    if not db_form:
        raise HTTPException(status_code=404, detail="Parent form not found")
    
    # Validate field_type
    valid_types = {"text", "number", "email", "dropdown", "checkbox", "date", "rating", "file"}
    if field.field_type.lower() not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid field type. Must be one of: {valid_types}")
        
    return crud.create_field(db=db, form_id=form_id, field=field)

@app.put("/api/fields/{id}", response_model=schemas.FieldResponse, tags=["Admin Fields"])
def update_field(id: int, field_update: schemas.FieldUpdate, db: Session = Depends(get_db)):
    # If field_type is updated, validate it
    if field_update.field_type:
        valid_types = {"text", "number", "email", "dropdown", "checkbox", "date", "rating", "file"}
        if field_update.field_type.lower() not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid field type. Must be one of: {valid_types}")

    db_field = crud.update_field(db=db, field_id=id, field_update=field_update)
    if not db_field:
        raise HTTPException(status_code=404, detail="Field not found")
    return db_field

@app.delete("/api/fields/{id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Admin Fields"])
def delete_field(id: int, db: Session = Depends(get_db)):
    success = crud.delete_field(db=db, field_id=id)
    if not success:
        raise HTTPException(status_code=404, detail="Field not found")
    return None


# --- FORM LIFE CYCLE APIS ---

@app.post("/api/forms/{id}/publish", response_model=schemas.FormResponse, tags=["Form Lifecycle"])
def publish_form(id: int, db: Session = Depends(get_db)):
    db_form = crud.get_form(db=db, form_id=id)
    if not db_form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    # Check if there are fields to publish
    if not db_form.fields:
        raise HTTPException(status_code=400, detail="Cannot publish an empty form. Please add fields first.")
        
    return crud.publish_form(db=db, form_id=id)

@app.post("/api/forms/{id}/archive", response_model=schemas.FormResponse, tags=["Form Lifecycle"])
def archive_form(id: int, db: Session = Depends(get_db)):
    db_form = crud.archive_form(db=db, form_id=id)
    if not db_form:
        raise HTTPException(status_code=404, detail="Form not found")
    return db_form


# --- PUBLIC FORM APIS ---

@app.get("/api/public/forms/{share_slug}", response_model=schemas.PublicFormResponse, tags=["Public Forms"])
def get_public_form(share_slug: str, db: Session = Depends(get_db)):
    db_form = crud.get_form_by_slug(db=db, slug=share_slug)
    if not db_form:
        raise HTTPException(status_code=404, detail="Public Form not found")
        
    if db_form.is_archived:
        raise HTTPException(status_code=403, detail="This form has been archived and is no longer active.")
        
    if not db_form.is_published:
        raise HTTPException(status_code=403, detail="This form is currently in draft mode and not published.")

    # Retrieve the snapshot of the latest published version
    # Since current_version is incremented on publish, the version snapshot we want is (current_version - 1)
    db_version = crud.get_latest_published_version(db=db, form_id=db_form.id)
    if not db_version:
        raise HTTPException(status_code=500, detail="Published version mismatch error")
        
    return schemas.PublicFormResponse(
        title=db_form.title,
        description=db_form.description,
        version=db_version.version,
        fields=db_version.fields_snapshot
    )
