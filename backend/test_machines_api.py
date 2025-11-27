#!/usr/bin/env python3
"""
Script de prueba para los nuevos endpoints de gestión de máquinas.
Demuestra cómo usar los endpoints para:
1. Crear, leer, actualizar y eliminar máquinas (archivos YAML)
2. Agregar, remover, activar y desactivar máquinas en settings.yml
"""

import requests
import json
import urllib.parse
from pprint import pprint

# Configuración
API_URL = "http://localhost:8000/api"
AUTH_TOKEN = "Bearer YOUR_TOKEN_HERE"  # Reemplazar con tu token

headers = {
    "Authorization": AUTH_TOKEN,
    "Content-Type": "application/json"
}

def print_section(title):
    """Imprime un separador de sección"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

# ============= PRUEBAS DE MÁQUINAS (YAML) =============

def test_list_machines():
    """Listar todas las máquinas"""
    print_section("1. Listar máquinas configuradas")
    response = requests.get(f"{API_URL}/machines-config", headers=headers)
    print(f"Status: {response.status_code}")
    pprint(response.json())
    return response.json()

def test_get_machine(machine_code):
    """Obtener una máquina específica"""
    print_section(f"2. Obtener máquina: {machine_code}")
    response = requests.get(f"{API_URL}/machines-config/{machine_code}", headers=headers)
    print(f"Status: {response.status_code}")
    pprint(response.json())
    return response.json()

def test_create_machine():
    """Crear una nueva máquina"""
    print_section("3. Crear nueva máquina")
    
    new_machine = {
        "machine_code": "test_machine",
        "machine_name": "Máquina de Prueba",
        "config": {
            "machine": {
                "code": "test_machine",
                "name": "Máquina de Prueba"
            },
            "plc": {
                "code": "test_plc",
                "name": "PLC de Prueba",
                "protocol": "modbus_tcp",
                "ip_address": "192.168.1.100",
                "port": 502,
                "unit_id": 1,
                "poll_interval_s": 1,
                "enabled": True
            },
            "sensors": [
                {
                    "code": "test_temp",
                    "name": "Temperatura de Prueba",
                    "type": "temperature",
                    "unit": "°C",
                    "address": 100,
                    "function_code": 3,
                    "scale_factor": 1.0,
                    "offset": 0.0,
                    "data_type": "int16"
                }
            ]
        }
    }
    
    response = requests.post(f"{API_URL}/machines-config", json=new_machine, headers=headers)
    print(f"Status: {response.status_code}")
    pprint(response.json())
    return response.json()

def test_update_machine(machine_code):
    """Actualizar una máquina"""
    print_section(f"4. Actualizar máquina: {machine_code}")
    
    # Primero obtener la configuración actual
    response = requests.get(f"{API_URL}/machines-config/{machine_code}", headers=headers)
    current_config = response.json()["data"]
    
    # Modificar algo
    current_config["machine"]["name"] = "Máquina de Prueba Actualizada"
    
    update_data = {
        "config": current_config
    }
    
    response = requests.put(f"{API_URL}/machines-config/{machine_code}", json=update_data, headers=headers)
    print(f"Status: {response.status_code}")
    pprint(response.json())
    return response.json()

def test_delete_machine(machine_code):
    """Eliminar una máquina"""
    print_section(f"5. Eliminar máquina: {machine_code}")
    
    response = requests.delete(f"{API_URL}/machines-config/{machine_code}", headers=headers)
    print(f"Status: {response.status_code}")
    pprint(response.json())
    return response.json()

# ============= PRUEBAS DE SETTINGS =============

def test_list_settings():
    """Listar máquinas en settings.yml"""
    print_section("6. Listar máquinas en settings.yml")
    
    response = requests.get(f"{API_URL}/machines-settings", headers=headers)
    print(f"Status: {response.status_code}")
    pprint(response.json())
    return response.json()

def test_add_to_settings(machine_path, enabled=True):
    """Agregar máquina a settings.yml"""
    print_section(f"7. Agregar máquina a settings: {machine_path} (enabled={enabled})")
    
    data = {
        "path": machine_path,
        "enabled": enabled
    }
    
    response = requests.post(f"{API_URL}/machines-settings", json=data, headers=headers)
    print(f"Status: {response.status_code}")
    pprint(response.json())
    return response.json()

def test_update_settings(machine_path, enabled):
    """Actualizar estado de máquina en settings"""
    print_section(f"8. Actualizar máquina en settings: {machine_path} (enabled={enabled})")
    
    # URL encode del path
    encoded_path = urllib.parse.quote(machine_path, safe='')
    
    data = {
        "path": machine_path,
        "enabled": enabled
    }
    
    response = requests.put(f"{API_URL}/machines-settings/{encoded_path}", json=data, headers=headers)
    print(f"Status: {response.status_code}")
    pprint(response.json())
    return response.json()

def test_toggle_settings(machine_path):
    """Invertir estado de máquina en settings"""
    print_section(f"9. Invertir estado de máquina: {machine_path}")
    
    # URL encode del path
    encoded_path = urllib.parse.quote(machine_path, safe='')
    
    response = requests.post(f"{API_URL}/machines-settings/{encoded_path}/toggle", headers=headers)
    print(f"Status: {response.status_code}")
    pprint(response.json())
    return response.json()

def test_remove_from_settings(machine_path):
    """Remover máquina de settings.yml"""
    print_section(f"10. Remover máquina de settings: {machine_path}")
    
    # URL encode del path
    encoded_path = urllib.parse.quote(machine_path, safe='')
    
    response = requests.delete(f"{API_URL}/machines-settings/{encoded_path}", headers=headers)
    print(f"Status: {response.status_code}")
    pprint(response.json())
    return response.json()

# ============= MAIN =============

if __name__ == "__main__":
    print("\n" + "="*60)
    print("  PRUEBAS DE ENDPOINTS DE GESTIÓN DE MÁQUINAS")
    print("="*60)
    
    print("\n⚠️  ANTES DE EJECUTAR:")
    print("1. Asegúrate de que el API está corriendo en http://localhost:8000")
    print("2. Reemplaza AUTH_TOKEN con tu token válido")
    print("3. Algunos endpoints pueden fallar si las máquinas no existen\n")
    
    try:
        # Pruebas de lectura (no destructivas)
        print("\n📖 PRUEBAS DE LECTURA:\n")
        machines = test_list_machines()
        
        if machines:
            first_machine = machines[0]
            test_get_machine(first_machine["machine_code"])
        
        settings = test_list_settings()
        
        # Pruebas de escritura (comentar si no quieres ejecutarlas)
        print("\n✏️  PRUEBAS DE ESCRITURA (CREAR/ACTUALIZAR/ELIMINAR):\n")
        
        # Crear máquina
        # test_create_machine()
        # test_update_machine("test_machine")
        # test_add_to_settings("machines/test_machine.yml", enabled=True)
        # test_toggle_settings("machines/test_machine.yml")
        # test_remove_from_settings("machines/test_machine.yml")
        # test_delete_machine("test_machine")
        
        print("\n✅ Pruebas completadas!")
        print("\nNOTA: Las pruebas de escritura están comentadas para evitar modificar datos.")
        print("Descomenta las líneas en la sección 'PRUEBAS DE ESCRITURA' para ejecutarlas.\n")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: No se pudo conectar a la API.")
        print("Asegúrate de que el servidor está corriendo en http://localhost:8000\n")
    except Exception as e:
        print(f"\n❌ ERROR: {e}\n")
