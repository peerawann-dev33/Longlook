-- ============================================================================
-- โปรเจกต์: LongLook - Wardrobe & Outfit Planner
-- โมดูล: ข้อมูลตั้งต้นและข้อมูลตัวอย่างปลอดภัย (Seed Data) สำหรับ Oracle Database
-- อ้างอิง: ER Diagram (LongLook_ER.pdf) และ Master Data ของระบบ LongLook
-- ไฟล์: database/seed.sql
-- หมายเหตุ: ใช้เฉพาะข้อมูลตัวอย่างจำลองที่ปลอดภัย ไม่มีการใส่ข้อมูลส่วนบุคคลหรือรหัสผ่านจริง
--         และไม่มีคำสั่งลบข้อมูลใด ๆ
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ข้อมูลหลัก: CATEGORY (หมวดหมู่เสื้อผ้า)
-- ----------------------------------------------------------------------------
INSERT INTO category (category_id, category_name, description)
VALUES (seq_category.NEXTVAL, 'เสื้อ', 'เสื้อยืด เสื้อเชิ้ต เสื้อโปโล เสื้อกล้าม');

INSERT INTO category (category_id, category_name, description)
VALUES (seq_category.NEXTVAL, 'กางเกง', 'กางเกงยีนส์ กางเกงสแล็ค กางเกงขาสั้น กางเกงวอร์ม');

INSERT INTO category (category_id, category_name, description)
VALUES (seq_category.NEXTVAL, 'กระโปรง', 'กระโปรงสั้น กระโปรงยาว กระโปรงทรงเอ กระโปรงพลีท');

INSERT INTO category (category_id, category_name, description)
VALUES (seq_category.NEXTVAL, 'เดรส', 'ชุดเดรสสั้น ชุดเดรสยาว แม็กซี่เดรส');

INSERT INTO category (category_id, category_name, description)
VALUES (seq_category.NEXTVAL, 'เสื้อคลุม/แจ็คเก็ต', 'เบลเซอร์ เสื้อฮู้ด คาร์ดิแกน แจ็คเก็ตยีนส์');

INSERT INTO category (category_id, category_name, description)
VALUES (seq_category.NEXTVAL, 'รองเท้า', 'รองเท้าผ้าใบ รองเท้าหนัง คัทชู รองเท้าแตะ');

INSERT INTO category (category_id, category_name, description)
VALUES (seq_category.NEXTVAL, 'กระเป๋า', 'กระเป๋าสะพาย กระเป๋าถือ กระเป๋าเป้ กระเป๋าผ้า');

INSERT INTO category (category_id, category_name, description)
VALUES (seq_category.NEXTVAL, 'เครื่องประดับ', 'หมวก แว่นตา เข็มขัด นาฬิกา สร้อยคอ');


-- ----------------------------------------------------------------------------
-- 2. ข้อมูลหลัก: STYLE (สไตล์การแต่งกาย)
-- ----------------------------------------------------------------------------
INSERT INTO style (style_id, style_name, description)
VALUES (seq_style.NEXTVAL, 'CASUAL', 'สไตล์สบาย ๆ ผ่อนคลาย เรียบง่าย สวมใส่ได้ทุกวัน');

INSERT INTO style (style_id, style_name, description)
VALUES (seq_style.NEXTVAL, 'KOREAN', 'สไตล์เกาหลี มินิมอล โทนสีละมุน ทันสมัยแบบ K-Fashion');

INSERT INTO style (style_id, style_name, description)
VALUES (seq_style.NEXTVAL, 'VINTAGE', 'สไตล์ย้อนยุค คลาสสิก มีกลิ่นอายเรโทรเฉพาะตัว');

INSERT INTO style (style_id, style_name, description)
VALUES (seq_style.NEXTVAL, 'STREET', 'สไตล์สตรีทแวร์ คล่องแคล่ว ทะมัดทะแมง ล้ำสมัย');

INSERT INTO style (style_id, style_name, description)
VALUES (seq_style.NEXTVAL, 'FORMAL', 'สไตล์เป็นทางการ สุภาพ ภูมิฐาน เหมาะสำหรับทำงานและพบผู้ใหญ่');

INSERT INTO style (style_id, style_name, description)
VALUES (seq_style.NEXTVAL, 'MINIMAL', 'สไตล์มินิมอล เน้นความเรียบหรู โทนสีโมโนโครมหรือสีเอิร์ธโทน');

INSERT INTO style (style_id, style_name, description)
VALUES (seq_style.NEXTVAL, 'SPORTY', 'สไตล์สปอร์ต คล่องตัว เน้นความสบายและพร้อมทำกิจกรรม');


-- ----------------------------------------------------------------------------
-- 3. ข้อมูลหลัก: OCCASION (โอกาส/สถานที่)
-- ----------------------------------------------------------------------------
INSERT INTO occasion (occasion_id, occasion_name, description)
VALUES (seq_occasion.NEXTVAL, 'ทำงาน / ประชุม', 'การทำงานในสำนักงาน การประชุม และการพบปะทางธุรกิจ');

INSERT INTO occasion (occasion_id, occasion_name, description)
VALUES (seq_occasion.NEXTVAL, 'ลำลอง / ประจำวัน', 'การใช้ชีวิตประจำวัน อยู่บ้าน หรือเดินเล่นทั่วไป');

INSERT INTO occasion (occasion_id, occasion_name, description)
VALUES (seq_occasion.NEXTVAL, 'คาเฟ่ / พักผ่อนวันหยุด', 'ไปถ่ายรูปคาเฟ่ เดินห้าง นัดเจอเพื่อนช่วงสุดสัปดาห์');

INSERT INTO occasion (occasion_id, occasion_name, description)
VALUES (seq_occasion.NEXTVAL, 'งานเลี้ยง / สังสรรค์', 'ปาร์ตี้ งานวันเกิด ดินเนอร์ งานแต่งงาน');

INSERT INTO occasion (occasion_id, occasion_name, description)
VALUES (seq_occasion.NEXTVAL, 'สัมภาษณ์งาน / ทางการ', 'งานพิธีการ การนำเสนองานสำคัญ หรือการสัมภาษณ์งาน');

INSERT INTO occasion (occasion_id, occasion_name, description)
VALUES (seq_occasion.NEXTVAL, 'ออกกำลังกาย / กีฬา', 'เข้ายิม วิ่ง เล่นกีฬา หรือกิจกรรมกลางแจ้ง');

INSERT INTO occasion (occasion_id, occasion_name, description)
VALUES (seq_occasion.NEXTVAL, 'ท่องเที่ยว / พักผ่อน', 'เดินทางท่องเที่ยวต่างจังหวัดหรือต่างประเทศ');


-- ----------------------------------------------------------------------------
-- 4. ข้อมูลหลัก: WEATHER (สภาพอากาศ)
-- ----------------------------------------------------------------------------
INSERT INTO weather (weather_id, weather_name, temperature_range)
VALUES (seq_weather.NEXTVAL, 'แดดจัด / อากาศร้อน', '33°C - 38°C');

INSERT INTO weather (weather_id, weather_name, temperature_range)
VALUES (seq_weather.NEXTVAL, 'แจ่มใส / โปร่งสบาย', '27°C - 32°C');

INSERT INTO weather (weather_id, weather_name, temperature_range)
VALUES (seq_weather.NEXTVAL, 'เย็นสบาย / มีลมพัด', '22°C - 26°C');

INSERT INTO weather (weather_id, weather_name, temperature_range)
VALUES (seq_weather.NEXTVAL, 'อากาศหนาว', '14°C - 21°C');

INSERT INTO weather (weather_id, weather_name, temperature_range)
VALUES (seq_weather.NEXTVAL, 'ฝนตก / ความชื้นสูง', '24°C - 28°C');


-- ----------------------------------------------------------------------------
-- 5. ข้อมูลตัวอย่างจำลอง: APP_USER (ผู้ใช้งานทดสอบที่ปลอดภัย)
-- หมายเหตุ: ใช้ Bcrypt Hash จำลอง ไม่ใช่รหัสผ่านจริง และไม่มีข้อมูลส่วนตัวจริง
-- ----------------------------------------------------------------------------
INSERT INTO app_user (
    user_id, username, email, password_hash, first_name, last_name, gender, role
) VALUES (
    seq_app_user.NEXTVAL,
    'demo_user',
    'demo@longlook.local',
    '$2a$10$wT2t/aKzL0b9yT3kM8b3e.7lD9d2R8a6H5j1N3v4B6x8z9q1e2w3',
    'สมชาย',
    'สายแฟชั่น',
    'MALE',
    'USER'
);

INSERT INTO app_user (
    user_id, username, email, password_hash, first_name, last_name, gender, role
) VALUES (
    seq_app_user.NEXTVAL,
    'lisa_style',
    'lisa@longlook.local',
    '$2a$10$wT2t/aKzL0b9yT3kM8b3e.7lD9d2R8a6H5j1N3v4B6x8z9q1e2w3',
    'ลลิษา',
    'มีสไตล์',
    'FEMALE',
    'USER'
);


-- ----------------------------------------------------------------------------
-- 6. ข้อมูลตัวอย่างจำลอง: CLOTHING_ITEM (เสื้อผ้าในตู้)
-- ----------------------------------------------------------------------------
INSERT INTO clothing_item (
    item_id, user_id, category_id, item_name, color, brand, item_size, image_url, purchase_date
) VALUES (
    seq_clothing_item.NEXTVAL,
    1, -- demo_user
    1, -- เสื้อ
    'เสื้อยืด Oversize สีขาวมินิมอล',
    'ขาว',
    'Uniqlo',
    'L',
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300',
    DATE '2026-01-15'
);

INSERT INTO clothing_item (
    item_id, user_id, category_id, item_name, color, brand, item_size, image_url, purchase_date
) VALUES (
    seq_clothing_item.NEXTVAL,
    1, -- demo_user
    2, -- กางเกง
    'กางเกงยีนส์ทรงกระบอกตรงสียีนส์อ่อน',
    'ฟ้า/ยีนส์',
    'Levi''s',
    '32',
    'https://images.unsplash.com/photo-1542272604-780c96856592?w=300',
    DATE '2026-02-10'
);

INSERT INTO clothing_item (
    item_id, user_id, category_id, item_name, color, brand, item_size, image_url, purchase_date
) VALUES (
    seq_clothing_item.NEXTVAL,
    1, -- demo_user
    5, -- เสื้อคลุม/แจ็คเก็ต
    'เสื้อเบลเซอร์ทรงหลวมสีดำคลาสสิก',
    'ดำ',
    'Zara',
    'M',
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=300',
    DATE '2026-03-01'
);

INSERT INTO clothing_item (
    item_id, user_id, category_id, item_name, color, brand, item_size, image_url, purchase_date
) VALUES (
    seq_clothing_item.NEXTVAL,
    1, -- demo_user
    6, -- รองเท้า
    'รองเท้าผ้าใบสีขาวสไตล์มินิมอล',
    'ขาว',
    'Nike',
    '42',
    'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=300',
    DATE '2026-01-20'
);


-- ----------------------------------------------------------------------------
-- 7. ข้อมูลตัวอย่างจำลอง: ITEM_STYLE (การจัดสไตล์ให้ชิ้นเสื้อผ้า)
-- ----------------------------------------------------------------------------
-- เสื้อยืดสีขาว: CASUAL, MINIMAL
INSERT INTO item_style (item_style_id, item_id, style_id) VALUES (seq_item_style.NEXTVAL, 1, 1);
INSERT INTO item_style (item_style_id, item_id, style_id) VALUES (seq_item_style.NEXTVAL, 1, 6);

-- กางเกงยีนส์: CASUAL, STREET
INSERT INTO item_style (item_style_id, item_id, style_id) VALUES (seq_item_style.NEXTVAL, 2, 1);
INSERT INTO item_style (item_style_id, item_id, style_id) VALUES (seq_item_style.NEXTVAL, 2, 4);

-- เสื้อเบลเซอร์สีดำ: FORMAL, KOREAN
INSERT INTO item_style (item_style_id, item_id, style_id) VALUES (seq_item_style.NEXTVAL, 3, 5);
INSERT INTO item_style (item_style_id, item_id, style_id) VALUES (seq_item_style.NEXTVAL, 3, 2);

-- รองเท้าผ้าใบสีขาว: CASUAL, MINIMAL
INSERT INTO item_style (item_style_id, item_id, style_id) VALUES (seq_item_style.NEXTVAL, 4, 1);
INSERT INTO item_style (item_style_id, item_id, style_id) VALUES (seq_item_style.NEXTVAL, 4, 6);


-- ----------------------------------------------------------------------------
-- 8. ข้อมูลตัวอย่างจำลอง: OUTFIT (ชุดแต่งกาย)
-- ----------------------------------------------------------------------------
INSERT INTO outfit (
    outfit_id, user_id, outfit_name, description
) VALUES (
    seq_outfit.NEXTVAL,
    1, -- demo_user
    'Casual Smart Cafe Look',
    'ลุคไปคาเฟ่วันหยุด เสื้อยืดขาวทับด้วยเบลเซอร์ดำและกางเกงยีนส์'
);


-- ----------------------------------------------------------------------------
-- 9. ข้อมูลตัวอย่างจำลอง: OUTFIT_ITEM (รายการชิ้นเสื้อผ้าในชุด)
-- ----------------------------------------------------------------------------
-- Outfit 1 ประกอบด้วย: เสื้อยืดขาว(1), กางเกงยีนส์(2), เบลเซอร์ดำ(3), ผ้าใบขาว(4)
INSERT INTO outfit_item (outfit_id, item_id, user_id) VALUES (1, 1, 1);
INSERT INTO outfit_item (outfit_id, item_id, user_id) VALUES (1, 2, 1);
INSERT INTO outfit_item (outfit_id, item_id, user_id) VALUES (1, 3, 1);
INSERT INTO outfit_item (outfit_id, item_id, user_id) VALUES (1, 4, 1);


-- ----------------------------------------------------------------------------
-- 10. ข้อมูลตัวอย่างจำลอง: CALENDAR_LOG (บันทึกการแต่งกายลงปฏิทิน)
-- ----------------------------------------------------------------------------
INSERT INTO calendar_log (
    log_id, user_id, outfit_id, occasion_id, weather_id, log_date, notes, rating
) VALUES (
    seq_calendar_log.NEXTVAL,
    1, -- demo_user
    1, -- Casual Smart Cafe Look
    3, -- คาเฟ่ / พักผ่อนวันหยุด
    2, -- แจ่มใส / โปร่งสบาย
    DATE '2026-10-14',
    'ใส่ไปถ่ายรูปคาเฟ่ช่วงบ่าย ลุคดูเรียบหรู ถ่ายรูปออกมาสวยมาก',
    5
);


-- ----------------------------------------------------------------------------
-- 11. ข้อมูลตัวอย่างจำลอง: AUDIT_LOG (ประวัติการกระทำ)
-- ----------------------------------------------------------------------------
INSERT INTO audit_log (
    audit_id, user_id, action, table_name, record_id, old_values, new_values
) VALUES (
    seq_audit_log.NEXTVAL,
    1,
    'REGISTER',
    'APP_USER',
    1,
    NULL,
    '{"username":"demo_user","email":"demo@longlook.local","role":"USER"}'
);

INSERT INTO audit_log (
    audit_id, user_id, action, table_name, record_id, old_values, new_values
) VALUES (
    seq_audit_log.NEXTVAL,
    1,
    'CREATE_OUTFIT',
    'OUTFIT',
    1,
    NULL,
    '{"outfit_name":"Casual Smart Cafe Look","item_count":4}'
);

-- บันทึกการเปลี่ยนแปลง (Commit)
COMMIT;
