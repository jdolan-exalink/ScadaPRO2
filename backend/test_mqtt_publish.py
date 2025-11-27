"""
Script de prueba para simular datos de sensores y publicarlos a MQTT
Uso: python test_mqtt_publish.py
"""
import paho.mqtt.client as mqtt
import json
import time
import random
from datetime import datetime, timezone

# Configuración MQTT
MQTT_HOST = "localhost"  # Cambiar a 'mqtt' si corre dentro de Docker
MQTT_PORT = 1883

# Sensores de prueba (basados en sec21.yml)
SENSORS = [
    {"code": "temperatura_medida_sec21", "name": "Temperatura Medida SEC21", "unit": "°C", "min": 20, "max": 80},
    {"code": "temperatura_set_sec21", "name": "Temperatura SET SEC21", "unit": "°C", "min": 50, "max": 70},
    {"code": "humedad_medida_sec21", "name": "Humedad Medida SEC21", "unit": "%", "min": 30, "max": 90},
    {"code": "humedad_set_sec21", "name": "Humedad SET SEC21", "unit": "%", "min": 40, "max": 60},
    {"code": "velocidad_sec21", "name": "Velocidad SEC21", "unit": "%", "min": 0, "max": 100},
]

def on_connect(client, userdata, flags, rc):
    print(f"✅ Conectado a MQTT broker (código: {rc})")

def on_publish(client, userdata, mid):
    print(f"📤 Mensaje publicado (ID: {mid})")

def main():
    print(f"🔗 Conectando a MQTT en {MQTT_HOST}:{MQTT_PORT}...")
    
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_publish = on_publish
    
    try:
        client.connect(MQTT_HOST, MQTT_PORT, 60)
        client.loop_start()
        time.sleep(1)  # Esperar conexión
        
        print("\n📡 Publicando datos de prueba (Ctrl+C para detener)...\n")
        
        while True:
            for sensor in SENSORS:
                # Generar valor aleatorio
                value = round(random.uniform(sensor["min"], sensor["max"]), 2)
                
                # Crear payload
                payload = {
                    "sensor_code": sensor["code"],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "value": value,
                    "unit": sensor["unit"]
                }
                
                # Publicar
                topic = f"machines/sec21/{sensor['code']}"
                client.publish(topic, json.dumps(payload))
                print(f"  {sensor['name']}: {value} {sensor['unit']} -> {topic}")
            
            print("---")
            time.sleep(2)  # Publicar cada 2 segundos
            
    except KeyboardInterrupt:
        print("\n🛑 Detenido por usuario")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.loop_stop()
        client.disconnect()
        print("👋 Desconectado")

if __name__ == "__main__":
    main()
