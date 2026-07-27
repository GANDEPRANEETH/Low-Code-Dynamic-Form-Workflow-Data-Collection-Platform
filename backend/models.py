from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Form(Base):
    __tablename__ = "forms"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_published = Column(Boolean, default=False, nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False)
    current_version = Column(Integer, default=1, nullable=False)
    share_slug = Column(String(100), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    fields = relationship("Field", back_populates="form", cascade="all, delete-orphan", order_by="Field.order")
    versions = relationship("FormVersion", back_populates="form", cascade="all, delete-orphan")

class Field(Base):
    __tablename__ = "fields"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(255), nullable=False)
    field_type = Column(String(50), nullable=False)  # text, number, email, dropdown, checkbox, date, rating, file
    required = Column(Boolean, default=False, nullable=False)
    placeholder = Column(String(255), nullable=True)
    options = Column(JSON, nullable=True)  # List of options for choice fields (e.g. ["Yes", "No"])
    order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    form = relationship("Form", back_populates="fields")

class FormVersion(Base):
    __tablename__ = "form_versions"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, nullable=False)
    fields_snapshot = Column(JSON, nullable=False)  # Frozen list of field dictionaries
    published_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    form = relationship("Form", back_populates="versions")
