/**
 * Board Service - Manage dashboard boards, tabs, and widget layouts
 *
 * Persists boards configuration to IndexedDB for browser persistence
 */

import { Board, BoardTab, BoardWidgetLayout, Sensor } from '../types';
import { dbManager } from './database';

const DEFAULT_BOARD_KEY = 'default_board';

class BoardService {
  private dbPromise = dbManager.getDatabase();

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all boards
   */
  async getBoards(): Promise<Board[]> {
    const db = await this.dbPromise;
    return new Promise((resolve) => {
      const transaction = db.transaction(['boards'], 'readonly');
      const store = transaction.objectStore('boards');
      const request = store.getAll();

      request.onsuccess = () => {
        const boards = request.result.map((boardData: any) => ({
          id: boardData.id,
          name: boardData.name,
          description: boardData.description,
          createdAt: boardData.created_at,
          updatedAt: boardData.updated_at,
          tabs: [] // We'll load tabs separately when needed
        }));
        resolve(boards);
      };

      request.onerror = () => {
        console.error('Error loading boards');
        resolve([]);
      };
    });
  }

  /**
   * Get single board by ID with full data
   */
  async getBoard(boardId: string): Promise<Board | null> {
    const db = await this.dbPromise;
    return new Promise((resolve) => {
      const transaction = db.transaction(['boards', 'tabs', 'widgets'], 'readonly');
      const boardsStore = transaction.objectStore('boards');
      const tabsStore = transaction.objectStore('tabs');
      const widgetsStore = transaction.objectStore('widgets');

      // Get board
      const boardRequest = boardsStore.get(boardId);
      boardRequest.onsuccess = () => {
        const boardData = boardRequest.result;
        if (!boardData) {
          resolve(null);
          return;
        }

        const board: Board = {
          id: boardData.id,
          name: boardData.name,
          description: boardData.description,
          createdAt: boardData.created_at,
          updatedAt: boardData.updated_at,
          tabs: []
        };

        // Get tabs for this board
        const tabsIndex = tabsStore.index('board_id');
        const tabsRequest = tabsIndex.getAll(boardId);
        tabsRequest.onsuccess = () => {
          const tabs = tabsRequest.result;
          let completedTabs = 0;

          if (tabs.length === 0) {
            resolve(board);
            return;
          }

          tabs.forEach((tabData: any) => {
            const tab: BoardTab = {
              id: tabData.id,
              name: tabData.name,
              machineId: tabData.machine_id,
              machineCode: tabData.machine_code,
              machineName: tabData.machine_name,
              order: tabData.order_index,
              isActive: Boolean(tabData.is_active),
              widgets: []
            };

            // Get widgets for this tab
            const widgetsIndex = widgetsStore.index('tab_id');
            const widgetsRequest = widgetsIndex.getAll(tabData.id);
            widgetsRequest.onsuccess = () => {
              tab.widgets = widgetsRequest.result.map((widgetData: any) => ({
                id: widgetData.id,
                type: widgetData.type,
                title: widgetData.title,
                sensorCode: widgetData.sensor_code,
                sensorName: widgetData.sensor_name,
                unit: widgetData.unit,
                machineId: widgetData.machine_id,
                machineCode: widgetData.machine_code,
                x: widgetData.x,
                y: widgetData.y,
                w: widgetData.w,
                h: widgetData.h,
                config: JSON.parse(widgetData.config || '{}')
              }));

              board.tabs.push(tab);
              completedTabs++;

              if (completedTabs === tabs.length) {
                resolve(board);
              }
            };
          });
        };
      };

      boardRequest.onerror = () => {
        console.error('Error loading board');
        resolve(null);
      };
    });
  }

  /**
   * Get default board
   */
  async getDefaultBoard(): Promise<Board | null> {
    const db = await this.dbPromise;
    return new Promise((resolve) => {
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(DEFAULT_BOARD_KEY);

      request.onsuccess = async () => {
        const setting = request.result;
        if (setting && setting.value) {
          const board = await this.getBoard(setting.value);
          resolve(board);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  }

  /**
   * Set default board
   */
  async setDefaultBoard(boardId: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put({ key: DEFAULT_BOARD_KEY, value: boardId });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Create new board
   */
  async createBoard(name: string, description?: string): Promise<Board> {
    const db = await this.dbPromise;
    const board: Board = {
      id: this.generateId(),
      name,
      description,
      tabs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['boards'], 'readwrite');
      const store = transaction.objectStore('boards');
      const request = store.add({
        id: board.id,
        name: board.name,
        description: board.description,
        created_at: board.createdAt,
        updated_at: board.updatedAt
      });

      request.onsuccess = () => resolve(board);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update board metadata
   */
  async updateBoard(boardId: string, updates: Partial<Omit<Board, 'id' | 'createdAt'>>): Promise<Board | null> {
    const db = await this.dbPromise;
    const board = await this.getBoard(boardId);
    if (!board) return null;

    Object.assign(board, updates, { updatedAt: new Date().toISOString() });

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['boards'], 'readwrite');
      const store = transaction.objectStore('boards');
      const request = store.put({
        id: board.id,
        name: board.name,
        description: board.description,
        created_at: board.createdAt,
        updated_at: board.updatedAt
      });

      request.onsuccess = () => resolve(board);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete board
   */
  async deleteBoard(boardId: string): Promise<boolean> {
    const db = await this.dbPromise;
    return new Promise((resolve) => {
      const transaction = db.transaction(['boards', 'settings'], 'readwrite');
      const boardsStore = transaction.objectStore('boards');
      const settingsStore = transaction.objectStore('settings');

      // Delete board
      const boardRequest = boardsStore.delete(boardId);
      boardRequest.onsuccess = () => {
        // Clear default if it was this board
        const settingsRequest = settingsStore.get(DEFAULT_BOARD_KEY);
        settingsRequest.onsuccess = () => {
          const setting = settingsRequest.result;
          if (setting && setting.value === boardId) {
            settingsStore.delete(DEFAULT_BOARD_KEY);
          }
        };
        resolve(true);
      };

      boardRequest.onerror = () => resolve(false);
    });
  }

  /**
   * Add tab to board
   */
  async addTab(boardId: string, machineId: number, machineCode: string, machineName: string): Promise<BoardTab | null> {
    const db = await this.dbPromise;
    const board = await this.getBoard(boardId);
    if (!board) return null;

    const tab: BoardTab = {
      id: this.generateId(),
      name: machineName,
      machineId,
      machineCode,
      machineName,
      widgets: [],
      order: (board.tabs?.length || 0) + 1,
      isActive: board.tabs.length === 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['tabs', 'boards'], 'readwrite');
      const tabsStore = transaction.objectStore('tabs');
      const boardsStore = transaction.objectStore('boards');

      const tabRequest = tabsStore.add({
        id: tab.id,
        board_id: boardId,
        name: tab.name,
        machine_id: tab.machineId,
        machine_code: tab.machineCode,
        machine_name: tab.machineName,
        order_index: tab.order,
        is_active: tab.isActive ? 1 : 0
      });

      tabRequest.onsuccess = () => {
        // Update board timestamp
        boardsStore.put({
          id: board.id,
          name: board.name,
          description: board.description,
          created_at: board.createdAt,
          updated_at: new Date().toISOString()
        });
        resolve(tab);
      };

      tabRequest.onerror = () => reject(tabRequest.error);
    });
  }

  /**
   * Get tab from board
   */
  async getTab(boardId: string, tabId: string): Promise<BoardTab | null> {
    const db = await this.dbPromise;
    return new Promise((resolve) => {
      const transaction = db.transaction(['tabs', 'widgets'], 'readonly');
      const tabsStore = transaction.objectStore('tabs');
      const widgetsStore = transaction.objectStore('widgets');

      const tabRequest = tabsStore.get(tabId);
      tabRequest.onsuccess = () => {
        const tabData = tabRequest.result;
        if (!tabData || tabData.board_id !== boardId) {
          resolve(null);
          return;
        }

        const tab: BoardTab = {
          id: tabData.id,
          name: tabData.name,
          machineId: tabData.machine_id,
          machineCode: tabData.machine_code,
          machineName: tabData.machine_name,
          order: tabData.order_index,
          isActive: Boolean(tabData.is_active),
          widgets: []
        };

        // Get widgets for this tab
        const widgetsIndex = widgetsStore.index('tab_id');
        const widgetsRequest = widgetsIndex.getAll(tabId);
        widgetsRequest.onsuccess = () => {
          tab.widgets = widgetsRequest.result.map((widgetData: any) => ({
            id: widgetData.id,
            type: widgetData.type,
            title: widgetData.title,
            sensorCode: widgetData.sensor_code,
            sensorName: widgetData.sensor_name,
            unit: widgetData.unit,
            machineId: widgetData.machine_id,
            machineCode: widgetData.machine_code,
            x: widgetData.x,
            y: widgetData.y,
            w: widgetData.w,
            h: widgetData.h,
            config: JSON.parse(widgetData.config || '{}')
          }));
          resolve(tab);
        };
      };

      tabRequest.onerror = () => resolve(null);
    });
  }

  /**
   * Update tab
   */
  async updateTab(boardId: string, tabId: string, updates: Partial<Omit<BoardTab, 'id' | 'machineId' | 'machineCode' | 'machineName'>>): Promise<BoardTab | null> {
    const db = await this.dbPromise;
    const tab = await this.getTab(boardId, tabId);
    if (!tab) return null;

    Object.assign(tab, updates);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['tabs', 'boards'], 'readwrite');
      const tabsStore = transaction.objectStore('tabs');
      const boardsStore = transaction.objectStore('boards');

      const request = tabsStore.put({
        id: tab.id,
        board_id: boardId,
        name: tab.name,
        machine_id: tab.machineId,
        machine_code: tab.machineCode,
        machine_name: tab.machineName,
        order_index: tab.order,
        is_active: tab.isActive ? 1 : 0
      });

      request.onsuccess = () => {
        // Update board timestamp
        boardsStore.put({
          id: boardId,
          name: '', // We'll get this from the board
          description: '',
          created_at: '',
          updated_at: new Date().toISOString()
        });
        resolve(tab);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete tab from board
   */
  async deleteTab(boardId: string, tabId: string): Promise<boolean> {
    const db = await this.dbPromise;
    return new Promise((resolve) => {
      const transaction = db.transaction(['tabs', 'boards'], 'readwrite');
      const tabsStore = transaction.objectStore('tabs');
      const boardsStore = transaction.objectStore('boards');

      const tabRequest = tabsStore.delete(tabId);
      tabRequest.onsuccess = () => {
        // Update board timestamp
        boardsStore.put({
          id: boardId,
          name: '',
          description: '',
          created_at: '',
          updated_at: new Date().toISOString()
        });
        resolve(true);
      };

      tabRequest.onerror = () => resolve(false);
    });
  }

  /**
   * Add widget to tab
   */
  async addWidget(
    boardId: string,
    tabId: string,
    widget: Omit<BoardWidgetLayout, 'id'>
  ): Promise<BoardWidgetLayout | null> {
    const db = await this.dbPromise;
    const newWidget: BoardWidgetLayout = {
      ...widget,
      id: this.generateId(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['widgets', 'boards'], 'readwrite');
      const widgetsStore = transaction.objectStore('widgets');
      const boardsStore = transaction.objectStore('boards');

      const widgetRequest = widgetsStore.add({
        id: newWidget.id,
        tab_id: tabId,
        type: newWidget.type,
        title: newWidget.title,
        sensor_code: newWidget.sensorCode,
        sensor_name: newWidget.sensorName,
        unit: newWidget.unit,
        machine_id: newWidget.machineId,
        machine_code: newWidget.machineCode,
        x: newWidget.x,
        y: newWidget.y,
        w: newWidget.w,
        h: newWidget.h,
        config: JSON.stringify(newWidget.config || {})
      });

      widgetRequest.onsuccess = () => {
        // Update board timestamp
        boardsStore.put({
          id: boardId,
          name: '',
          description: '',
          created_at: '',
          updated_at: new Date().toISOString()
        });
        resolve(newWidget);
      };

      widgetRequest.onerror = () => reject(widgetRequest.error);
    });
  }

  /**
   * Get widget from tab
   */
  async getWidget(boardId: string, tabId: string, widgetId: string): Promise<BoardWidgetLayout | null> {
    const db = await this.dbPromise;
    return new Promise((resolve) => {
      const transaction = db.transaction(['widgets'], 'readonly');
      const store = transaction.objectStore('widgets');
      const request = store.get(widgetId);

      request.onsuccess = () => {
        const widgetData = request.result;
        if (!widgetData) {
          resolve(null);
          return;
        }

        const widget: BoardWidgetLayout = {
          id: widgetData.id,
          type: widgetData.type,
          title: widgetData.title,
          sensorCode: widgetData.sensor_code,
          sensorName: widgetData.sensor_name,
          unit: widgetData.unit,
          machineId: widgetData.machine_id,
          machineCode: widgetData.machine_code,
          x: widgetData.x,
          y: widgetData.y,
          w: widgetData.w,
          h: widgetData.h,
          config: JSON.parse(widgetData.config || '{}')
        };

        resolve(widget);
      };

      request.onerror = () => resolve(null);
    });
  }

  /**
   * Update widget layout and config
   */
  async updateWidget(
    boardId: string,
    tabId: string,
    widgetId: string,
    updates: Partial<Omit<BoardWidgetLayout, 'id'>>
  ): Promise<BoardWidgetLayout | null> {
    const db = await this.dbPromise;
    const widget = await this.getWidget(boardId, tabId, widgetId);
    if (!widget) return null;

    Object.assign(widget, updates);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['widgets', 'boards'], 'readwrite');
      const widgetsStore = transaction.objectStore('widgets');
      const boardsStore = transaction.objectStore('boards');

      const request = widgetsStore.put({
        id: widget.id,
        tab_id: tabId,
        type: widget.type,
        title: widget.title,
        sensor_code: widget.sensorCode,
        sensor_name: widget.sensorName,
        unit: widget.unit,
        machine_id: widget.machineId,
        machine_code: widget.machineCode,
        x: widget.x,
        y: widget.y,
        w: widget.w,
        h: widget.h,
        config: JSON.stringify(widget.config || {})
      });

      request.onsuccess = () => {
        // Update board timestamp
        boardsStore.put({
          id: boardId,
          name: '',
          description: '',
          created_at: '',
          updated_at: new Date().toISOString()
        });
        resolve(widget);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update multiple widgets at once (for grid layout changes)
   */
  async updateWidgets(
    boardId: string,
    tabId: string,
    widgetUpdates: Array<{ id: string; updates: Partial<Omit<BoardWidgetLayout, 'id'>> }>
  ): Promise<boolean> {
    const db = await this.dbPromise;
    return new Promise((resolve) => {
      const transaction = db.transaction(['widgets', 'boards'], 'readwrite');
      const widgetsStore = transaction.objectStore('widgets');
      const boardsStore = transaction.objectStore('boards');

      let completed = 0;
      const total = widgetUpdates.length;

      if (total === 0) {
        resolve(true);
        return;
      }

      widgetUpdates.forEach(({ id, updates }) => {
        const request = widgetsStore.get(id);
        request.onsuccess = () => {
          const widgetData = request.result;
          if (widgetData) {
            Object.assign(widgetData, updates);
            const putRequest = widgetsStore.put(widgetData);
            putRequest.onsuccess = () => {
              completed++;
              if (completed === total) {
                // Update board timestamp
                boardsStore.put({
                  id: boardId,
                  name: '',
                  description: '',
                  created_at: '',
                  updated_at: new Date().toISOString()
                });
                resolve(true);
              }
            };
          } else {
            completed++;
            if (completed === total) {
              resolve(true);
            }
          }
        };
      });
    });
  }

  /**
   * Delete widget from tab
   */
  async deleteWidget(boardId: string, tabId: string, widgetId: string): Promise<boolean> {
    const db = await this.dbPromise;
    return new Promise((resolve) => {
      const transaction = db.transaction(['widgets', 'boards'], 'readwrite');
      const widgetsStore = transaction.objectStore('widgets');
      const boardsStore = transaction.objectStore('boards');

      const widgetRequest = widgetsStore.delete(widgetId);
      widgetRequest.onsuccess = () => {
        // Update board timestamp
        boardsStore.put({
          id: boardId,
          name: '',
          description: '',
          created_at: '',
          updated_at: new Date().toISOString()
        });
        resolve(true);
      };

      widgetRequest.onerror = () => resolve(false);
    });
  }

  /**
   * Delete all widgets from tab
   */
  async deleteAllWidgets(boardId: string, tabId: string): Promise<boolean> {
    const db = await this.dbPromise;
    return new Promise((resolve) => {
      const transaction = db.transaction(['widgets', 'boards'], 'readwrite');
      const widgetsStore = transaction.objectStore('widgets');
      const boardsStore = transaction.objectStore('boards');

      const index = widgetsStore.index('tab_id');
      const request = index.openCursor(IDBKeyRange.only(tabId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          // Update board timestamp
          boardsStore.put({
            id: boardId,
            name: '',
            description: '',
            created_at: '',
            updated_at: new Date().toISOString()
          });
          resolve(true);
        }
      };

      request.onerror = () => resolve(false);
    });
  }

  /**
   * Get all widgets from tab
   */
  async getTabWidgets(boardId: string, tabId: string): Promise<BoardWidgetLayout[]> {
    const tab = await this.getTab(boardId, tabId);
    return tab?.widgets || [];
  }

  /**
   * Export board as JSON
   */
  async exportBoard(boardId: string): Promise<string | null> {
    const board = await this.getBoard(boardId);
    if (!board) return null;
    return JSON.stringify(board, null, 2);
  }

  /**
   * Import board from JSON
   */
  async importBoard(jsonStr: string): Promise<Board | null> {
    try {
      const imported = JSON.parse(jsonStr);
      // Generate new ID to avoid conflicts
      imported.id = this.generateId();
      imported.createdAt = new Date().toISOString();
      imported.updatedAt = new Date().toISOString();

      // Regenerate IDs for tabs and widgets
      imported.tabs = imported.tabs.map((tab: BoardTab) => ({
        ...tab,
        id: this.generateId(),
        widgets: tab.widgets.map((w: BoardWidgetLayout) => ({
          ...w,
          id: this.generateId(),
        })),
      }));

      // Create board in database
      await this.createBoard(imported.name, imported.description);

      // Add tabs and widgets
      for (const tab of imported.tabs) {
        await this.addTab(imported.id, tab.machineId, tab.machineCode, tab.machineName);
        const createdTab = await this.getTab(imported.id, tab.id);
        if (createdTab) {
          for (const widget of tab.widgets) {
            await this.addWidget(imported.id, createdTab.id, widget);
          }
        }
      }

      return imported;
    } catch (error) {
      console.error('Error importing board:', error);
      return null;
    }
  }

  /**
   * Initialize with sample board if none exist
   */
  async initializeSampleBoard(): Promise<Board | null> {
    const boards = await this.getBoards();
    if (boards.length > 0) return null;

    const board = await this.createBoard('Mi Primer Tablero', 'Tablero inicial para configurar tus máquinas');
    return board;
  }

  /**
   * Migrate data from localStorage to IndexedDB (one-time migration)
   */
  async migrateFromLocalStorage(): Promise<void> {
    try {
      const data = localStorage.getItem('scada_boards');
      if (!data) return;

      const boards: Board[] = JSON.parse(data);
      console.log('Migrating', boards.length, 'boards from localStorage to IndexedDB...');

      for (const board of boards) {
        await this.createBoard(board.name, board.description);

        for (const tab of board.tabs) {
          await this.addTab(board.id, tab.machineId, tab.machineCode, tab.machineName);
          const createdTab = await this.getTab(board.id, tab.id);
          if (createdTab) {
            for (const widget of tab.widgets) {
              await this.addWidget(board.id, createdTab.id, widget);
            }
          }
        }
      }

      // Set default board if exists
      const defaultBoardId = localStorage.getItem('default_board');
      if (defaultBoardId) {
        await this.setDefaultBoard(defaultBoardId);
      }

      // Mark migration as complete
      localStorage.setItem('migration_completed', 'true');
      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Error migrating from localStorage:', error);
    }
  }

  /**
   * Initialize service and perform migration if needed
   */
  async initialize(): Promise<void> {
    const migrationCompleted = localStorage.getItem('migration_completed');
    if (!migrationCompleted) {
      await this.migrateFromLocalStorage();
    }

    // Initialize sample board if no boards exist
    const boards = await this.getBoards();
    if (boards.length === 0) {
      await this.initializeSampleBoard();
    }
  }
}

export const boardService = new BoardService();