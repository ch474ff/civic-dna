"""initial civic dna schema

Revision ID: 001_initial
Revises:
Create Date: 2026-08-30
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001_initial"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "departments",
        sa.Column("department_id", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
    )
    op.create_table(
        "clusters",
        sa.Column("cluster_id", sa.String(length=64), primary_key=True),
        sa.Column("member_complaint_ids", sa.JSON(), nullable=False),
        sa.Column("department", sa.String(length=255), nullable=False),
        sa.Column("priority_score", sa.Float(), nullable=False),
        sa.Column("sla_deadline", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("root_cause_asset", sa.String(length=512), nullable=True),
    )
    op.create_table(
        "complaints",
        sa.Column("complaint_id", sa.String(length=64), primary_key=True),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("images", sa.JSON(), nullable=False),
        sa.Column("audio", sa.String(length=1024), nullable=True),
        sa.Column("language", sa.String(length=16), nullable=False),
        sa.Column("department", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=255), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("extracted_severity_keywords", sa.JSON(), nullable=False),
        sa.Column("cluster_id", sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(["cluster_id"], ["clusters.cluster_id"]),
    )
    op.create_table(
        "feedback",
        sa.Column("feedback_id", sa.String(length=64), primary_key=True),
        sa.Column("complaint_id", sa.String(length=64), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["complaint_id"], ["complaints.complaint_id"]),
    )
    op.create_table(
        "officers",
        sa.Column("officer_id", sa.String(length=64), primary_key=True),
        sa.Column("username", sa.String(length=255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(length=512), nullable=False),
        sa.Column("role", sa.String(length=64), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("officers")
    op.drop_table("feedback")
    op.drop_table("complaints")
    op.drop_table("clusters")
    op.drop_table("departments")
