from sqlalchemy.orm import Session
from api.core.security import hash_password
from api.database import User, UserRole
from api.core.logger import get_logger

logger = get_logger(__name__)


def seed_users(db: Session) -> None:
    if db.query(User).count() == 0:
        logger.info("Seeding users...")
        user = User(
            name="Admin",
            identifier="0000000000",
            username="admin",
            password=hash_password("Admin123!"),
            role=UserRole.ADMIN,
        )
        db.add(user)
