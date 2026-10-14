-- ============================================================================
-- โปรเจกต์: LongLook - Wardrobe & Outfit Planner
-- โมดูล: สคริปต์ตรวจสอบความสมบูรณ์ของฐานข้อมูล (Database Verification Script)
-- ระบบฐานข้อมูลเป้าหมาย: Oracle Database
-- ไฟล์: database/verify.sql
-- คำเตือน: สคริปต์นี้เป็นคำสั่ง SELECT ตรวจสอบข้อมูลเท่านั้น ไม่มีการแก้ไขหรือลบข้อมูล
-- ============================================================================

SET PAGESIZE 100;
SET LINESIZE 200;
COLUMN table_name FORMAT A25;
COLUMN constraint_name FORMAT A28;
COLUMN constraint_type FORMAT A15;
COLUMN column_name FORMAT A25;
COLUMN r_constraint_name FORMAT A28;
COLUMN referenced_table FORMAT A25;
COLUMN sequence_name FORMAT A25;
COLUMN index_name FORMAT A25;
COLUMN status FORMAT A10;

PROMPT ============================================================================
PROMPT 1. รายชื่อตารางทั้งหมดในระบบ LongLook (ตรวจสอบว่าสร้างครบ 11 ตาราง)
PROMPT ============================================================================

SELECT table_name, status, num_rows, tablespace_name
FROM user_tables
WHERE table_name IN (
    'APP_USER',
    'CATEGORY',
    'CLOTHING_ITEM',
    'STYLE',
    'ITEM_STYLE',
    'OUTFIT',
    'OUTFIT_ITEM',
    'OCCASION',
    'CALENDAR_LOG',
    'WEATHER',
    'AUDIT_LOG'
)
ORDER BY table_name;


PROMPT ============================================================================
PROMPT 2. รายการ PRIMARY KEY ของทุกตาราง
PROMPT ============================================================================

SELECT 
    c.table_name,
    c.constraint_name,
    cc.column_name,
    c.status
FROM user_constraints c
JOIN user_cons_columns cc ON c.constraint_name = cc.constraint_name
WHERE c.constraint_type = 'P'
  AND c.table_name IN (
    'APP_USER', 'CATEGORY', 'CLOTHING_ITEM', 'STYLE', 'ITEM_STYLE',
    'OUTFIT', 'OUTFIT_ITEM', 'OCCASION', 'CALENDAR_LOG', 'WEATHER', 'AUDIT_LOG'
  )
ORDER BY c.table_name, cc.position;


PROMPT ============================================================================
PROMPT 3. รายการ FOREIGN KEY และตารางต้นทาง-ปลายทาง
PROMPT ============================================================================

SELECT 
    c.table_name,
    c.constraint_name,
    cc.column_name,
    r.table_name AS referenced_table,
    c.delete_rule,
    c.status
FROM user_constraints c
JOIN user_cons_columns cc ON c.constraint_name = cc.constraint_name
JOIN user_constraints r ON c.r_constraint_name = r.constraint_name
WHERE c.constraint_type = 'R'
  AND c.table_name IN (
    'APP_USER', 'CATEGORY', 'CLOTHING_ITEM', 'STYLE', 'ITEM_STYLE',
    'OUTFIT', 'OUTFIT_ITEM', 'OCCASION', 'CALENDAR_LOG', 'WEATHER', 'AUDIT_LOG'
  )
ORDER BY c.table_name, c.constraint_name;


PROMPT ============================================================================
PROMPT 4. รายการ UNIQUE และ CHECK CONSTRAINTS
PROMPT ============================================================================

SELECT 
    table_name,
    constraint_name,
    CASE constraint_type
        WHEN 'U' THEN 'UNIQUE'
        WHEN 'C' THEN 'CHECK'
        ELSE constraint_type
    END AS constraint_type,
    search_condition,
    status
FROM user_constraints
WHERE constraint_type IN ('U', 'C')
  AND table_name IN (
    'APP_USER', 'CATEGORY', 'CLOTHING_ITEM', 'STYLE', 'ITEM_STYLE',
    'OUTFIT', 'OUTFIT_ITEM', 'OCCASION', 'CALENDAR_LOG', 'WEATHER', 'AUDIT_LOG'
  )
  -- กรองเงื่อนไข NOT NULL อัตโนมัติของ Oracle ออก เพื่อให้แสดงเฉพาะ Check Constraint ที่เรากำหนดเอง
  AND (search_condition_vc NOT LIKE '%IS NOT NULL' OR constraint_type = 'U')
ORDER BY table_name, constraint_name;


PROMPT ============================================================================
PROMPT 5. รายการ SEQUENCES สำหรับสร้าง Primary Key
PROMPT ============================================================================

SELECT 
    sequence_name,
    min_value,
    max_value,
    increment_by,
    last_number
FROM user_sequences
WHERE sequence_name LIKE 'SEQ_%'
ORDER BY sequence_name;


PROMPT ============================================================================
PROMPT 6. รายการ INDEXES ที่สร้างขึ้น
PROMPT ============================================================================

SELECT 
    table_name,
    index_name,
    uniqueness,
    status
FROM user_indexes
WHERE table_name IN (
    'APP_USER', 'CATEGORY', 'CLOTHING_ITEM', 'STYLE', 'ITEM_STYLE',
    'OUTFIT', 'OUTFIT_ITEM', 'OCCASION', 'CALENDAR_LOG', 'WEATHER', 'AUDIT_LOG'
  )
ORDER BY table_name, index_name;


PROMPT ============================================================================
PROMPT 7. ตรวจสอบจำนวนข้อมูลในแต่ละตาราง (Row Count Verification)
PROMPT ============================================================================

SELECT 'APP_USER' AS table_name, COUNT(*) AS total_rows FROM app_user
UNION ALL
SELECT 'CATEGORY', COUNT(*) FROM category
UNION ALL
SELECT 'STYLE', COUNT(*) FROM style
UNION ALL
SELECT 'OCCASION', COUNT(*) FROM occasion
UNION ALL
SELECT 'WEATHER', COUNT(*) FROM weather
UNION ALL
SELECT 'CLOTHING_ITEM', COUNT(*) FROM clothing_item
UNION ALL
SELECT 'ITEM_STYLE', COUNT(*) FROM item_style
UNION ALL
SELECT 'OUTFIT', COUNT(*) FROM outfit
UNION ALL
SELECT 'OUTFIT_ITEM', COUNT(*) FROM outfit_item
UNION ALL
SELECT 'CALENDAR_LOG', COUNT(*) FROM calendar_log
UNION ALL
SELECT 'AUDIT_LOG', COUNT(*) FROM audit_log;
