from apscheduler.schedulers.background import BackgroundScheduler
from database import get_expiring_products, delete_product
from notifications import send_notification
import os

FCM_TOKEN = os.getenv('FCM_TOKEN')

def check_expiry():
    # 7 days warning
    for product in get_expiring_products(7):
        send_notification(FCM_TOKEN, '🛒 Expiring Soon', f"{product['name']} expires in a week")

    # 3 days warning
    for product in get_expiring_products(3):
        send_notification(FCM_TOKEN, '⚠️ Expiring Soon', f"{product['name']} expires in 3 days")

    # 1 day warning
    for product in get_expiring_products(1):
        send_notification(FCM_TOKEN, '🚨 Expiring Tomorrow', f"{product['name']} expires tomorrow")

    # expired today — notify and delete
    for product in get_expiring_products(0):
        send_notification(FCM_TOKEN, '❌ Expired', f"{product['name']} has expired today")
        delete_product(product['id'])

def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(check_expiry, 'cron', hour=9)  # runs every day at 9am
    scheduler.start()
    return scheduler