const db = require('./db');
const rows = db.prepare('SELECT id, name, category FROM clothes').all();
for (const r of rows) {
    let cat = r.category;
    if (r.name.includes('เกง') || r.name.includes('ยีน')) cat = 'กางเกง';
    else if (r.name.includes('เสื้อ')) cat = 'เสื้อ';
    db.prepare('UPDATE clothes SET category = ? WHERE id = ?').run(cat, r.id);
}
console.log('Updated clothes in DB:', db.prepare('SELECT id, name, category FROM clothes').all());
