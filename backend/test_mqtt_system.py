"""
Script para suscribirse a los topics del sistema y ver métricas en tiempo real.
Uso: python test_mqtt_system.py
"""
import paho.mqtt.client as mqtt
import json
from datetime import datetime

MQTT_HOST = "localhost"
MQTT_PORT = 1883

# Topics a suscribirse
TOPICS = [
    "system/status",
    "system/postgresql",
    "system/collector",
    "system/resources",
]

def on_connect(client, userdata, flags, rc):
    print(f"✅ Conectado a MQTT (código: {rc})")
    print(f"\n📡 Suscribiéndose a topics del sistema...\n")
    for topic in TOPICS:
        client.subscribe(topic)
        print(f"  ➜ {topic}")
    print("\n" + "="*60)
    print("Esperando mensajes... (Ctrl+C para salir)")
    print("="*60 + "\n")

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        print(f"\n🔔 [{timestamp}] Topic: {msg.topic}")
        print("-" * 50)
        
        # Formatear según el topic
        if msg.topic == "system/postgresql":
            print_postgresql_stats(data)
        elif msg.topic == "system/resources":
            print_resources(data)
        elif msg.topic == "system/collector":
            print_collector_stats(data)
        else:
            print(json.dumps(data, indent=2))
            
    except Exception as e:
        print(f"❌ Error procesando mensaje: {e}")

def print_postgresql_stats(data):
    print(f"📊 POSTGRESQL STATUS")
    print(f"   Estado: {data.get('status', 'N/A')}")
    print(f"   Versión: {data.get('version', 'N/A')}")
    
    uptime = data.get('uptime', {})
    print(f"   Uptime: {uptime.get('hours', 0)} horas ({uptime.get('days', 0)} días)")
    
    db_size = data.get('database_size', {})
    print(f"   Tamaño DB: {db_size.get('mb', 0)} MB")
    
    conn = data.get('connections', {})
    print(f"   Conexiones: {conn.get('total', 0)} total, {conn.get('active', 0)} activas, {conn.get('idle', 0)} idle")
    
    perf = data.get('performance', {})
    print(f"   Cache Hit Ratio: {perf.get('cache_hit_ratio', 0)}%")
    print(f"   Inserts: {perf.get('total_inserts', 0)}, Updates: {perf.get('total_updates', 0)}, Deletes: {perf.get('total_deletes', 0)}")
    
    tx = data.get('transactions', {})
    print(f"   Transacciones: {tx.get('commits', 0)} commits, {tx.get('rollbacks', 0)} rollbacks")
    
    locks = data.get('locks', {})
    print(f"   Locks: {locks.get('total', 0)} total, {locks.get('waiting', 0)} esperando")
    
    tables = data.get('tables', {})
    print(f"   Tablas:")
    for table, count in tables.items():
        print(f"     - {table}: {count} filas")

def print_resources(data):
    print(f"💻 RECURSOS DEL SISTEMA")
    
    cpu = data.get('cpu', {})
    print(f"   CPU: {cpu.get('percent', 0)}% ({cpu.get('count', 0)} cores @ {cpu.get('freq_mhz', 0)} MHz)")
    
    mem = data.get('memory', {})
    print(f"   Memoria: {mem.get('percent', 0)}% ({mem.get('used_gb', 0)}/{mem.get('total_gb', 0)} GB)")
    
    disk = data.get('disk', {})
    print(f"   Disco: {disk.get('percent', 0)}% ({disk.get('used_gb', 0)}/{disk.get('total_gb', 0)} GB)")
    
    net = data.get('network', {})
    print(f"   Red: ↑{net.get('bytes_sent_mb', 0)} MB, ↓{net.get('bytes_recv_mb', 0)} MB")
    
    proc = data.get('collector_process', {})
    print(f"   Proceso Collector: {proc.get('memory_mb', 0)} MB RAM, {proc.get('cpu_percent', 0)}% CPU")

def print_collector_stats(data):
    print(f"📈 ESTADÍSTICAS DEL COLLECTOR")
    print(f"   Records guardados: {data.get('records_saved', 0)}")
    print(f"   Records fallidos: {data.get('records_failed', 0)}")
    print(f"   Operaciones escritura: {data.get('write_operations', 0)}")
    print(f"   Tiempo promedio escritura: {data.get('avg_write_time_ms', 0)} ms")
    print(f"   Última escritura: {data.get('last_write_time_ms', 0)} ms")
    print(f"   Uptime: {data.get('uptime_seconds', 0)} segundos")
    if data.get('last_error'):
        print(f"   ⚠️ Último error: {data.get('last_error')}")

def main():
    print("\n" + "="*60)
    print("🔍 MONITOR DE SISTEMA - MQTT")
    print("="*60)
    
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        client.connect(MQTT_HOST, MQTT_PORT, 60)
        client.loop_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Detenido")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.disconnect()

if __name__ == "__main__":
    main()
