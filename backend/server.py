from flask import Flask, request, jsonify
from flask_cors import CORS
from database import init_db, add_product, get_all_products, delete_product
from notifications import init_firebase
from scheduler import start_scheduler, check_expiry
import requests
import os

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

@app.route('/barcode/<barcode>', methods=['GET'])
def lookup_barcode(barcode):
    try:
        response = requests.get(
            f'https://world.openfoodfacts.org/api/v2/product/{barcode}',
            headers={'User-Agent': 'FreshAlert/1.0'}
        )
        data = response.json()
        if data.get('status') == 1:
            product = data['product']
            return jsonify({
                'found': True,
                'name': product.get('product_name', ''),
            })
        return jsonify({'found': False})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/register-token', methods=['POST'])
def register_token():
    data = request.get_json(force=True, silent=True)
    if not data or 'token' not in data:
        return jsonify({'error': 'token is required'}), 400
    # save token to .env or a simple file for now
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fcm_token.txt'), 'w') as f:
        f.write(data['token'])
    return jsonify({'success': True})

@app.route('/test-notifications', methods=['GET'])
def test_notifications():
    check_expiry()
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)