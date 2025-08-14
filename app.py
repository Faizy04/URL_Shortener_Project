from flask import Flask, request, redirect, render_template, jsonify, url_for
import string
import random
import sqlite3
from datetime import datetime
import os
from urllib.parse import urlparse

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'

# Database setup
DATABASE = 'url_shortener.db'

def init_db():
    """Initialize the database"""
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS urls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_url TEXT NOT NULL,
            short_code TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            click_count INTEGER DEFAULT 0
        )
    ''')
    conn.commit()
    conn.close()

def generate_short_code(length=6):
    """Generate a random short code"""
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(length))

def is_valid_url(url):
    """Validate URL format"""
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    """Home page"""
    return render_template('index.html')

@app.route('/shorten', methods=['POST'])
def shorten_url():
    """Shorten a URL"""
    try:
        data = request.get_json()
        original_url = data.get('url', '').strip()
        
        if not original_url:
            return jsonify({'error': 'URL is required'}), 400
        
        # Add protocol if missing
        if not original_url.startswith(('http://', 'https://')):
            original_url = 'https://' + original_url
        
        if not is_valid_url(original_url):
            return jsonify({'error': 'Invalid URL format'}), 400
        
        conn = get_db_connection()
        
        # Check if URL already exists
        existing = conn.execute(
            'SELECT short_code FROM urls WHERE original_url = ?',
            (original_url,)
        ).fetchone()
        
        if existing:
            short_code = existing['short_code']
        else:
            # Generate unique short code
            while True:
                short_code = generate_short_code()
                if not conn.execute('SELECT 1 FROM urls WHERE short_code = ?', (short_code,)).fetchone():
                    break
            
            # Store in database
            conn.execute(
                'INSERT INTO urls (original_url, short_code) VALUES (?, ?)',
                (original_url, short_code)
            )
            conn.commit()
        
        conn.close()
        
        short_url = request.host_url + short_code
        return jsonify({
            'short_url': short_url,
            'original_url': original_url,
            'short_code': short_code
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/<short_code>')
def redirect_url(short_code):
    """Redirect to original URL"""
    conn = get_db_connection()
    
    url_data = conn.execute(
        'SELECT original_url FROM urls WHERE short_code = ?',
        (short_code,)
    ).fetchone()
    
    if url_data:
        # Increment click count
        conn.execute(
            'UPDATE urls SET click_count = click_count + 1 WHERE short_code = ?',
            (short_code,)
        )
        conn.commit()
        conn.close()
        
        return redirect(url_data['original_url'])
    else:
        conn.close()
        return render_template('404.html'), 404

@app.route('/stats/<short_code>')
def url_stats(short_code):
    """Get URL statistics"""
    conn = get_db_connection()
    
    stats = conn.execute(
        'SELECT original_url, short_code, created_at, click_count FROM urls WHERE short_code = ?',
        (short_code,)
    ).fetchone()
    
    conn.close()
    
    if stats:
        return jsonify({
            'original_url': stats['original_url'],
            'short_code': stats['short_code'],
            'created_at': stats['created_at'],
            'click_count': stats['click_count'],
            'short_url': request.host_url + stats['short_code']
        })
    else:
        return jsonify({'error': 'Short code not found'}), 404

@app.route('/api/recent')
def recent_urls():
    """Get recent URLs (for demo purposes)"""
    conn = get_db_connection()
    
    recent = conn.execute(
        'SELECT original_url, short_code, created_at, click_count FROM urls ORDER BY created_at DESC LIMIT 10'
    ).fetchall()
    
    conn.close()
    
    urls = []
    for row in recent:
        urls.append({
            'original_url': row['original_url'],
            'short_code': row['short_code'],
            'created_at': row['created_at'],
            'click_count': row['click_count'],
            'short_url': request.host_url + row['short_code']
        })
    
    return jsonify(urls)

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
