import db from './database.js';
db.all("SELECT * FROM messages ORDER BY id DESC LIMIT 5", [], (err, rows) => {
  console.log(err || rows);
});
