-- ============================================================================
-- โปรเจกต์: LongLook - Wardrobe & Outfit Planner
-- โมดูล: โครงสร้างฐานข้อมูล (Database Schema) สำหรับ Oracle Database
-- อ้างอิง: ER Diagram: ระบบจัดการเสื้อผ้าและวางแผนการแต่งกาย (LongLook_ER.pdf)
-- ไฟล์: database/schema.sql
-- คำเตือน: สคริปต์นี้สร้างเฉพาะตารางใหม่และอ็อบเจกต์ที่เกี่ยวข้อง ไม่มีการใช้ DROP TABLE
--         หรือคำสั่งลบข้อมูล เพื่อความปลอดภัยตามข้อกำหนด
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ส่วนที่ 1: การสร้าง SEQUENCES สำหรับสร้างรหัสหลัก (Primary Key ID Generation)
-- ----------------------------------------------------------------------------
-- หมายเหตุ: ใช้สร้าง Primary Key อัตโนมัติในระดับ Database (Oracle 12c / 19c / 21c / 23c)
-- และรองรับให้ Backend สามารถเรียกใช้ผ่าน .NEXTVAL ได้อย่างยืดหยุ่น

CREATE SEQUENCE seq_app_user
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

CREATE SEQUENCE seq_category
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

CREATE SEQUENCE seq_style
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

CREATE SEQUENCE seq_occasion
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

CREATE SEQUENCE seq_weather
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

CREATE SEQUENCE seq_clothing_item
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

CREATE SEQUENCE seq_item_style
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

CREATE SEQUENCE seq_outfit
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

CREATE SEQUENCE seq_calendar_log
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

CREATE SEQUENCE seq_audit_log
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

-- ----------------------------------------------------------------------------
-- ส่วนที่ 2: การสร้างตารางหลัก (Parent / Independent Entities)
-- ----------------------------------------------------------------------------

-- Entity 1: USER (ผู้ใช้งาน)
-- หมายเหตุ Oracle: คำว่า "USER" เป็นคำสงวนพิเศษ (Reserved Keyword / Pseudo-column) ใน Oracle SQL
-- จึงใช้ชื่อตารางจริงว่า "APP_USER" เพื่อป้องกันข้อผิดพลาดทางไวยากรณ์ ORA-00903
CREATE TABLE app_user (
    user_id         NUMBER DEFAULT seq_app_user.NEXTVAL,
    username        VARCHAR2(50 CHAR)   NOT NULL,
    email           VARCHAR2(100 CHAR)  NOT NULL,
    password_hash   VARCHAR2(255 CHAR)  NOT NULL,
    first_name      VARCHAR2(100 CHAR),
    last_name       VARCHAR2(100 CHAR),
    gender          VARCHAR2(20 CHAR),
    role            VARCHAR2(30 CHAR)   DEFAULT 'USER' NOT NULL,
    created_at      TIMESTAMP           DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP,
    deleted_at      TIMESTAMP,
    CONSTRAINT pk_app_user PRIMARY KEY (user_id),
    CONSTRAINT uq_app_user_username UNIQUE (username),
    CONSTRAINT uq_app_user_email UNIQUE (email),
    CONSTRAINT chk_app_user_gender CHECK (gender IN ('MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED') OR gender IS NULL)
);

COMMENT ON TABLE app_user IS 'Entity: USER (ผู้ใช้งานระบบ) - จัดเก็บข้อมูลบัญชีผู้ใช้และสิทธิ์การเข้าถึง';
COMMENT ON COLUMN app_user.user_id IS 'รหัสผู้ใช้งาน (PK)';
COMMENT ON COLUMN app_user.password_hash IS 'รหัสผ่านที่ผ่านการเข้ารหัสทางเดียว (Bcrypt / Argon2 Hash)';
COMMENT ON COLUMN app_user.deleted_at IS 'เวลาที่ผู้ใช้ถูกระงับ/ลบแบบ Soft Delete (NULL = ใช้งานปกติ)';

-- Entity 2: CATEGORY (หมวดหมู่เสื้อผ้า)
CREATE TABLE category (
    category_id     NUMBER DEFAULT seq_category.NEXTVAL,
    category_name   VARCHAR2(100 CHAR)  NOT NULL,
    description     VARCHAR2(500 CHAR),
    CONSTRAINT pk_category PRIMARY KEY (category_id),
    CONSTRAINT uq_category_name UNIQUE (category_name)
);

COMMENT ON TABLE category IS 'Entity: CATEGORY (หมวดหมู่เสื้อผ้า เช่น เสื้อ กางเกง เดรส เครื่องประดับ)';

-- Entity 4: STYLE (สไตล์การแต่งตัว)
CREATE TABLE style (
    style_id        NUMBER DEFAULT seq_style.NEXTVAL,
    style_name      VARCHAR2(100 CHAR)  NOT NULL,
    description     VARCHAR2(500 CHAR),
    CONSTRAINT pk_style PRIMARY KEY (style_id),
    CONSTRAINT uq_style_name UNIQUE (style_name)
);

COMMENT ON TABLE style IS 'Entity: STYLE (สไตล์แฟชั่น เช่น CASUAL, FORMAL, VINTAGE, STREET, KOREAN)';

-- Entity 8: OCCASION (โอกาส/งาน/สถานที่)
CREATE TABLE occasion (
    occasion_id     NUMBER DEFAULT seq_occasion.NEXTVAL,
    occasion_name   VARCHAR2(100 CHAR)  NOT NULL,
    description     VARCHAR2(500 CHAR),
    CONSTRAINT pk_occasion PRIMARY KEY (occasion_id),
    CONSTRAINT uq_occasion_name UNIQUE (occasion_name)
);

COMMENT ON TABLE occasion IS 'Entity: OCCASION (โอกาสหรือสถานที่ เช่น ทำงาน ลำลอง ปาร์ตี้ ท่องเที่ยว)';

-- Entity 10: WEATHER (สภาพอากาศ)
CREATE TABLE weather (
    weather_id          NUMBER DEFAULT seq_weather.NEXTVAL,
    weather_name        VARCHAR2(100 CHAR)  NOT NULL,
    temperature_range   VARCHAR2(100 CHAR),
    CONSTRAINT pk_weather PRIMARY KEY (weather_id),
    CONSTRAINT uq_weather_name UNIQUE (weather_name)
);

COMMENT ON TABLE weather IS 'Entity: WEATHER (สภาพอากาศ เช่น ร้อน อบอุ่น หนาว ฝนตก)';

-- ----------------------------------------------------------------------------
-- ส่วนที่ 3: การสร้างตารางเสื้อผ้าและชุดแต่งกาย (Child & Dependent Entities)
-- ----------------------------------------------------------------------------

-- Entity 3: CLOTHING_ITEM (ชิ้นเสื้อผ้า/ไอเทม)
-- หมายเหตุ Oracle: ใน ER Diagram ระบุชื่อแอตทริบิวต์ "size" แต่เนื่องจากคำว่า "SIZE"
-- เป็นคำสงวน (Reserved Keyword) ใน Oracle Database จึงปรับใช้ชื่อคอลัมน์เป็น "item_size"
-- เพื่อให้เขียนคิวรีได้โดยไม่ต้องครอบเครื่องหมายคำพูดคู่ "SIZE" ตลอดเวลา
CREATE TABLE clothing_item (
    item_id         NUMBER DEFAULT seq_clothing_item.NEXTVAL,
    user_id         NUMBER              NOT NULL,
    category_id     NUMBER              NOT NULL,
    item_name       VARCHAR2(150 CHAR)  NOT NULL,
    color           VARCHAR2(50 CHAR),
    brand           VARCHAR2(100 CHAR),
    item_size       VARCHAR2(50 CHAR),
    image_url       VARCHAR2(1000 CHAR),
    purchase_date   DATE,
    created_at      TIMESTAMP           DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP,
    deleted_at      TIMESTAMP,
    CONSTRAINT pk_clothing_item PRIMARY KEY (item_id),
    CONSTRAINT fk_clothing_user FOREIGN KEY (user_id) REFERENCES app_user(user_id),
    CONSTRAINT fk_clothing_category FOREIGN KEY (category_id) REFERENCES category(category_id)
);

COMMENT ON TABLE clothing_item IS 'Entity: CLOTHING_ITEM (ชิ้นเสื้อผ้า/ไอเทมในตู้เสื้อผ้าของผู้ใช้)';
COMMENT ON COLUMN clothing_item.item_size IS 'ขนาดไซส์เสื้อผ้า (ใน ER Diagram คือ size - ปรับเพื่อเลี่ยง Reserved Keyword ของ Oracle)';
COMMENT ON COLUMN clothing_item.deleted_at IS 'เวลาที่ลบแบบ Soft Delete (NULL = ยังอยู่ในตู้เสื้อผ้า)';

-- Entity 5: ITEM_STYLE (การจัดสไตล์ของชิ้นเสื้อผ้า - ตารางเชื่อม M:N ระหว่าง CLOTHING_ITEM และ STYLE)
CREATE TABLE item_style (
    item_style_id   NUMBER DEFAULT seq_item_style.NEXTVAL,
    item_id         NUMBER NOT NULL,
    style_id        NUMBER NOT NULL,
    CONSTRAINT pk_item_style PRIMARY KEY (item_style_id),
    CONSTRAINT fk_item_style_item FOREIGN KEY (item_id) REFERENCES clothing_item(item_id) ON DELETE CASCADE,
    CONSTRAINT fk_item_style_style FOREIGN KEY (style_id) REFERENCES style(style_id) ON DELETE CASCADE,
    CONSTRAINT uq_item_style UNIQUE (item_id, style_id)
);

COMMENT ON TABLE item_style IS 'Entity: ITEM_STYLE (ตารางสัมพันธ์แบบ M:N ระหว่าง CLOTHING_ITEM และ STYLE)';

-- Entity 6: OUTFIT (ชุดแต่งกาย)
CREATE TABLE outfit (
    outfit_id       NUMBER DEFAULT seq_outfit.NEXTVAL,
    user_id         NUMBER              NOT NULL,
    outfit_name     VARCHAR2(150 CHAR)  NOT NULL,
    description     VARCHAR2(500 CHAR),
    created_at      TIMESTAMP           DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP,
    deleted_at      TIMESTAMP,
    CONSTRAINT pk_outfit PRIMARY KEY (outfit_id),
    CONSTRAINT fk_outfit_user FOREIGN KEY (user_id) REFERENCES app_user(user_id)
);

COMMENT ON TABLE outfit IS 'Entity: OUTFIT (ชุดแต่งกายที่รวมไอเทมเสื้อผ้าหลายชิ้นเข้าด้วยกัน)';
COMMENT ON COLUMN outfit.deleted_at IS 'เวลาที่ลบชุดแบบ Soft Delete (NULL = ใช้งานปกติ)';

-- Entity 7: OUTFIT_ITEM (รายการเสื้อผ้าในชุด - ตารางเชื่อม M:N ระหว่าง OUTFIT และ CLOTHING_ITEM)
-- หมายเหตุ: มีคอลัมน์ user_id (FK) ตามแผนภาพ ER Diagram สำหรับระบุความเป็นเจ้าของหรือเพิ่มประสิทธิภาพการคิวรี
CREATE TABLE outfit_item (
    outfit_id       NUMBER              NOT NULL,
    item_id         NUMBER              NOT NULL,
    user_id         NUMBER,
    added_at        TIMESTAMP           DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_outfit_item PRIMARY KEY (outfit_id, item_id),
    CONSTRAINT fk_outfit_item_outfit FOREIGN KEY (outfit_id) REFERENCES outfit(outfit_id) ON DELETE CASCADE,
    CONSTRAINT fk_outfit_item_item FOREIGN KEY (item_id) REFERENCES clothing_item(item_id),
    CONSTRAINT fk_outfit_item_user FOREIGN KEY (user_id) REFERENCES app_user(user_id)
);

COMMENT ON TABLE outfit_item IS 'Entity: OUTFIT_ITEM (รายการชิ้นเสื้อผ้าที่นำมาประกอบเป็นชุดแต่งกาย)';

-- ----------------------------------------------------------------------------
-- ส่วนที่ 4: การสร้างตารางบันทึกการใช้งาน (Logging & Tracking Entities)
-- ----------------------------------------------------------------------------

-- Entity 9: CALENDAR_LOG (บันทึกการแต่งกายประจำวัน)
CREATE TABLE calendar_log (
    log_id          NUMBER DEFAULT seq_calendar_log.NEXTVAL,
    user_id         NUMBER              NOT NULL,
    outfit_id       NUMBER              NOT NULL,
    occasion_id     NUMBER,
    weather_id      NUMBER,
    log_date        DATE                NOT NULL,
    notes           VARCHAR2(1000 CHAR),
    rating          NUMBER(2, 0),
    created_at      TIMESTAMP           DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP,
    deleted_at      TIMESTAMP,
    CONSTRAINT pk_calendar_log PRIMARY KEY (log_id),
    CONSTRAINT fk_calendar_user FOREIGN KEY (user_id) REFERENCES app_user(user_id),
    CONSTRAINT fk_calendar_outfit FOREIGN KEY (outfit_id) REFERENCES outfit(outfit_id),
    CONSTRAINT fk_calendar_occasion FOREIGN KEY (occasion_id) REFERENCES occasion(occasion_id),
    CONSTRAINT fk_calendar_weather FOREIGN KEY (weather_id) REFERENCES weather(weather_id),
    CONSTRAINT chk_calendar_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

COMMENT ON TABLE calendar_log IS 'Entity: CALENDAR_LOG (บันทึกการแต่งกายลงปฏิทินในแต่ละวัน)';
COMMENT ON COLUMN calendar_log.rating IS 'คะแนนความพึงพอใจต่อลุคการแต่งกายในวันนั้น (1 ถึง 5 ดาว)';

-- Entity 11: AUDIT_LOG (บันทึกประวัติการกระทำ)
CREATE TABLE audit_log (
    audit_id        NUMBER DEFAULT seq_audit_log.NEXTVAL,
    user_id         NUMBER,
    action          VARCHAR2(100 CHAR)  NOT NULL,
    table_name      VARCHAR2(50 CHAR)   NOT NULL,
    record_id       NUMBER,
    old_values      CLOB,
    new_values      CLOB,
    created_at      TIMESTAMP           DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_audit_log PRIMARY KEY (audit_id),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES app_user(user_id)
);

COMMENT ON TABLE audit_log IS 'Entity: AUDIT_LOG (บันทึกประวัติการเปลี่ยนแปลงข้อมูลเพื่อความปลอดภัยและตรวจสอบย้อนหลัง)';

-- ----------------------------------------------------------------------------
-- ส่วนที่ 5: การสร้าง INDEXES สำหรับ Foreign Keys และคอลัมน์สืบค้นบ่อย
-- ----------------------------------------------------------------------------
-- เหตุผล: ป้องกันปัญหา Table Lock ในระดับ Database ขณะ UPDATE/DELETE ตารางหลัก
-- และเพิ่มประสิทธิภาพการค้นหาข้อมูลรายบุคคลและวันที่ในระบบ

-- Indexes สำหรับ CLOTHING_ITEM
CREATE INDEX idx_clothing_user ON clothing_item(user_id);
CREATE INDEX idx_clothing_category ON clothing_item(category_id);
CREATE INDEX idx_clothing_deleted ON clothing_item(deleted_at);

-- Indexes สำหรับ ITEM_STYLE
CREATE INDEX idx_item_style_item ON item_style(item_id);
CREATE INDEX idx_item_style_style ON item_style(style_id);

-- Indexes สำหรับ OUTFIT
CREATE INDEX idx_outfit_user ON outfit(user_id);
CREATE INDEX idx_outfit_deleted ON outfit(deleted_at);

-- Indexes สำหรับ OUTFIT_ITEM
CREATE INDEX idx_outfit_item_item ON outfit_item(item_id);
CREATE INDEX idx_outfit_item_user ON outfit_item(user_id);

-- Indexes สำหรับ CALENDAR_LOG
CREATE INDEX idx_calendar_user ON calendar_log(user_id);
CREATE INDEX idx_calendar_outfit ON calendar_log(outfit_id);
CREATE INDEX idx_calendar_date ON calendar_log(log_date);
CREATE INDEX idx_calendar_occasion ON calendar_log(occasion_id);
CREATE INDEX idx_calendar_weather ON calendar_log(weather_id);
CREATE INDEX idx_calendar_deleted ON calendar_log(deleted_at);

-- Indexes สำหรับ AUDIT_LOG
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_table_rec ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
