const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = process.env.SQLITE_PATH || path.join(__dirname, 'longlook.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON;');
db.exec(`
    -- 1. ตารางผู้ใช้งาน
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        password TEXT NOT NULL,
        gender TEXT DEFAULT 'unisex',
        skintone TEXT DEFAULT 'warm',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. ตารางหมวดหมู่เสื้อผ้า (CATEGORY)
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_name TEXT UNIQUE NOT NULL,
        description TEXT
    );

    -- 3. ตารางสไตล์ (STYLE)
    CREATE TABLE IF NOT EXISTS styles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        style_name TEXT UNIQUE NOT NULL,
        description TEXT
    );

    -- 4. ตารางสภาพอากาศ (WEATHER)
    CREATE TABLE IF NOT EXISTS weathers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        weather_name TEXT UNIQUE NOT NULL,
        temperature_range TEXT
    );

    -- 5. ตารางโอกาส/สถานที่ (OCCASION)
    CREATE TABLE IF NOT EXISTS occasions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        occasion_name TEXT UNIQUE NOT NULL,
        description TEXT
    );

    -- 6. ตารางเสื้อผ้า/ไอเทม (CLOTHING_ITEM)
    CREATE TABLE IF NOT EXISTS clothes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        category TEXT,
        color TEXT,
        style TEXT,
        gender TEXT DEFAULT 'unisex',
        image TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 7. ตารางชุดแต่งกาย (OUTFIT)
    CREATE TABLE IF NOT EXISTS outfits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        outfit_name TEXT NOT NULL,
        description TEXT,
        style TEXT DEFAULT 'CASUAL',
        image TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 8. ตารางความสัมพันธ์ชุดกับชิ้นเสื้อผ้า (OUTFIT_ITEM)
    CREATE TABLE IF NOT EXISTS outfit_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        outfit_id INTEGER NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
        cloth_id INTEGER REFERENCES clothes(id) ON DELETE SET NULL,
        cloth_name TEXT,
        cloth_image TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 9. ตารางบันทึกปฏิทิน (CALENDAR_LOG)
    CREATE TABLE IF NOT EXISTS calendar_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        outfit_id INTEGER REFERENCES outfits(id) ON DELETE SET NULL,
        title TEXT,
        style TEXT,
        image TEXT,
        log_date TEXT,
        occasion TEXT,
        weather TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 10. ตารางบันทึกประวัติการกระทำ (AUDIT_LOG)
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id INTEGER,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

// ตรวจสอบและเพิ่มคอลัมน์ใน calendar_logs อัตโนมัติหากมี DB เดิมอยู่แล้ว
try {
    const cols = db.prepare('PRAGMA table_info(calendar_logs)').all().map(c => c.name);
    if (!cols.includes('outfit_id')) db.prepare('ALTER TABLE calendar_logs ADD COLUMN outfit_id INTEGER REFERENCES outfits(id) ON DELETE SET NULL').run();
    if (!cols.includes('occasion')) db.prepare('ALTER TABLE calendar_logs ADD COLUMN occasion TEXT').run();
    if (!cols.includes('weather')) db.prepare('ALTER TABLE calendar_logs ADD COLUMN weather TEXT').run();
} catch (e) {
    console.error('Migration error:', e);
}

// เติมข้อมูลตั้งต้น (Seed Initial Master Data)
const initialCategories = ['เสื้อ', 'กางเกง', 'กระโปรง', 'เดรส', 'อื่นๆ'];
for (const cat of initialCategories) {
    db.prepare('INSERT OR IGNORE INTO categories (category_name) VALUES (?)').run(cat);
}

const initialStyles = ['CASUAL', 'KOREAN', 'STREETWEAR', 'VINTAGE', 'FORMAL', 'SPORTY'];
for (const st of initialStyles) {
    db.prepare('INSERT OR IGNORE INTO styles (style_name) VALUES (?)').run(st);
}

const initialOccasions = ['ไปเรียน / ไปทำงาน', 'เดินเล่น / ไปคาเฟ่', 'ออกเดท / ไปเที่ยว', 'งานทางการ / งานสัมมนา', 'ออกกำลังกาย', 'ปาร์ตี้ / สังสรรค์', 'อยู่บ้าน / วันชิลล์ๆ'];
for (const occ of initialOccasions) {
    db.prepare('INSERT OR IGNORE INTO occasions (occasion_name) VALUES (?)').run(occ);
}

const initialWeathers = ['แจ่มใส', 'มีเมฆมาก', 'ฝนตก', 'อากาศร้อน', 'อากาศหนาว'];
for (const w of initialWeathers) {
    db.prepare('INSERT OR IGNORE INTO weathers (weather_name) VALUES (?)').run(w);
}

try {
    db.exec("ALTER TABLE clothes ADD COLUMN gender TEXT DEFAULT 'unisex';");
} catch (e) {}

module.exports = db;
