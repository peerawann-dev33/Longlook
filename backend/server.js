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

                const prompt = 'วิเคราะห์รูปเสื้อผ้านี้ แล้วตอบเฉพาะ JSON เท่านั้น: { "category": "เสื้อ/กางเกง/กระโปรง/เดรส/แจ็คเก็ต/รองเท้า/เครื่องประดับ", "color": "ระบุสีหลักตามภาพจริงเท่านั้น เช่น สีขาว, สีดำ, สีน้ำเงิน, สีเทา (ห้ามตอบสียีนส์คลาสสิกหากไม่ใช่ผ้ายีนส์)", "style": "CASUAL/STREET/FORMAL/SPORT" }';
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
        else if (originalName.includes('acc') || originalName.includes('bracelet') || originalName.includes('necklace') || originalName.includes('ring') || originalName.includes('jewelry') || originalName.includes('สร้อย') || originalName.includes('กำไล') || originalName.includes('แหวน') || originalName.includes('ประดับ')) category = 'เครื่องประดับ';
        else if (originalName.includes('bag') || originalName.includes('กระเป๋า')) category = 'กระเป๋า';
        else if (originalName.includes('hat') || originalName.includes('cap') || originalName.includes('หมวก')) category = 'หมวก';


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

// ตัวช่วยแปลงชื่อและสีเสื้อผ้าภาษาไทยเป็นคำศัพท์แฟชั่นภาษาอังกฤษระดับสตูดิโอ สำหรับ Image Generation
function translateClothingToFashionEnglish(item, fallbackType = 'top') {
    if (!item) return '';
    const name = (item.name || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    const color = (item.color || '').toLowerCase();

    // Map สีเป็นศัพท์แสงแฟชั่น
    let colorEng = '';
    if (color.includes('ขาว') || name.includes('ขาว') || color.includes('งาช้าง')) colorEng = 'crisp ivory white';
    else if (color.includes('ดำ') || name.includes('ดำ')) colorEng = 'matte obsidian black';
    else if (color.includes('เทา') || name.includes('เทา')) colorEng = 'charcoal heather grey';
    else if (color.includes('ครีม') || color.includes('เบจ') || name.includes('ครีม') || name.includes('เบจ')) colorEng = 'warm oatmeal beige';
    else if (color.includes('น้ำตาล') || color.includes('มอคค่า') || name.includes('น้ำตาล')) colorEng = 'mocha brown';
    else if (color.includes('กรม') || color.includes('น้ำเงิน') || name.includes('กรม')) colorEng = 'deep midnight navy blue';
    else if (color.includes('ฟ้า') || color.includes('ยีนส์') || name.includes('ฟ้า') || name.includes('ยีน')) colorEng = 'light washed vintage indigo denim';
    else if (color.includes('เขียว') || color.includes('เสจ') || name.includes('เขียว')) colorEng = 'muted sage green';
    else if (color.includes('ชมพู') || name.includes('ชมพู')) colorEng = 'soft dusty blush pink';
    else if (color.includes('แดง') || name.includes('แดง')) colorEng = 'rich burgundy wine red';
    else colorEng = 'neutral aesthetic tone';

    // Map หมวดหมู่และทรงเสื้อผ้า
    if (fallbackType === 'top' || cat === 'เสื้อ' || name.includes('เสื้อ')) {
        if (name.includes('เชิ้ต') || name.includes('shirt')) return `${colorEng} relaxed linen button-up shirt`;
        if (name.includes('โปโล') || name.includes('polo')) return `${colorEng} textured knit collar polo shirt`;
        if (name.includes('ไหมพรม') || name.includes('knit') || name.includes('cardigan') || name.includes('คาร์ดิแกน')) return `${colorEng} cozy minimalist knit cardigan`;
        if (name.includes('ฮู้ด') || name.includes('hoodie') || name.includes('สเวตเตอร์')) return `${colorEng} premium oversized heavyweight hoodie`;
        return `${colorEng} premium heavy cotton relaxed drop-shoulder t-shirt`;
    }

    if (fallbackType === 'bottom' || cat === 'กางเกง' || cat === 'กระโปรง' || name.includes('เกง') || name.includes('กระโปรง')) {
        if (cat === 'กระโปรง' || name.includes('กระโปรง') || name.includes('skirt')) return `${colorEng} high-waisted pleated A-line midi skirt`;
        if (name.includes('ยีนส์') || name.includes('jean') || name.includes('denim')) return `${colorEng} vintage straight-leg loose-fit denim jeans`;
        if (name.includes('คาร์โก้') || name.includes('cargo')) return `${colorEng} modern relaxed wide-leg cargo trousers`;
        if (name.includes('ขาสั้น') || name.includes('short')) return `${colorEng} tailored knee-length casual shorts`;
        return `${colorEng} tailored pleated wide-leg trousers`;
    }

    if (fallbackType === 'shoes' || cat === 'รองเท้า' || name.includes('รองเท้า')) {
        if (name.includes('ส้นสูง') || name.includes('heels')) return `${colorEng} pointed-toe kitten heel mules`;
        if (name.includes('โลฟเฟอร์') || name.includes('loafer')) return `${colorEng} classic polished leather penny loafers`;
        if (name.includes('แตะ') || name.includes('sandal')) return `${colorEng} minimalist leather slide sandals`;
        return `${colorEng} clean low-top minimalist retro sneakers`;
    }

    if (fallbackType === 'accessory' || cat === 'เครื่องประดับ' || cat === 'กระเป๋า' || cat === 'หมวก') {
        if (name.includes('หมวก') || name.includes('cap') || name.includes('hat')) return `${colorEng} clean baseball dad cap`;
        if (name.includes('สะพาย') || name.includes('crossbody') || name.includes('bag') || name.includes('กระเป๋า')) return `${colorEng} minimalist leather crossbody bag`;
        if (name.includes('แว่น') || name.includes('glass')) return `retro tortoiseshell sunglasses`;
        return `${colorEng} subtle minimalist jewelry accent`;
    }

    return `${colorEng} minimalist fashion piece`;
}

// Endpoint ใหม่: AI Fashion Stylist Matcher (อิงสไตล์และเทรนด์ Pinterest พร้อมตัวเลือกรวมพร็อพ)
app.post('/api/ai/match-outfit', async (req, res) => {
    try {
        const { wardrobe = [], occasion = 'ไปคาเฟ่ / เดินเล่นวันสบายๆ', style = 'CASUAL', gender = 'unisex', skinTone = 'warm', includeAccessories = false, ratingsHistory = [] } = req.body || {};

        if (!Array.isArray(wardrobe) || wardrobe.length === 0) {
            return res.status(400).json({ message: 'ไม่มีเสื้อผ้าในตู้สำหรับให้ AI แมตช์' });
        }

        // รวบรวมเรทติ้งในอดีต (ทั้งจาก client และจากตาราง outfit_ratings ใน DB) เพื่อเรียนรู้ความชอบ
        let combinedRatings = [...(Array.isArray(ratingsHistory) ? ratingsHistory : [])];
        try {
            const dbRatings = db.prepare('SELECT top_name, bottom_name, rating, feedback FROM outfit_ratings ORDER BY id DESC LIMIT 30').all();
            for (const r of dbRatings) {
                if (!combinedRatings.some(c => (c.topName === r.top_name && c.bottomName === r.bottom_name))) {
                    combinedRatings.push({
                        topName: r.top_name,
                        bottomName: r.bottom_name,
                        rating: r.rating,
                        feedback: r.feedback
                    });
                }
            }
        } catch (e) {}

        const dislikedCombos = combinedRatings.filter(r => (r.rating <= 2 || r.feedback === 'dislike'));
        const likedCombos = combinedRatings.filter(r => (r.rating >= 4 || r.feedback === 'like'));

        let feedbackRules = '';
        if (dislikedCombos.length > 0) {
            feedbackRules += `\nCRITICAL USER FEEDBACK - AVOID DISLIKED PAIRS (User gave 1-2 stars / disliked):\n` +
                dislikedCombos.map(d => `- DO NOT PAIR: "${d.topName || d.top_name}" with "${d.bottomName || d.bottom_name}" (Disliked, rating: ${d.rating} stars). NEVER pick this pair together!`).join('\n') + '\n';
        }
        if (likedCombos.length > 0) {
            feedbackRules += `\nUSER FAVORITES (User gave 4-5 stars / liked):\n` +
                likedCombos.map(l => `- FAVORITE SYNERGY: "${l.topName || l.top_name}" with "${l.bottomName || l.bottom_name}" (User gave ${l.rating} stars). Prioritize similar aesthetic vibes or items!`).join('\n') + '\n';
        }

        // 1. ดึงแรงบันดาลใจ Pinterest Trend จาก LOOK_CATALOG ให้ตรงกับเพศ สไตล์ และโทนสี
        let candidateLooks = LOOK_CATALOG.filter(l => {
            if (gender === 'male') return l.gender === 'male' || l.gender === 'unisex';
            if (gender === 'female') return l.gender === 'female' || l.gender === 'unisex';
            return true;
        });
        if (candidateLooks.length === 0) candidateLooks = LOOK_CATALOG;

        const matchedCatalogLook = candidateLooks.find(l => 
            (l.style || '').toLowerCase() === style.toLowerCase() ||
            (l.gender === gender && l.skinTone === skinTone)
        ) || candidateLooks[Math.floor(Math.random() * candidateLooks.length)];

        const pinterestInspiration = {
            title: matchedCatalogLook.title,
            style: matchedCatalogLook.style,
            color_tone: matchedCatalogLook.color_tone,
            pinterest_query: matchedCatalogLook.pinterest_query,
            pinterest_url: `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(matchedCatalogLook.pinterest_query)}`,
            guide: matchedCatalogLook.reason,
            piecesGuide: matchedCatalogLook.pieces
        };

        // 2. กรองเสื้อผ้าในตู้เสื้อผ้าของผู้ใช้ตามเพศที่ระบุอย่างเข้มงวด
        const isFeminineItem = item => {
            if (!item) return false;
            const c = (item.category || '').toLowerCase();
            const n = (item.name || '').toLowerCase();
            return c === 'กระโปรง' || c === 'เดรส' || n.includes('กระโปรง') || n.includes('เดรส') || n.includes('skirt') || n.includes('dress');
        };

        let genderFilteredWardrobe = wardrobe.filter(item => {
            const itemGender = (item.gender || 'unisex').toLowerCase();
            if (gender === 'male') {
                if (isFeminineItem(item) || itemGender === 'female') return false;
                return true;
            } else if (gender === 'female') {
                if (itemGender === 'male') return false;
                return true;
            }
            return true;
        });

        if (genderFilteredWardrobe.length === 0) {
            genderFilteredWardrobe = gender === 'male' ? wardrobe.filter(item => !isFeminineItem(item)) : wardrobe;
            if (genderFilteredWardrobe.length === 0) genderFilteredWardrobe = wardrobe;
        }

        let matchedResult = null;

        const wardrobeSummary = genderFilteredWardrobe.map((item, idx) => ({
            index: idx,
            id: item.id,
            name: item.name,
            category: item.category,
            gender: item.gender || 'unisex',
            color: item.color || '',
            style: item.style || ''
        }));

        const fashionPrompt = `You are an elite Pinterest Fashion Stylist and color coordination expert.
We want to style the user based on real trending Pinterest aesthetic lookbooks and user rating feedback.
Target Pinterest Trend:
- Title: "${pinterestInspiration.title}"
- Style Aesthetic: "${pinterestInspiration.style}"
- Target Color Harmony: "${pinterestInspiration.color_tone}"
- Pinterest Reference: "${pinterestInspiration.pinterest_query}"

User Settings:
- Occasion: "${occasion}"
- Target Gender: "${gender}" (CRITICAL RULE: If gender is "male", NEVER pick a skirt, dress, or female item)
- Skin Tone: "${skinTone}"
- Include Accessories/Bag: ${includeAccessories ? 'YES' : 'NO (Do not include accessory, set accessoryIndex: null)'}
${feedbackRules}
Available User Wardrobe:
${JSON.stringify(wardrobeSummary, null, 2)}

Task:
Select the best matching items from user wardrobe to emulate this Pinterest aesthetic while respecting user rating preferences.
Respond in strict JSON only (no markdown, no backticks, valid JSON):
{
  "topIndex": 0,
  "bottomIndex": 1,
  "shoesIndex": 2,
  "accessoryIndex": ${includeAccessories ? 3 : 'null'},
  "matchScore": 96,
  "colorHarmony": "สรุปคู่สีสไตล์ Pinterest เช่น เอิร์ธโทนตัดขาว คลีนตาแบบหนุ่มเกาหลี",
  "stylistReason": "คำแนะนำภาษาไทยสละสลวย 2 ประโยคจาก AI Stylist ว่าทำไมชุดนี้ถึงตรงตามสไตล์ Pinterest และเข้ากับผู้ใช้"
}`;

        // 1. ถ้ามี Gemini AI ให้วิเคราะห์ด้วย Gemini 2.0 Flash / 1.5 Flash
        if (genAI) {
            try {
                let model;
                try {
                    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
                } catch(e) {
                    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                }
                const result = await model.generateContent(fashionPrompt);
                const text = await result.response.text();
                const cleaned = text.replace(/```json|```/g, '').trim();
                const parsed = JSON.parse(cleaned);

                matchedResult = {
                    top: genderFilteredWardrobe[parsed.topIndex] || null,
                    bottom: genderFilteredWardrobe[parsed.bottomIndex] || null,
                    shoes: genderFilteredWardrobe[parsed.shoesIndex] || null,
                    accessory: includeAccessories && typeof parsed.accessoryIndex === 'number' ? genderFilteredWardrobe[parsed.accessoryIndex] : null,
                    matchScore: parsed.matchScore || 96,
                    colorHarmony: parsed.colorHarmony || pinterestInspiration.color_tone,
                    stylistReason: parsed.stylistReason || `AI ปรับลุคตาม Pinterest "${pinterestInspiration.title}" ให้เข้ากับตู้เสื้อผ้าของคุณ`,
                    aiEngine: 'Gemini 2.0 Flash (Pinterest Stylist)'
                };
            } catch (aiErr) {
                console.warn('Gemini Matcher error, trying OpenAI Reasoning via Pollinations:', aiErr.message);
            }
        }

        // 2. ถ้าไม่มี Gemini API Key ให้เรียก OpenAI Reasoning (GPT-4o) ผ่าน Pollinations
        if (!matchedResult) {
            try {
                const aiRes = await fetch('https://text.pollinations.ai/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [
                            { role: 'system', content: 'You are an elite fashion stylist matching Pinterest aesthetics. You always respond in valid JSON. You write natural, fluent, elegant Thai styling advice without literal English machine translation.' },
                            { role: 'user', content: fashionPrompt }
                        ],
                        model: 'openai',
                        jsonMode: true
                    })
                });

                if (aiRes.ok) {
                    const text = await aiRes.text();
                    const cleaned = text.replace(/```json|```/g, '').trim();
                    const parsed = JSON.parse(cleaned);

                    if (parsed && typeof parsed.topIndex === 'number') {
                        matchedResult = {
                            top: genderFilteredWardrobe[parsed.topIndex] || genderFilteredWardrobe[0],
                            bottom: genderFilteredWardrobe[parsed.bottomIndex] || genderFilteredWardrobe[1] || genderFilteredWardrobe[0],
                            shoes: genderFilteredWardrobe[parsed.shoesIndex] || null,
                            accessory: includeAccessories && typeof parsed.accessoryIndex === 'number' ? genderFilteredWardrobe[parsed.accessoryIndex] : null,
                            matchScore: parsed.matchScore || 97,
                            colorHarmony: parsed.colorHarmony || pinterestInspiration.color_tone,
                            stylistReason: parsed.stylistReason || `AI จับคู่ลุคตามเทรนด์ Pinterest "${pinterestInspiration.title}" ได้อย่างกลมกลืน`,
                            aiEngine: 'OpenAI GPT-4o Stylist (Pinterest Aesthetic)'
                        };
                    }
                }
            } catch (pollErr) {
                console.warn('Pollinations Text AI error, falling back to smart color matrix:', pollErr.message);
            }
        }

        const isBottom = item => {
            if (!item) return false;
            if (gender === 'male' && isFeminineItem(item)) return false;
            const c = (item.category || '').toLowerCase();
            const n = (item.name || '').toLowerCase();
            return c === 'กางเกง' || c === 'กระโปรง' || n.includes('เกง') || n.includes('กระโปรง') || n.includes('jean') || n.includes('skirt') || n.includes('ยีน');
        };
        const isShoes = item => {
            if (!item) return false;
            const c = (item.category || '').toLowerCase();
            const n = (item.name || '').toLowerCase();
            return c === 'รองเท้า' || n.includes('รองเท้า') || n.includes('shoes') || n.includes('sneaker') || n.includes('ผ้าใบ') || n.includes('ส้นสูง') || n.includes('แตะ');
        };
        const isAcc = item => {
            if (!item) return false;
            const c = (item.category || '').toLowerCase();
            const n = (item.name || '').toLowerCase();
            return c === 'เครื่องประดับ' || c === 'กระเป๋า' || c === 'หมวก' || n.includes('สร้อย') || n.includes('กำไล') || n.includes('กระเป๋า') || n.includes('หมวก') || n.includes('แว่น') || n.includes('watch') || n.includes('bag') || n.includes('แหวน') || n.includes('jewelry');
        };
        const isTop = item => {
            if (!item) return false;
            if (gender === 'male' && isFeminineItem(item)) return false;
            return !isBottom(item) && !isShoes(item) && !isAcc(item);
        };

        const tops = genderFilteredWardrobe.filter(isTop);
        const bottoms = genderFilteredWardrobe.filter(isBottom);
        const shoesList = genderFilteredWardrobe.filter(isShoes);
        const accessories = genderFilteredWardrobe.filter(isAcc);

        // 3. Smart Color Harmony & Variety Engine (Local Fallback สำรอง)
        if (!matchedResult) {
            const pickRandom = (arr) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;
            
            // กรองคู่ท่อนบน-ท่อนล่างไม่ให้ซ้ำกับชุดที่ผู้ใช้ให้คะแนนไม่พอใจ (1-2 ดาว)
            const isPairDisliked = (topItem, bottomItem) => {
                if (!topItem || !bottomItem) return false;
                return dislikedCombos.some(d => {
                    const dTop = (d.topName || d.top_name || '').toLowerCase();
                    const dBottom = (d.bottomName || d.bottom_name || '').toLowerCase();
                    return dTop && dBottom && topItem.name.toLowerCase().includes(dTop) && bottomItem.name.toLowerCase().includes(dBottom);
                });
            };

            const matchingTops = tops.filter(t => (t.style || '').toUpperCase() === style.toUpperCase());
            const poolTops = matchingTops.length > 0 ? matchingTops : tops;
            const matchingBottoms = bottoms.filter(b => (b.style || '').toUpperCase() === style.toUpperCase());
            const poolBottoms = matchingBottoms.length > 0 ? matchingBottoms : bottoms;

            let chosenTop = null;
            let chosenBottom = null;

            for (let attempt = 0; attempt < 12; attempt++) {
                const candTop = pickRandom(poolTops) || genderFilteredWardrobe[0];
                const candBottom = pickRandom(poolBottoms) || genderFilteredWardrobe[1] || genderFilteredWardrobe[0];
                if (!isPairDisliked(candTop, candBottom) || attempt === 11) {
                    chosenTop = candTop;
                    chosenBottom = candBottom;
                    break;
                }
            }

            const chosenShoes = pickRandom(shoesList) || {
                name: 'รองเท้าผ้าใบสีขาวคลีน',
                category: 'รองเท้า',
                image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&auto=format&fit=crop'
            };
            const chosenAccessory = includeAccessories ? (pickRandom(accessories) || {
                name: gender === 'female' ? 'กระเป๋าสะพายข้างแฟชั่น' : 'กระเป๋าสะพายข้างมินิมอล',
                category: 'กระเป๋า',
                image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&auto=format&fit=crop'
            }) : null;

            const randomScores = [95, 96, 97, 98, 99];
            const score = randomScores[Math.floor(Math.random() * randomScores.length)];

            matchedResult = {
                top: chosenTop,
                bottom: chosenBottom,
                shoes: chosenShoes,
                accessory: chosenAccessory,
                matchScore: score,
                colorHarmony: pinterestInspiration.color_tone || 'Earth tone & Contrast Harmony',
                stylistReason: `AI อิงลุค Pinterest "${pinterestInspiration.title}" แมตช์ "${chosenTop?.name || 'เสื้อ'}" เข้ากับ "${chosenBottom?.name || 'กางเกง'}" ให้ได้ฟีล ${style} ที่ลงตัว`,
                aiEngine: 'Pinterest Style Harmony Engine'
            };
        }

        // การันตีความถูกต้องของหมวดหมู่ 100%
        if (!matchedResult.top || !isTop(matchedResult.top)) {
            matchedResult.top = tops[0] || genderFilteredWardrobe[0];
        }
        if (!matchedResult.bottom || !isBottom(matchedResult.bottom)) {
            matchedResult.bottom = bottoms[0] || {
                name: gender === 'female' ? 'กระโปรงมินิมอลเข้าชุด' : 'กางเกงสแล็คสีดำทรงกระบอก',
                category: 'กางเกง',
                image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=300&auto=format&fit=crop'
            };
        }
        if (!matchedResult.shoes || !isShoes(matchedResult.shoes)) {
            matchedResult.shoes = shoesList[0] || {
                name: 'รองเท้าผ้าใบสีขาวคลีน',
                category: 'รองเท้า',
                image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&auto=format&fit=crop'
            };
        }
        if (includeAccessories) {
            if (!matchedResult.accessory || !isAcc(matchedResult.accessory)) {
                matchedResult.accessory = accessories[0] || {
                    name: gender === 'female' ? 'กระเป๋าสะพายข้างแฟชั่น' : 'กระเป๋าสะพายข้างมินิมอล',
                    category: 'กระเป๋า',
                    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&auto=format&fit=crop'
                };
            }
        } else {
            matchedResult.accessory = null;
        }

        matchedResult.pinterestInspiration = pinterestInspiration;

        res.json({
            success: true,
            match: matchedResult,
            pinterestInspiration
        });
    } catch (e) {
        console.error('Match outfit error:', e);
        res.status(500).json({ message: 'ไม่สามารถแมตช์ชุดได้' });
    }
});

// Endpoint ใหม่: บันทึกเรทติ้งชุด (1 - 5 ดาว) และเรียนรู้ความชอบของผู้ใช้
app.post('/api/ai/rate-outfit', async (req, res) => {
    try {
        const { topName, bottomName, shoesName, accessoryName, rating = 3, style = 'CASUAL', occasion = '', feedback } = req.body || {};
        let userId = null;

        const authHeader = req.headers['authorization'];
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                userId = decoded.id;
            } catch (err) {}
        }

        const numericRating = Math.max(1, Math.min(5, parseInt(rating, 10) || 3));
        const fb = feedback || (numericRating <= 2 ? 'dislike' : numericRating >= 4 ? 'like' : 'neutral');

        const insertStmt = db.prepare(`
            INSERT INTO outfit_ratings (user_id, top_name, bottom_name, shoes_name, accessory_name, rating, style, occasion, feedback)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = insertStmt.run(userId, topName || '', bottomName || '', shoesName || '', accessoryName || '', numericRating, style, occasion, fb);

        res.json({
            success: true,
            message: numericRating <= 2 ? 'บันทึกคะแนนแล้ว AI จะหลีกเลี่ยงคู่ชุดนี้ในรอบถัดไป' : 'บันทึกคะแนนความชอบแล้ว AI จะจดจำสไตล์นี้',
            ratingId: result.lastInsertRowid,
            rating: numericRating,
            feedback: fb
        });
    } catch (err) {
        console.error('Rate outfit error:', err);
        res.status(500).json({ message: 'ไม่สามารถบันทึกเรทติ้งได้' });
    }
});

app.get('/api/ai/ratings', async (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM outfit_ratings ORDER BY id DESC LIMIT 50').all();
        res.json({ ratings: rows });
    } catch (err) {
        res.json({ ratings: [] });
    }
});

// Endpoint ใหม่: AI Virtual Try-On (เจนรูป Lookbook เสมือนจริงระดับนิตยสารแฟชั่น ด้วย FLUX Realism Engine)
app.post('/api/ai/virtual-tryon', async (req, res) => {
    try {
        const { userPhoto, items, style = 'Casual', gender = 'unisex', occasion = 'ทั่วไป', vibe = 'korean_cafe', includeAccessories = false } = req.body || {};

        // แปลงชิ้นเสื้อผ้าเป็นภาษาอังกฤษเชิงแฟชั่นเพื่อป้อนให้ FLUX Diffusion Model เข้าใจลึกซึ้ง
        const topDesc = translateClothingToFashionEnglish(items?.top, 'top') || 'minimalist cotton oversized t-shirt';
        const bottomDesc = translateClothingToFashionEnglish(items?.bottom, 'bottom') || 'tailored straight-leg trousers';
        const shoesDesc = translateClothingToFashionEnglish(items?.shoes, 'shoes') || 'clean low-top white sneakers';
        const accDesc = includeAccessories && items?.accessory ? translateClothingToFashionEnglish(items?.accessory, 'accessory') : '';

        // จัดการเพศและสไตล์โมเดล
        let genderPrompt = 'stylish 22-year-old Asian young adult';
        if (gender === 'female') {
            genderPrompt = 'stylish 22-year-old Asian female fashion model, feminine graceful posture, natural subtle makeup';
        } else if (gender === 'male') {
            genderPrompt = 'stylish 23-year-old handsome Asian male fashion model, masculine sharp jawline, modern haircut';
        }

        // สถานที่และแสง (Setting & Lighting Vibes)
        let settingPrompt = 'standing in a sunlit aesthetic minimalist Seoul coffee shop, warm natural diffused sunlight, warm wood and microcement walls';
        if (vibe === 'tokyo_street') {
            settingPrompt = 'standing on a clean minimalist street in Daikanyama Tokyo, candid street style fashion photography, soft golden hour sunlight, architectural background';
        } else if (vibe === 'editorial_studio') {
            settingPrompt = 'in a clean contemporary fashion studio, softbox directional lighting, Vogue GQ lookbook aesthetic, neutral warm grey backdrop';
        } else if (vibe === 'clean_minimal') {
            settingPrompt = 'in a contemporary minimalist art gallery setting, clean white architectural space, natural diffused daylight';
        }

        // ประกอบร่างเป็น Master Prompt ระดับมืออาชีพ
        const outfitSentence = accDesc 
            ? `wearing ${topDesc}, paired with ${bottomDesc}, styled with ${shoesDesc}, and holding a ${accDesc}`
            : `wearing ${topDesc}, paired with ${bottomDesc}, and styled with ${shoesDesc}`;

        const masterPrompt = `Full-length editorial fashion lookbook photograph of a ${genderPrompt}, ${outfitSentence}. ${settingPrompt}. Shot on Hasselblad X2D 100C, 85mm f/1.4 lens, crisp sharp focus on clothing fabric texture, realistic natural skin pores, authentic cloth wrinkles and drapery, high fashion Pinterest aesthetic, 8k uhd, photorealistic masterpiece, professional color grading`;

        // สุ่ม Seed และเรียกใช้งาน FLUX Engine คุณภาพสูง
        const seed = Math.floor(Math.random() * 999999);
        const generatedImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(masterPrompt)}?width=768&height=1024&seed=${seed}&nologo=true&model=flux`;

        const topName = items?.top?.name || 'เสื้อ';
        const bottomName = items?.bottom?.name || 'กางเกง';
        const advice = `AI สร้างภาพจำลองลุค "${topName}" คู่กับ "${bottomName}" ในสไตล์ ${style} แสง ${vibe === 'tokyo_street' ? 'สตรีทโตเกียว' : vibe === 'editorial_studio' ? 'สตูดิโอแฟชั่น' : 'คาเฟ่เกาหลี'} ได้อย่างลงตัว`;

        res.json({
            success: true,
            imageUrl: generatedImageUrl,
            prompt: masterPrompt,
            advice: advice,
            details: {
                top: topName,
                bottom: bottomName,
                shoes: items?.shoes?.name || '',
                accessory: items?.accessory?.name || '',
                style,
                occasion,
                vibe
            }
        });
    } catch (err) {
        console.error('Virtual try-on error:', err);
        res.status(500).json({ message: 'ไม่สามารถสร้างภาพลองชุดเสมือนจริงได้ในขณะนี้' });
    }
});


app.listen(PORT, () => {
    console.log(`🚀 LongLook SQLite + Firebase backend: http://localhost:${PORT}`);
});
