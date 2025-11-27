import urllib.request
import urllib.error
import json
import sys
import time

# Configuración
BASE_URL = "http://localhost:8000"
# El backend actual acepta cualquier token no vacío en el header Authorization
TEST_TOKEN = "diagnostic_token_123" 

ENDPOINTS = [
    {"url": "/api/health", "auth": False},
    {"url": "/api/version", "auth": False},
    {"url": "/api/plcs", "auth": True},
    {"url": "/api/sensors", "auth": True},
    {"url": "/api/logs", "auth": True}, # Este endpoint podría no existir
]

def check_endpoint(endpoint_config):
    path = endpoint_config["url"]
    requires_auth = endpoint_config["auth"]
    
    url = f"{BASE_URL}{path}"
    print(f"\n🔍 Probando: {path} [{'🔒 Con Token' if requires_auth else '🔓 Público'}]")
    
    req = urllib.request.Request(url)
    if requires_auth:
        req.add_header("Authorization", f"Bearer {TEST_TOKEN}")
    
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.status
            content_type = response.headers.get_content_type()
            raw_body = response.read().decode('utf-8')
            
            print(f"✅ Estado: {status} OK")
            
            # Intentar formatear JSON
            if "application/json" in content_type:
                try:
                    data = json.loads(raw_body)
                    formatted_json = json.dumps(data, indent=2)
                    print(f"📄 Respuesta:\n{formatted_json}")
                    
                    if isinstance(data, list) and len(data) == 0:
                        print("⚠️  ALERTA: La lista está vacía. No hay datos registrados en el backend.")
                except json.JSONDecodeError:
                    print(f"📄 Respuesta (Raw):\n{raw_body}")
            else:
                print(f"📄 Respuesta (Raw):\n{raw_body}")

    except urllib.error.HTTPError as e:
        print(f"❌ Error HTTP: {e.code} {e.reason}")
        
        if e.code == 401:
            print("   -> Causa probable: Falta el Token JWT o es inválido.")
        elif e.code == 404:
            print("   -> Causa probable: El endpoint no existe (URL incorrecta).")
        elif e.code == 500:
            print("   -> Causa probable: Error interno del servidor (revisar logs del contenedor 'api').")
            
        # Intentar leer el cuerpo del error
        try:
            error_body = e.read().decode('utf-8')
            print(f"   -> Detalles del servidor: {error_body}")
        except:
            pass

    except urllib.error.URLError as e:
        print(f"❌ Error de Conexión: {e.reason}")
        print("   -> Causa probable: El backend no está corriendo o el puerto 8000 no es accesible.")
    except Exception as e:
        print(f"❌ Error Inesperado: {e}")

def main():
    print(f"🚀 Iniciando Diagnóstico de API Backend")
    print(f"📡 Base URL: {BASE_URL}")
    print("------------------------------------------------")
    
    # 1. Verificar conectividad básica primero
    try:
        urllib.request.urlopen(f"{BASE_URL}/api/health", timeout=2)
    except Exception:
        print("⚠️  ADVERTENCIA: No se pudo conectar a /api/health. Asegúrate de que 'docker-compose up' esté corriendo.")
        print("   Intentando continuar con el resto de pruebas...")
        time.sleep(1)

    for ep in ENDPOINTS:
        check_endpoint(ep)
        time.sleep(0.5)

    print("\n------------------------------------------------")
    print("🏁 Diagnóstico finalizado.")

if __name__ == "__main__":
    main()
