import urllib.request
import json
import time
import sys

BASE_URL = "http://localhost:8000" # Using 8000 as per docker-compose
TOKEN_FILE = "config/api_token.txt"

def get_token():
    try:
        with open(TOKEN_FILE, "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        print(f"❌ Token file not found at {TOKEN_FILE}")
        sys.exit(1)

def test_logs():
    token = get_token()
    url = f"{BASE_URL}/api/logs"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    
    print(f"🔍 Testing GET {url}...")
    
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.status
            body = response.read().decode('utf-8')
            data = json.loads(body)
            
            if status == 200:
                print("✅ Status 200 OK")
                print(f"📄 Logs found: {len(data)}")
                if len(data) > 0:
                    print("   Latest log:")
                    print(json.dumps(data[0], indent=2))
                else:
                    print("   (No logs found yet, but endpoint works)")
            else:
                print(f"❌ Unexpected status: {status}")
                print(body)

    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    # Wait a bit for server to start if running immediately after
    time.sleep(2)
    test_logs()
