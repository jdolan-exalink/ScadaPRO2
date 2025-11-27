/**
 * Sample Boards Data - Para demostración y testing
 * 
 * Este archivo contiene datos de ejemplo que se pueden usar para
 * proporcionar un tablero preconfigurado a los usuarios.
 */

import { Board, BoardTab, BoardWidgetLayout } from '../../types';

export const sampleBoard: Board = {
  id: 'sample-board-001',
  name: 'Tablero de Producción',
  description: 'Panel de control principal para monitoreo de máquinas en planta',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tabs: [
    {
      id: 'tab-sec21',
      name: 'Sección 21',
      machineId: 1,
      machineCode: 'SEC21',
      machineName: 'Sección 21 - Enfriamiento',
      order: 1,
      isActive: true,
      widgets: [
        {
          id: 'widget-temp-1',
          type: 'gauge',
          title: 'Temperatura Actual',
          sensorCode: 'temperatura_medida_sec21',
          sensorName: 'Temperatura Medida',
          unit: '°C',
          machineId: 1,
          machineCode: 'SEC21',
          x: 0,
          y: 0,
          w: 1,
          h: 1,
          config: {
            min: 0,
            max: 100,
            threshold: 85,
          },
        },
        {
          id: 'widget-humidity-1',
          type: 'gauge',
          title: 'Humedad',
          sensorCode: 'humedad_medida_sec21',
          sensorName: 'Humedad Medida',
          unit: '%',
          machineId: 1,
          machineCode: 'SEC21',
          x: 1,
          y: 0,
          w: 1,
          h: 1,
          config: {
            min: 0,
            max: 100,
          },
        },
        {
          id: 'widget-velocity-1',
          type: 'kpi',
          title: 'Velocidad de Motor',
          sensorCode: 'velocidad_motor_sec21',
          sensorName: 'Velocidad Motor',
          unit: 'RPM',
          machineId: 1,
          machineCode: 'SEC21',
          x: 2,
          y: 0,
          w: 1,
          h: 1,
          config: {},
        },
        {
          id: 'widget-pressure-1',
          type: 'gauge',
          title: 'Presión del Sistema',
          sensorCode: 'presion_sistema_sec21',
          sensorName: 'Presión Sistema',
          unit: 'PSI',
          machineId: 1,
          machineCode: 'SEC21',
          x: 3,
          y: 0,
          w: 1,
          h: 1,
          config: {
            min: 0,
            max: 150,
            threshold: 120,
          },
        },
        {
          id: 'widget-status-1',
          type: 'status',
          title: 'Estado Máquina',
          sensorCode: 'estado_maquina_sec21',
          sensorName: 'Estado Máquina',
          unit: 'Estado',
          machineId: 1,
          machineCode: 'SEC21',
          x: 0,
          y: 1,
          w: 1,
          h: 1,
          config: {},
        },
        {
          id: 'widget-chart-1',
          type: 'line_chart',
          title: 'Historial Temperatura (1h)',
          sensorCode: 'temperatura_medida_sec21',
          sensorName: 'Temperatura Medida',
          unit: '°C',
          machineId: 1,
          machineCode: 'SEC21',
          x: 1,
          y: 1,
          w: 2,
          h: 1,
          config: {
            timeRange: '1h',
          },
        },
      ],
    },
    {
      id: 'tab-sec22',
      name: 'Sección 22',
      machineId: 2,
      machineCode: 'SEC22',
      machineName: 'Sección 22 - Procesamiento',
      order: 2,
      isActive: false,
      widgets: [
        {
          id: 'widget-program-1',
          type: 'status',
          title: 'Programa Actual',
          sensorCode: 'programa_sec22',
          sensorName: 'Programa Secuencia',
          unit: 'Programa',
          machineId: 2,
          machineCode: 'SEC22',
          x: 0,
          y: 0,
          w: 2,
          h: 1,
          config: {},
        },
        {
          id: 'widget-efficiency-1',
          type: 'kpi',
          title: 'Eficiencia',
          sensorCode: 'eficiencia_sec22',
          sensorName: 'Eficiencia',
          unit: '%',
          machineId: 2,
          machineCode: 'SEC22',
          x: 2,
          y: 0,
          w: 1,
          h: 1,
          config: {},
        },
      ],
    },
  ],
};

/**
 * Función para inicializar con datos de ejemplo
 * Usar solo para demostración
 */
export function initializeSampleBoards() {
  // Esta función podría ser usada para poblar boards de ejemplo
  // en localStorage durante la primera ejecución
  console.log('Sample boards data available for import');
}
