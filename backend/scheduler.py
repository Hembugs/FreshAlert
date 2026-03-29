from apscheduler.schedulers.background import BackgroundScheduler
from database import get_expiring_products, delete_product
from notifications import send_notification
import os

print('SCHEDULER MODULE LOADED')

def check_expiry():
    print('Running expiry check...')
    
    token_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fcm_token.txt')
    if os.path.exists(token_path):
        with open(token_path, 'r') as f:
            FCM_TOKEN = f.read().strip()
    else:
        FCM_TOKEN = os.getenv('FCM_TOKEN')
    
    print(f'FCM token found: {FCM_TOKEN is not None}')
    
    if not FCM_TOKEN:
        print('No FCM token, skipping notifications')
        return

    products_today = get_expiring_products(0)
    print(f'Products expiring today: {products_today}')

    for product in get_expiring_products(7):
        send_notification(FCM_TOKEN, '🛒 Expiring Soon', f"{product['name']} expires in a week")
    for product in get_expiring_products(3):
        send_notification(FCM_TOKEN, '⚠️ Expiring Soon', f"{product['name']} expires in 3 days")
    for product in get_expiring_products(1):
        send_notification(FCM_TOKEN, '🚨 Expiring Tomorrow', f"{product['name']} expires tomorrow")
    for product in get_expiring_products(0):
        send_notification(FCM_TOKEN, '❌ Expired', f"{product['name']} has expired today")
        delete_product(product['id'])

def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(check_expiry, 'cron', hour=9)
    scheduler.start()
    return scheduler