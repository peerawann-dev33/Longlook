require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./db');
const { initFirebase, mirror, deleteDoc, isFirebaseEnabled } = require('./firebase');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'longlook_super_secret_key_2026';

initFirebase();

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, '..')));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'cloth-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(req, file, cb) {
        if (!file.mimetype.match(/^image\/(jpeg|png|jpg)$/)) {
            return cb(new Error('กรุณาอัปโหลดเฉพาะไฟล์รูปภาพ JPEG หรือ PNG เท่านั้น'));
        }
        cb(null, true);
    }
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'โปรดเข้าสู่ระบบก่อนใช้งาน' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
        req.user = user;
        next();
    });
}

function publicUser(row) {
    return {
        id: row.id,
        username: row.username,
        email: row.email,
        gender: row.gender,
        skintone: row.skintone
    };
}

app.get('/api/health', (req, res) => {
    res.json({
        sqlite: true,
        firebase: isFirebaseEnabled(),
        message: isFirebaseEnabled()
            ? 'SQLite เป็นฐานหลัก และซิงค์ขึ้น Firebase'
            : 'SQLite พร้อมแล้ว ตั้งค่า Firebase ใน .env เพื่อซิงค์คลาวด์'
    });
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
        }

        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) return res.status(400).json({ message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = db.prepare(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)'
        ).run(username, email || `${username}@longlook.app`, hashedPassword);

        const newUser = db.prepare('SELECT id, username, email, gender, skintone FROM users WHERE id = ?')
            .get(result.lastInsertRowid);

        await mirror('users', newUser.id, publicUser(newUser));

        const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ message: 'ลงทะเบียนสำเร็จ', token, user: newUser });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลผู้ใช้' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) return res.status(400).json({ message: 'ไม่พบชื่อผู้ใช้นี้ในระบบ' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ message: 'รหัสผ่านไม่ถูกต้อง' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            message: 'เข้าสู่ระบบสำเร็จ',
            token,
            user: { id: user.id, username: user.username }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดทางเซิร์ฟเวอร์' });
    }
});

app.post('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const { gender, skinTone } = req.body;
        db.prepare('UPDATE users SET gender = ?, skintone = ? WHERE id = ?')
            .run(gender, skinTone, req.user.id);

        const user = db.prepare('SELECT id, username, email, gender, skintone FROM users WHERE id = ?')
            .get(req.user.id);
        await mirror('users', user.id, publicUser(user));

        res.json({ message: 'บันทึกข้อมูลโทนสีผิวและเพศเรียบร้อยแล้ว' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'บันทึกโปรไฟล์ไม่สำเร็จ' });
    }
});

app.get('/api/clothes', authenticateToken, (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM clothes WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'ดึงข้อมูลเสื้อผ้าไม่สำเร็จ' });
    }
});

app.post('/api/clothes', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { name, category, color, style, image } = req.body;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : (image || 'https://via.placeholder.com/150');

        const result = db.prepare(
            'INSERT INTO clothes (user_id, name, category, color, style, image) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(req.user.id, name || 'เสื้อผ้าใหม่', category || 'เสื้อ', color || 'ไม่ระบุ', style || 'CASUAL', imageUrl);

        const cloth = db.prepare('SELECT * FROM clothes WHERE id = ?').get(result.lastInsertRowid);
        await mirror('clothes', cloth.id, { ...cloth });

        res.status(201).json({ message: 'บันทึกเสื้อผ้าลง SQLite และซิงค์ Firebase แล้ว', cloth });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'บันทึกเสื้อผ้าไม่สำเร็จ' });
    }
});

app.delete('/api/clothes/:id', authenticateToken, async (req, res) => {
    try {
        const clothId = req.params.id;
        const cloth = db.prepare('SELECT * FROM clothes WHERE id = ? AND user_id = ?').get(clothId, req.user.id);
        if (!cloth) {
            return res.status(404).json({ message: 'ไม่พบเสื้อผ้านี้ หรือคุณไม่มีสิทธิ์ลบ' });
        }

        db.prepare('DELETE FROM clothes WHERE id = ? AND user_id = ?').run(clothId, req.user.id);
        await deleteDoc('clothes', clothId);

        res.json({ message: 'ลบเสื้อผ้าออกจาก SQLite และ Firebase สำเร็จแล้ว' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบเสื้อผ้า' });
    }
});

app.get('/api/calendar', authenticateToken, (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM calendar_logs WHERE user_id = ? ORDER BY log_date DESC, id DESC')
            .all(req.user.id);
        
        // แนบรายการ outfit_items เข้าไปในแต่ละ log เพื่อให้หน้าปฏิทินแสดงผลไอเทมได้อย่างถูกต้อง
        const rowsWithItems = rows.map(r => {
            const items = r.outfit_id ? db.prepare('SELECT id, cloth_name AS name, cloth_image AS image FROM outfit_items WHERE outfit_id = ?').all(r.outfit_id) : [];
            return {
                ...r,
                items: items
            };
        });

        res.json(rowsWithItems);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'ดึงข้อมูลปฏิทินไม่สำเร็จ' });
    }
});

app.post('/api/calendar', authenticateToken, async (req, res) => {
    try {
        const { title, style, image, log_date, occasion, weather, items } = req.body;
        const logDate = log_date || new Date().toISOString().slice(0, 10);
        const outfitTitle = title || 'ลุคประจำวัน';

        // 1. บันทึกลงตาราง OUTFIT (ตาม ER Diagram)
        const outfitRes = db.prepare(
            'INSERT INTO outfits (user_id, outfit_name, description, style, image) VALUES (?, ?, ?, ?, ?)'
        ).run(req.user.id, outfitTitle, 'บันทึกจากระบบการแต่งตัว', style || 'CASUAL', image || '');

        const outfitId = outfitRes.lastInsertRowid;
        const outfit = db.prepare('SELECT * FROM outfits WHERE id = ?').get(outfitId);
        await mirror('outfits', outfit.id, { ...outfit });

        // 2. ถ้ามีรายการเสื้อผ้าในชุด ให้บันทึกลงตาราง OUTFIT_ITEM (ตาม ER Diagram)
        if (Array.isArray(items) && items.length > 0) {
            for (const it of items) {
                db.prepare(
                    'INSERT INTO outfit_items (outfit_id, cloth_id, cloth_name, cloth_image) VALUES (?, ?, ?, ?)'
                ).run(outfitId, it.id || null, it.name || '', it.image || '');
            }
            await mirror('outfit_items', `outfit_${outfitId}`, { outfit_id: outfitId, items: items });
        }

        // 3. บันทึกลงตาราง CALENDAR_LOG (ตาม ER Diagram)
        const result = db.prepare(
            'INSERT INTO calendar_logs (user_id, outfit_id, title, style, image, log_date, occasion, weather) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(req.user.id, outfitId, outfitTitle, style || 'CASUAL', image || '', logDate, occasion || 'ทั่วไป', weather || 'แจ่มใส');

        const log = db.prepare('SELECT * FROM calendar_logs WHERE id = ?').get(result.lastInsertRowid);
        await mirror('calendar_logs', log.id, { ...log });

        // 4. บันทึกลงตาราง AUDIT_LOG (ตาม ER Diagram)
        db.prepare(
            'INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?, ?, ?, ?, ?)'
        ).run(req.user.id, 'CREATE_OUTFIT_AND_CALENDAR_LOG', 'outfits', outfitId, `Created outfit ${outfitTitle}`);

        res.status(201).json({ message: 'บันทึก Outfit และ ปฏิทินลง SQLite และซิงค์ Firebase แล้ว', log, outfitId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'บันทึกปฏิทินไม่สำเร็จ' });
    }
});

// ลบประวัติปฏิทินของวันที่กำหนด
app.delete('/api/calendar/date/:date', authenticateToken, async (req, res) => {
    try {
        const { date } = req.params;
        const logs = db.prepare('SELECT id, outfit_id FROM calendar_logs WHERE user_id = ? AND log_date = ?').all(req.user.id, date);
        for (const l of logs) {
            db.prepare('DELETE FROM calendar_logs WHERE id = ?').run(l.id);
            if (l.outfit_id) {
                db.prepare('DELETE FROM outfit_items WHERE outfit_id = ?').run(l.outfit_id);
                db.prepare('DELETE FROM outfits WHERE id = ?').run(l.outfit_id);
            }
        }
        res.json({ message: 'ลบข้อมูลปฏิทินของวันที่เลือกเรียบร้อยแล้ว' });
    } catch (e) {
        console.error('Delete calendar date error:', e);
        res.status(500).json({ message: 'ลบข้อมูลไม่สำเร็จ' });
    }
});

// ลบรายการปฏิทินตาม id
app.delete('/api/calendar/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const log = db.prepare('SELECT * FROM calendar_logs WHERE id = ? AND user_id = ?').get(id, req.user.id);
        if (log) {
            db.prepare('DELETE FROM calendar_logs WHERE id = ?').run(id);
            if (log.outfit_id) {
                db.prepare('DELETE FROM outfit_items WHERE outfit_id = ?').run(log.outfit_id);
                db.prepare('DELETE FROM outfits WHERE id = ?').run(log.outfit_id);
            }
        }
        res.json({ message: 'ลบรายการสำเร็จ' });
    } catch (e) {
        console.error('Delete calendar log error:', e);
        res.status(500).json({ message: 'ลบข้อมูลไม่สำเร็จ' });
    }
});

// Endpoint ดึงประวัติ Outfits ทั้งหมดของผู้ใช้
app.get('/api/outfits', authenticateToken, (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM outfits WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'ดึงข้อมูล Outfits ไม่สำเร็จ' });
    }
});

app.get('/api/weather', async (req, res) => {
    try {
        const apiKey = process.env.OPENWEATHER_API_KEY;
        if (!apiKey) return res.json({ temp: 25, condition: 'แจ่มใส', style: 'Casual' });
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Bangkok&units=metric&appid=${apiKey}&lang=th`);
        const data = await response.json();
        res.json({ temp: Math.round(data.main.temp), condition: data.weather[0]?.description || 'แจ่มใส', style: 'Casual' });
    } catch (err) {
        res.json({ temp: 25, condition: 'แจ่มใส', style: 'Casual' });
    }
});

const LOOK_CATALOG = [
    // Female
    {
        gender: 'female',
        skinTone: 'warm',
        title: 'เอิร์ธโทนคาเฟ่ชิลล์ (Warm Casual)',
        style: 'Casual',
        color_tone: 'ครีม, เบจ, คาราเมล',
        reason: 'โทนสีเบจและเอิร์ธโทนช่วยขับผิว Warm Tone ให้ดูสดใส อบอุ่น แมตช์ง่าย เหมาะกับคาเฟ่หรือเดินเล่นวันสบายๆ',
        pieces: {
            top: 'เสื้อเชิ้ตแขนสั้นผ้าลินินสีครีม',
            bottom: 'กางเกงขายาวทรงกระบอกสีน้ำตาลอ่อน',
            shoes: 'รองเท้าผ้าใบสีขาวมินิมอล',
            accessory: 'กระเป๋าผ้าแคนวาส + สร้อยสีทองเส้นเล็ก'
        },
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop',
        pinterest_query: 'korean casual outfit warm tone women'
    },
    {
        gender: 'female',
        skinTone: 'cool',
        title: 'มินิมอลพาสเทลสายเกา (Cool Minimal)',
        style: 'Korean Minimal',
        color_tone: 'ฟ้าพาสเทล, เทาอ่อน, ขาว',
        reason: 'โทนสีฟ้าพาสเทลและสีขาวช่วยขับผิว Cool Tone ให้ดูผ่องใส ออร่าละมุนตา และดูสะอาดสะอ้าน',
        pieces: {
            top: 'เสื้อคาร์ดิแกนไหมพรมบางสีฟ้าพาสเทล',
            bottom: 'กระโปรงพลีทหรือกางเกงสีขาวงาช้าง',
            shoes: 'รองเท้าแมรี่เจนหรือสนีกเกอร์ขาว',
            accessory: 'กระเป๋าสะพายไหล่สีเงินเมทัลลิก'
        },
        image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop',
        pinterest_query: 'korean pastel outfit cool tone women'
    },
    {
        gender: 'female',
        skinTone: 'neutral',
        title: 'ซิตี้เกิร์ลสตรีทชิค (City Streetwear)',
        style: 'Streetwear',
        color_tone: 'ดำ, ยีนส์เข้ม, ขาว',
        reason: 'ผิว Neutral Tone แมตช์คู่สีตัดกันสไตล์ Black & Denim ได้สวยคม เสริมลุคมั่นใจ กระฉับกระเฉง',
        pieces: {
            top: 'เสื้อครอปสีดำเรียบเท่',
            bottom: 'กางเกงคาร์โก้ยีนส์เอวสูง',
            shoes: 'รองเท้าผ้าใบ Chunky Sneakers',
            accessory: 'หมวกแก๊ปสีดำ + กระเป๋า Crossbody'
        },
        image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&auto=format&fit=crop',
        pinterest_query: 'streetwear outfit aesthetic women'
    },
    // Male
    {
        gender: 'male',
        skinTone: 'warm',
        title: 'เจแปนนีสเอิร์ธโทน (Warm Casual Boy)',
        style: 'Japanese Casual',
        color_tone: 'โอลีฟ, กากี, เบจ',
        reason: 'เฉดสีเขียวโอลีฟและกากีช่วยขับออร่าผิว Warm Tone ให้ดูสุขุม เท่ สบายตาแบบมินิมอลญี่ปุ่น',
        pieces: {
            top: 'เสื้อเชิ้ตโอเวอร์ไซส์สีเขียวโอลีฟสวมทับเสื้อยืดขาว',
            bottom: 'กางเกงชิโน่ขากระบอกสีเบจ',
            shoes: 'รองเท้าผ้าใบผ้าแคนวาส',
            accessory: 'หมวกบักเก็ตผ้าคอตตอน + นาฬิกาสายหนัง'
        },
        image: 'https://images.unsplash.com/photo-1516826957135-700dedea698c?w=600&auto=format&fit=crop',
        pinterest_query: 'japanese casual style warm tone men'
    },
    {
        gender: 'male',
        skinTone: 'cool',
        title: 'สมาร์ทมินิมอลโมเดิร์น (Cool Smart Casual)',
        style: 'Smart Casual',
        color_tone: 'สีกรมท่า, ขาว, เทา',
        reason: 'โทนสี Navy Blue และสีเทา ช่วยขับผิว Cool Tone ให้ดูคมชัด บุคลิกดีและดูโปร่งสบาย',
        pieces: {
            top: 'เสื้อโปโลไหมพรมสีกรมท่า',
            bottom: 'กางเกงสแล็คสีเทาควันบุหรี่',
            shoes: 'รองเท้าโลฟเฟอร์หนังกลับหรือสนีกเกอร์คลีนๆ',
            accessory: 'นาฬิกาข้อมือสายสแตนเลสสีเงิน'
        },
        image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=600&auto=format&fit=crop',
        pinterest_query: 'mens smart casual cool tone outfit'
    },
    {
        gender: 'male',
        skinTone: 'neutral',
        title: 'สตรีทบอยยีนส์คลาสสิก (Urban Street)',
        style: 'Streetwear',
        color_tone: 'ยีนส์ฟอก, ขาว, ดำ',
        reason: 'โทนยีนส์คลาสสิกและเสื้อยืดขาวเข้าได้กับทุกสีผิว ดูเท่ คล่องตัว เหมาะกับทุกกิจกรรมประจำวัน',
        pieces: {
            top: 'เสื้อยืดโอเวอร์ไซส์สีขาวพิมพ์ลายมินิมอล',
            bottom: 'กางเกงยีนส์ขากระบอกตรงสีมิดไนท์บลู',
            shoes: 'รองเท้าผ้าใบ Retro Sneakers',
            accessory: 'กระเป๋าสะพายข้าง Messenger Bag'
        },
        image: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&auto=format&fit=crop',
        pinterest_query: 'mens street fashion denim outfit'
    },
    // Unisex
    {
        gender: 'unisex',
        skinTone: 'warm',
        title: 'โคซี่เอิร์ธโทนยูนิเซ็กส์ (Warm Earthy Look)',
        style: 'Casual',
        color_tone: 'น้ำตาลมอคค่า, ครีม, เขียวเสจ',
        reason: 'โทนสีอุ่นธรรมชาติช่วยเสริมลุคให้ดูเป็นกันเอง อบอุ่น และใส่สบายเข้ากับทุกเพศ',
        pieces: {
            top: 'เสื้อเชิ้ตแขนยาวสีครีมปลดกระดุม',
            bottom: 'กางเกงผ้าลินินสีเขียวเสจหรือน้ำตาลอ่อน',
            shoes: 'รองเท้าผ้าใบสีขาวคลีน',
            accessory: 'กระเป๋า Tote Bag ผ้าแคนวาส'
        },
        image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop',
        pinterest_query: 'unisex earth tone fashion outfit'
    },
    {
        gender: 'unisex',
        skinTone: 'cool',
        title: 'เดนิมมินิมอล (Cool Casual Unisex)',
        style: 'Minimal',
        color_tone: 'ฟ้าเดนิม, ขาว, เทาอ่อน',
        reason: 'โทนสีเย็นและผ้ายีนส์ช่วยขับผิว Cool Tone ให้ดูสดใส ไม่หมอง เข้ากับวันสบายๆ',
        pieces: {
            top: 'เสื้อยืดแขนสั้นสีเทาอ่อน',
            bottom: 'กางเกงยีนส์ฟอกสีฟ้าอ่อนขากระบอก',
            shoes: 'รองเท้าสนีกเกอร์สีขาวล้วน',
            accessory: 'หมวกเบสบอลสีขาวงาช้าง'
        },
        image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop',
        pinterest_query: 'unisex denim minimal outfit'
    },
    {
        gender: 'unisex',
        skinTone: 'neutral',
        title: 'วินเทจ 90s คลาสสิก (Vintage Casual)',
        style: 'Vintage',
        color_tone: 'กรมท่า, ส้มอิฐ, น้ำตาล',
        reason: 'คู่สีวินเทจ 90s แมตช์ง่าย ได้ฟีลเรโทรและเอกลักษณ์เฉพาะตัว เหมาะกับสภาพอากาศทุกวัน',
        pieces: {
            top: 'เสื้อโปโลโอเวอร์ไซส์สีกรมท่าตัดปกสีขาว',
            bottom: 'กางเกงคาร์โก้หรือยีนส์ทรงหลวม',
            shoes: 'รองเท้าผ้าใบวินเทจทรงคลาสสิก',
            accessory: 'แว่นตากันแดดกรอบเรโทร'
        },
        image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop',
        pinterest_query: '90s vintage outfit aesthetic unisex'
    }
];

// Endpoint สำหรับ Gemini AI + Fashion Look แนะนำชุดประจำวัน
app.post('/api/ai/recommend-look', async (req, res) => {
    try {
        const { gender = 'unisex', skinTone = 'warm', style = 'Casual', temp = 25, condition = 'แจ่มใส' } = req.body || {};

        let aiLook = null;
        let source = 'curated';

        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const prompt = `คุณคือ Fashion Stylist ส่วนตัวของแอปพลิเคชัน LongLook
ช่วยแนะนำ 1 ลุคการแต่งตัวประจำวันสำหรับผู้ใช้ตามข้อมูลนี้:
- เพศ: ${gender} (${gender === 'female' ? 'ผู้หญิง' : gender === 'male' ? 'ผู้ชาย' : 'Unisex ทุกเพศ'})
- โทนสีผิว (Personal Color/Skin tone): ${skinTone} (${skinTone === 'warm' ? 'วอร์มโทน ผิวสองสี/โทนเหลือง' : skinTone === 'cool' ? 'คูลโทน ผิวขาว/โทนชมพู' : 'เนเชอรัลโทน ผิวธรรมชาติ'})
- สภาพอากาศปัจจุบัน: ${temp}°C สภาพ: ${condition}
- สไตล์ที่ชอบ: ${style}

ตอบเป็น JSON เท่านั้น (ห้ามใส่ markdown หรือข้อความอื่น):
{
  "title": "ชื่อลุคเก๋ๆ ภาษาไทย สั้นกระชับ (เช่น 'เอิร์ธโทนคาเฟ่ชิลล์')",
  "style": "ชื่อสไตล์ (เช่น Casual, Korean Minimal, Streetwear, Smart Casual)",
  "color_tone": "คำอธิบายโทนสี เช่น 'ครีม, เบจ, น้ำตาล'",
  "reason": "คำแนะนำสั้นๆ 1-2 ประโยค ว่าทำไมชุดนี้ถึงเหมาะกับสภาพอากาศและโทนสีผิวนี้",
  "pieces": {
    "top": "ชื่อเสื้อ...",
    "bottom": "ชื่อกางเกงหรือกระโปรง...",
    "shoes": "ชื่อรองเท้า...",
    "accessory": "ชื่อกระเป๋าหรือเครื่องประดับ..."
  },
  "pinterest_query": "คำค้นหาภาษาอังกฤษสั้นๆ สำหรับ Pinterest เช่น 'korean casual outfit warm tone women'"
}`;
                const result = await model.generateContent(prompt);
                const text = await result.response.text();
                const cleaned = text.replace(/```json|```/g, '').trim();
                aiLook = JSON.parse(cleaned);
                source = 'gemini';
            } catch (err) {
                console.warn('Gemini recommendation fallback to curated look:', err.message);
            }
        }

        if (!aiLook) {
            let pool = LOOK_CATALOG.filter(item => item.gender === gender && item.skinTone === skinTone);
            if (pool.length === 0) {
                pool = LOOK_CATALOG.filter(item => item.gender === gender);
            }
            if (pool.length === 0) {
                pool = LOOK_CATALOG.filter(item => item.gender === 'unisex');
            }
            if (pool.length === 0) pool = LOOK_CATALOG;
            aiLook = { ...pool[Math.floor(Math.random() * pool.length)] };
            source = 'curated';
        }

        if (!aiLook.image) {
            const imgPool = LOOK_CATALOG.filter(it => it.gender === gender || it.gender === 'unisex');
            const picked = imgPool[Math.floor(Math.random() * imgPool.length)] || LOOK_CATALOG[0];
            aiLook.image = picked.image;
        }

        const query = aiLook.pinterest_query || `${gender} ${skinTone} tone fashion outfit aesthetic`;
        aiLook.pinterest_url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;

        res.json({ source, look: aiLook });
    } catch (e) {
        console.error('Recommend look error:', e);
        res.status(500).json({ message: 'ไม่สามารถสร้างลุคแนะนำได้' });
    }
});

app.post('/api/ai/analyze-clothing', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'กรุณาอัปโหลดรูปภาพเสื้อผ้า' });

        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const imagePart = {
                    inlineData: {
                        data: fs.readFileSync(req.file.path).toString('base64'),
                        mimeType: req.file.mimetype
                    }
                };

                const prompt = "วิเคราะห์รูปเสื้อผ้านี้ แล้วตอบเฉพาะ JSON เท่านั้น: { \"category\": \"เสื้อ/กางเกง/กระโปรง/เดรส\", \"color\": \"โทนสี เช่น สีขาว/สีครีม\", \"style\": \"CASUAL/KOREAN/FORMAL/STREET\" }";
                const result = await model.generateContent([prompt, imagePart]);
                const responseText = await result.response.text();
                return res.json({ message: 'วิเคราะห์สำเร็จ', result: JSON.parse(responseText.replace(/```json|```/g, '').trim()) });
            } catch (aiErr) {
                console.warn('Gemini vision error, using smart fallback:', aiErr.message);
            }
        }

        // Smart Fallback เมื่อยังไม่ได้ใส่ GEMINI_API_KEY เพื่อให้เพื่อนทดสอบได้ลื่นไหล ไม่พัง
        const originalName = (req.file.originalname || '').toLowerCase();
        let category = 'เสื้อ';
        if (originalName.includes('pant') || originalName.includes('jean') || originalName.includes('กางเกง')) category = 'กางเกง';
        else if (originalName.includes('skirt') || originalName.includes('กระโปรง')) category = 'กระโปรง';
        else if (originalName.includes('dress') || originalName.includes('เดรส')) category = 'เดรส';
        else if (originalName.includes('shoe') || originalName.includes('รองเท้า')) category = 'รองเท้า';

        const mockResults = [
            { category: category, color: 'โทนเบจ-ครีม', style: 'CASUAL' },
            { category: category, color: 'สีขาวมินิมอล', style: 'KOREAN' },
            { category: category, color: 'สียีนส์คลาสสิก', style: 'STREET' }
        ];
        const result = mockResults[Math.floor(Math.random() * mockResults.length)];

        res.json({
            message: 'วิเคราะห์สำเร็จ (โหมดจำลอง AI สำรอง)',
            result
        });
    } catch (err) {
        console.error('Analyze clothing error:', err);
        res.status(500).json({ message: 'การวิเคราะห์ด้วย AI ล้มเหลว' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 LongLook SQLite + Firebase backend: http://localhost:${PORT}`);
});
