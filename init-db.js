const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./beeper.db');

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS beepers (clientId TEXT PRIMARY KEY, beeperNumber TEXT)");
    db.run("DROP TABLE IF EXISTS allowedAreas");
    db.run("CREATE TABLE allowedAreas (id INTEGER PRIMARY KEY AUTOINCREMENT, lat REAL, lon REAL)");
});

db.close();