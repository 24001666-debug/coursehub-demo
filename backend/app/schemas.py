from pydantic import BaseModel, Field
class EnrollmentCreate(BaseModel):
    student_id: str = Field(
        min_length=8,
        max_length=8,
        examples=["22000004"],
    )
    class_section_id: str = Field(
        min_length=1,
        max_length=20,
        examples=["WEB-01"],
    )

# Bai 3:
class CapacityUpdate(BaseModel):
    capacity: int = Field(
        gt=0,
        strict=True,
        examples=[4],
    )