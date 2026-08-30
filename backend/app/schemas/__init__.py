from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

VALID_CLUSTER_STATUSES: tuple[str, ...] = (
    "submitted",
    "acknowledged",
    "in_progress",
    "resolved",
    "closed",
)


class ComplaintCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1, max_length=10000)
    lat: float
    lng: float
    images: list[str] = Field(default_factory=list)
    audio: str | None = None
    language: str = "en"

    @field_validator("lat")
    @classmethod
    def validate_lat(cls, value: float) -> float:
        if value < -90 or value > 90:
            raise ValueError("lat must be between -90 and 90")
        return value

    @field_validator("lng")
    @classmethod
    def validate_lng(cls, value: float) -> float:
        if value < -180 or value > 180:
            raise ValueError("lng must be between -180 and 180")
        return value


class ComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    complaint_id: str
    title: str
    description: str
    lat: float
    lng: float
    images: list[str]
    audio: str | None
    language: str
    department: str
    category: str
    confidence: float
    extracted_severity_keywords: list[str]
    cluster_id: str | None
    created_at: datetime

    @field_serializer("created_at")
    def serialize_created_at(self, value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.isoformat()


class ComplaintStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    complaint_id: str
    cluster_id: str | None
    status: str
    department: str
    category: str
    priority_score: float
    sla_deadline: datetime | None
    root_cause_asset: str | None
    created_at: datetime
    updated_at: datetime | None = None

    @field_serializer("sla_deadline")
    def serialize_sla_deadline(self, value: datetime | None) -> str | None:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.isoformat()

    @field_serializer("created_at")
    def serialize_created_at(self, value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.isoformat()

    @field_serializer("updated_at")
    def serialize_updated_at(self, value: datetime | None) -> str | None:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.isoformat()


class ComplaintTimelineItem(BaseModel):
    status: str
    timestamp: datetime

    @field_serializer("timestamp")
    def serialize_timestamp(self, value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.isoformat()


class PublicMapCentroid(BaseModel):
    lat: float
    lng: float


class PublicMapClusterResponse(BaseModel):
    cluster_id: str
    category: str
    department: str
    status: str
    priority_score: float
    centroid: PublicMapCentroid
    complaint_count: int


class ClusterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cluster_id: str
    member_complaint_ids: list[str]
    department: str
    priority_score: float
    sla_deadline: datetime
    status: str
    root_cause_asset: str | None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @field_serializer("sla_deadline")
    def serialize_sla_deadline(self, value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.isoformat()

    @field_serializer("created_at")
    def serialize_created_at(self, value: datetime | None) -> str | None:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.isoformat()

    @field_serializer("updated_at")
    def serialize_updated_at(self, value: datetime | None) -> str | None:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.isoformat()


class ClusterPatch(BaseModel):
    status: str | None = None
    root_cause_asset: str | None = None
    department: str | None = None
    priority_score: float | None = Field(default=None, ge=0, le=1)
    sla_deadline: datetime | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is not None and value not in VALID_CLUSTER_STATUSES:
            raise ValueError(
                f"Invalid status '{value}'. Allowed statuses: {', '.join(VALID_CLUSTER_STATUSES)}"
            )
        return value


class FeedbackCreate(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str | None = Field(default=None, max_length=5000)


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    feedback_id: str
    complaint_id: str
    rating: int | None
    comment: str | None
    created_at: datetime

    @field_serializer("created_at")
    def serialize_created_at(self, value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.isoformat()


class AnalyticsSummary(BaseModel):
    complaints_total: int
    clusters_total: int
    clusters_by_status: dict[str, int]
    complaints_by_department: dict[str, int]
    average_priority_score: float


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class EscalationItemResponse(BaseModel):
    cluster_id: str
    level: str
    sla_deadline: datetime
    hours_remaining: float

    @field_serializer("sla_deadline")
    def serialize_sla_deadline(self, value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.isoformat()


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict | list | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody
