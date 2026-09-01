from sqlalchemy.orm import Session
from api.core.logger import get_logger
from api.core.db import engine as core_engine
from api.seeds import seed_users, seed_navigation

logger = get_logger(__name__)


def seed_all(engine=core_engine, minimal=False):
    with Session(engine) as db:
        try:
            seed_users(db)
            seed_navigation(db)
            db.commit()
            logger.info("Seeding completed.")
        finally:
            db.close()


# py -m api.seeder
# alembic revision --autogenerate -m "message"
if __name__ == "__main__":
    seed_all()
