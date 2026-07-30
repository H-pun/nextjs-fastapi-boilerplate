from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger  

# from api.jobs.draft import auto_draft

# Set up the scheduler
def start_scheduler():
    scheduler = AsyncIOScheduler()
    trigger = CronTrigger(hour=17, minute=0)
    # scheduler.add_job(auto_draft, trigger, id="auto_draft_job", replace_existing=True, misfire_grace_time=None)
    return scheduler
