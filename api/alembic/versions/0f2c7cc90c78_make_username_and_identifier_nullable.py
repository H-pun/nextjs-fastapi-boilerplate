"""make username and identifier nullable

Revision ID: 0f2c7cc90c78
Revises: 0c7086b6f17d
Create Date: 2026-09-02 16:12:17.502967

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0f2c7cc90c78'
down_revision: Union[str, None] = '0c7086b6f17d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Some databases were created from a pre-Alembic schema that still had
    # these objects. The canonical initial revision does not, so cleanup must
    # also be safe for a database created directly from migration history.
    if inspector.has_table('activity_logs'):
        op.drop_table('activity_logs')
    op.alter_column('users', 'identifier',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.alter_column('users', 'username',
               existing_type=sa.VARCHAR(),
               nullable=True)
    user_columns = {column['name'] for column in inspector.get_columns('users')}
    user_constraints = {
        constraint['name']
        for constraint in inspector.get_unique_constraints('users')
    }
    if 'users_phone_key' in user_constraints:
        op.drop_constraint('users_phone_key', 'users', type_='unique')
    if 'phone' in user_columns:
        op.drop_column('users', 'phone')
    if 'cohort' in user_columns:
        op.drop_column('users', 'cohort')


def downgrade() -> None:
    # The down revision is the canonical initial schema, which never contained
    # the optional legacy objects cleaned up above.
    op.alter_column('users', 'username',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.alter_column('users', 'identifier',
               existing_type=sa.VARCHAR(),
               nullable=False)
