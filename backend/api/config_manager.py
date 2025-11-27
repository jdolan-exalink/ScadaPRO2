"""
Configuration management for machine YAML files and settings.
Handles CRUD operations on machine definitions and settings.yml
"""

import os
import yaml
import json
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

logger = logging.getLogger("config_manager")

CONFIG_PATH = os.getenv("CONFIG_PATH", "/app/config")
MACHINES_DIR = os.path.join(CONFIG_PATH, "machines")
SETTINGS_FILE = os.path.join(CONFIG_PATH, "settings.yml")


# ============= MACHINE CONFIGURATION MANAGEMENT =============

def get_all_machines() -> List[Dict[str, Any]]:
    """Get all machine configuration files."""
    if not os.path.exists(MACHINES_DIR):
        return []
    
    machines = []
    for filename in os.listdir(MACHINES_DIR):
        if filename.endswith(".yml") or filename.endswith(".yaml"):
            machine_data = read_machine(filename.replace(".yml", "").replace(".yaml", ""))
            if machine_data:
                machines.append({
                    "filename": filename,
                    "code": machine_data.get("machine", {}).get("code"),
                    "name": machine_data.get("machine", {}).get("name"),
                    "data": machine_data
                })
    return machines


def read_machine(machine_code: str) -> Optional[Dict[str, Any]]:
    """Read a machine configuration file by code."""
    machine_file = os.path.join(MACHINES_DIR, f"{machine_code}.yml")
    
    if not os.path.exists(machine_file):
        logger.warning(f"Machine file not found: {machine_file}")
        return None
    
    try:
        with open(machine_file, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data
    except Exception as e:
        logger.error(f"Error reading machine file {machine_file}: {e}")
        return None


def create_machine(machine_code: str, config: Dict[str, Any]) -> bool:
    """Create a new machine configuration file."""
    machine_file = os.path.join(MACHINES_DIR, f"{machine_code}.yml")
    
    # Check if already exists
    if os.path.exists(machine_file):
        logger.warning(f"Machine file already exists: {machine_file}")
        return False
    
    try:
        os.makedirs(MACHINES_DIR, exist_ok=True)
        with open(machine_file, "w", encoding="utf-8") as f:
            yaml.dump(config, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
        logger.info(f"Machine created: {machine_file}")
        return True
    except Exception as e:
        logger.error(f"Error creating machine file {machine_file}: {e}")
        return False


def update_machine(machine_code: str, config: Dict[str, Any]) -> bool:
    """Update an existing machine configuration file."""
    machine_file = os.path.join(MACHINES_DIR, f"{machine_code}.yml")
    
    if not os.path.exists(machine_file):
        logger.warning(f"Machine file not found: {machine_file}")
        return False
    
    try:
        with open(machine_file, "w", encoding="utf-8") as f:
            yaml.dump(config, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
        logger.info(f"Machine updated: {machine_file}")
        return True
    except Exception as e:
        logger.error(f"Error updating machine file {machine_file}: {e}")
        return False


def delete_machine(machine_code: str) -> bool:
    """Delete a machine configuration file."""
    machine_file = os.path.join(MACHINES_DIR, f"{machine_code}.yml")
    
    if not os.path.exists(machine_file):
        logger.warning(f"Machine file not found: {machine_file}")
        return False
    
    try:
        os.remove(machine_file)
        logger.info(f"Machine deleted: {machine_file}")
        return True
    except Exception as e:
        logger.error(f"Error deleting machine file {machine_file}: {e}")
        return False


# ============= SETTINGS MANAGEMENT =============

def read_settings() -> Dict[str, Any]:
    """Read the settings.yml file."""
    if not os.path.exists(SETTINGS_FILE):
        logger.warning(f"Settings file not found: {SETTINGS_FILE}")
        return {}
    
    try:
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data
    except Exception as e:
        logger.error(f"Error reading settings file: {e}")
        return {}


def write_settings(settings: Dict[str, Any]) -> bool:
    """Write the settings.yml file."""
    try:
        os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            yaml.dump(settings, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
        logger.info(f"Settings updated: {SETTINGS_FILE}")
        return True
    except Exception as e:
        logger.error(f"Error writing settings file: {e}")
        return False


def get_machine_settings() -> List[Dict[str, Any]]:
    """Get the list of machines from settings.yml with their status."""
    settings = read_settings()
    machines_list = settings.get("machines", [])
    
    result = []
    for item in machines_list:
        if isinstance(item, str):
            # Item is either enabled (no comment) or disabled (starts with #)
            is_enabled = not item.strip().startswith("#")
            machine_path = item.lstrip("# ").strip()
            machine_code = os.path.basename(machine_path).replace(".yml", "").replace(".yaml", "")
            
            result.append({
                "path": machine_path,
                "code": machine_code,
                "enabled": is_enabled,
                "raw": item
            })
    
    return result


def add_machine_to_settings(machine_path: str, enabled: bool = True) -> bool:
    """Add a machine to settings.yml."""
    settings = read_settings()
    
    if "machines" not in settings:
        settings["machines"] = []
    
    # Check if already exists
    machine_settings = get_machine_settings()
    for m in machine_settings:
        if m["path"].strip().lstrip("# ").strip() == machine_path.strip():
            logger.warning(f"Machine already in settings: {machine_path}")
            return False
    
    # Add the machine
    entry = f"- {machine_path}" if enabled else f"#- {machine_path}"
    settings["machines"].append(entry)
    
    return write_settings(settings)


def remove_machine_from_settings(machine_path: str) -> bool:
    """Remove a machine from settings.yml."""
    settings = read_settings()
    
    if "machines" not in settings:
        return False
    
    original_count = len(settings["machines"])
    settings["machines"] = [
        item for item in settings["machines"]
        if item.lstrip("# ").strip() != machine_path.strip()
    ]
    
    if len(settings["machines"]) < original_count:
        return write_settings(settings)
    
    logger.warning(f"Machine not found in settings: {machine_path}")
    return False


def enable_machine_in_settings(machine_path: str) -> bool:
    """Enable a machine in settings.yml (remove # prefix)."""
    settings = read_settings()
    
    if "machines" not in settings:
        return False
    
    updated = False
    new_machines = []
    
    for item in settings["machines"]:
        item_path = item.lstrip("# ").strip()
        if item_path == machine_path.strip():
            if item.strip().startswith("#"):
                # It's disabled, enable it
                new_machines.append(f"- {item_path}")
                updated = True
            else:
                # Already enabled
                new_machines.append(item)
        else:
            new_machines.append(item)
    
    if updated:
        settings["machines"] = new_machines
        return write_settings(settings)
    
    return False


def disable_machine_in_settings(machine_path: str) -> bool:
    """Disable a machine in settings.yml (add # prefix)."""
    settings = read_settings()
    
    if "machines" not in settings:
        return False
    
    updated = False
    new_machines = []
    
    for item in settings["machines"]:
        item_path = item.lstrip("# ").strip()
        if item_path == machine_path.strip():
            if not item.strip().startswith("#"):
                # It's enabled, disable it
                new_machines.append(f"#- {item_path}")
                updated = True
            else:
                # Already disabled
                new_machines.append(item)
        else:
            new_machines.append(item)
    
    if updated:
        settings["machines"] = new_machines
        return write_settings(settings)
    
    return False


def toggle_machine_in_settings(machine_path: str) -> Optional[bool]:
    """Toggle the enabled/disabled status of a machine."""
    machine_settings = get_machine_settings()
    
    for m in machine_settings:
        if m["path"].strip() == machine_path.strip():
            if m["enabled"]:
                return not disable_machine_in_settings(machine_path)
            else:
                return not enable_machine_in_settings(machine_path)
    
    return None
