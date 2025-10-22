const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/radar.db');
    this.db = null;
  }

  /**
   * Initialize database connection and create tables
   */
  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
          return;
        }
        
        console.log('Connected to SQLite database');
        this.createTables().then(resolve).catch(reject);
      });
    });
  }

  /**
   * Create necessary tables
   */
  async createTables() {
    return new Promise((resolve, reject) => {
      const createRadarDataTable = `
        CREATE TABLE IF NOT EXISTS radar_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME NOT NULL,
          lat REAL NOT NULL,
          lon REAL NOT NULL,
          reflectivity REAL NOT NULL,
          precipitation TEXT NOT NULL,
          color TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createRadarMetadataTable = `
        CREATE TABLE IF NOT EXISTS radar_metadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME NOT NULL,
          source_file TEXT,
          total_points INTEGER NOT NULL,
          bounds_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createIndexes = `
        CREATE INDEX IF NOT EXISTS idx_radar_timestamp ON radar_data(timestamp);
        CREATE INDEX IF NOT EXISTS idx_radar_coords ON radar_data(lat, lon);
        CREATE INDEX IF NOT EXISTS idx_metadata_timestamp ON radar_metadata(timestamp);
      `;

      this.db.exec(createRadarDataTable, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        this.db.exec(createRadarMetadataTable, (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          this.db.exec(createIndexes, (err) => {
            if (err) {
              reject(err);
              return;
            }
            
            console.log('Database tables created successfully');
            resolve();
          });
        });
      });
    });
  }

  /**
   * Store radar data points
   */
  async storeRadarData(timestamp, radarPoints) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO radar_data (timestamp, lat, lon, reflectivity, precipitation, color)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      let completed = 0;
      let errors = 0;

      radarPoints.forEach(point => {
        stmt.run([
          timestamp,
          point.lat,
          point.lon,
          point.reflectivity,
          point.precipitation,
          point.color
        ], (err) => {
          if (err) {
            console.error('Error inserting radar point:', err.message);
            errors++;
          }
          completed++;
          
          if (completed === radarPoints.length) {
            stmt.finalize();
            if (errors > 0) {
              console.warn(`${errors} errors occurred while storing radar data`);
            }
            resolve();
          }
        });
      });
    });
  }

  /**
   * Store radar metadata
   */
  async storeRadarMetadata(timestamp, sourceFile, totalPoints, bounds) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO radar_metadata (timestamp, source_file, total_points, bounds_json)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run([
        timestamp,
        sourceFile,
        totalPoints,
        JSON.stringify(bounds)
      ], (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        stmt.finalize();
        resolve();
      });
    });
  }

  /**
   * Get latest radar data
   */
  async getLatestRadarData() {
    return new Promise((resolve, reject) => {
      // First get the latest timestamp
      this.db.get(`
        SELECT MAX(timestamp) as latest_timestamp 
        FROM radar_data
      `, (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row.latest_timestamp) {
          resolve(null);
          return;
        }

        // Get all data for the latest timestamp
        this.db.all(`
          SELECT lat, lon, reflectivity, precipitation, color
          FROM radar_data
          WHERE timestamp = ?
          ORDER BY lat, lon
        `, [row.latest_timestamp], (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          resolve({
            timestamp: row.latest_timestamp,
            data: rows
          });
        });
      });
    });
  }

  /**
   * Get radar data for a specific time range
   */
  async getRadarDataByTimeRange(startTime, endTime) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT timestamp, lat, lon, reflectivity, precipitation, color
        FROM radar_data
        WHERE timestamp BETWEEN ? AND ?
        ORDER BY timestamp DESC, lat, lon
      `, [startTime, endTime], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  /**
   * Get radar data within geographic bounds
   */
  async getRadarDataByBounds(minLat, maxLat, minLon, maxLon, timestamp = null) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT lat, lon, reflectivity, precipitation, color
        FROM radar_data
        WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?
      `;
      let params = [minLat, maxLat, minLon, maxLon];

      if (timestamp) {
        query += ` AND timestamp = ?`;
        params.push(timestamp);
      }

      query += ` ORDER BY lat, lon`;

      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  /**
   * Clean up old radar data (keep last 24 hours)
   */
  async cleanupOldData(hoursToKeep = 24) {
    return new Promise((resolve, reject) => {
      const cutoffTime = new Date(Date.now() - (hoursToKeep * 60 * 60 * 1000)).toISOString();
      
      this.db.run(`
        DELETE FROM radar_data WHERE timestamp < ?
      `, [cutoffTime], function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        console.log(`Cleaned up ${this.changes} old radar data records`);
        resolve(this.changes);
      });
    });
  }

  /**
   * Get database statistics
   */
  async getStats() {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          COUNT(*) as total_points,
          MIN(timestamp) as earliest_data,
          MAX(timestamp) as latest_data,
          COUNT(DISTINCT timestamp) as unique_timestamps
        FROM radar_data
      `, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

module.exports = new Database();
