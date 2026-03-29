from flask import Flask, request, jsonify
from flask_cors import CORS
from database import init_db, add_product, get_all_products, delete_product, save_fcm_token
from notifications import init_firebase
from scheduler import start_scheduler, check_expiry
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
CORS(app)

# initialise everything on startup
init_db()
init_firebase()
start_scheduler()

@app.route('/products', methods=['GET'])
def get_products():
    return jsonify(get_all_products())

@app.route('/products', methods=['POST'])
def create_product():
    data = request.get_json(force=True, silent=True)
    if not data or 'name' not in data or 'expiry_date' not in data:
        return jsonify({'error': 'name and expiry_date are required'}), 400
    add_product(
        name=data['name'],
        expiry_date=data['expiry_date'],
        barcode=data.get('barcode')
    )
    return jsonify({'success': True}), 201

@app.route('/products/<int:product_id>', methods=['DELETE'])
def remove_product(product_id):
    delete_product(product_id)
    return jsonify({'success': True})

@app.route('/register-token', methods=['POST'])
def register_token():
    data = request.get_json(force=True, silent=True)
    if not data or 'token' not in data:
        return jsonify({'error': 'token is required'}), 400
    save_fcm_token(data['token'])
    return jsonify({'success': True})

@app.route('/test-notifications', methods=['GET'])
def test_notifications():
    try:
        check_expiry()
    except Exception as e:
        print(f'check_expiry crashed: {e}')
        return jsonify({'error': str(e)}), 500
    return jsonify({'success': True})

@app.route('/reinit-db', methods=['GET'])
def reinit_db():
    init_db()
    return jsonify({'success': True})

@app.route('/check-token', methods=['GET'])
def check_token():
    from database import get_fcm_token
    token = get_fcm_token()
    if token:
        return jsonify({'token': token[:50] + '...'})
    return jsonify({'token': None})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)