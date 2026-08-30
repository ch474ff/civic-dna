"""add status history and cluster timestamps

Revision ID: 003_status_history
Revises: 002_add_created_at_to_complaints
Create Date: 2026-08-30
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_status_history"
down_revision: Union[str, Sequence[str], None] = "002_add_created_at_to_complaints"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create cluster_status_history table
    op.create_table(
        "cluster_status_history",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("cluster_id", sa.String(length=64), sa.ForeignKey("clusters.cluster_id"), nullable=False, index=True),
        sa.Column("old_status", sa.String(length=64), nullable=True),
        sa.Column("new_status", sa.String(length=64), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("changed_by_officer_id", sa.String(length=64), nullable=True),
    )

    # 2. Add created_at and updated_at to clusters
    op.add_column(
        "clusters",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.add_column(
        "clusters",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )


def downgrade() -> None:
    op.drop_column("clusters", "updated_at")
    op.drop_column("clusters", "created_at")
    op.drop_table("cluster_status_history")
