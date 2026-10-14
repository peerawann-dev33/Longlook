-- ============================================================================
-- โปรเจกต์: LongLook - Wardrobe & Outfit Planner
-- โมดูล: ชุดคำสั่งทดสอบการทำงานของฐานข้อมูล (Database Test Queries)
-- ไฟล์: database/test_queries.sql
-- วัตถุประสงค์: ใช้เปิดและรันใน Oracle SQL Developer เพื่อทดสอบการทำงานจริง
-- ============================================================================

SET PAGESIZE 50;
SET LINESIZE 200;

PROMPT ============================================================================
PROMPT [ทดสอบที่ 1] ทดสอบการดึงข้อมูลตู้เสื้อผ้าของผู้ใช้ (User Closet with Styles)
PROMPT จำลองการทำงานของหน้า "ตู้เสื้อผ้า (Closet)" ในแอปพลิเคชัน
PROMPT ============================================================================

SELECT 
    u.username,
    ci.item_id,
    ci.item_name,
    c.category_name,
    ci.color,
    ci.brand,
    ci.item_size,
    LISTAGG(s.style_name, ', ') WITHIN GROUP (ORDER BY s.style_name) AS matched_styles,
    TO_CHAR(ci.purchase_date, 'YYYY-MM-DD') AS purchase_date
FROM clothing_item ci
JOIN app_user u ON ci.user_id = u.user_id
JOIN category c ON ci.category_id = c.category_id
LEFT JOIN item_style is_rel ON ci.item_id = is_rel.item_id
LEFT JOIN style s ON is_rel.style_id = s.style_id
WHERE ci.deleted_at IS NULL
  AND u.username = 'demo_user'
GROUP BY u.username, ci.item_id, ci.item_name, c.category_name, ci.color, ci.brand, ci.item_size, ci.purchase_date
ORDER BY ci.item_id;


PROMPT ============================================================================
PROMPT [ทดสอบที่ 2] ทดสอบการดึงเซ็ตชุดแต่งกาย (Outfit with Items)
PROMPT จำลองการทำงานของหน้า "เซ็ตชุด (Outfit Detail)" ในแอปพลิเคชัน
PROMPT ============================================================================

SELECT 
    o.outfit_id,
    o.outfit_name,
    o.description AS outfit_description,
    ci.item_id,
    ci.item_name,
    c.category_name,
    ci.color,
    ci.brand
FROM outfit o
JOIN outfit_item oi ON o.outfit_id = oi.outfit_id
JOIN clothing_item ci ON oi.item_id = ci.item_id
JOIN category c ON ci.category_id = c.category_id
WHERE o.deleted_at IS NULL
  AND o.outfit_id = 1
ORDER BY oi.added_at;


PROMPT ============================================================================
PROMPT [ทดสอบที่ 3] ทดสอบการดึงบันทึกปฏิทินการแต่งกาย (Calendar Log with Context)
PROMPT จำลองการทำงานของหน้า "ปฏิทิน (Calendar)" ในแอปพลิเคชัน
PROMPT ============================================================================

SELECT 
    cl.log_id,
    TO_CHAR(cl.log_date, 'YYYY-MM-DD') AS wear_date,
    u.username,
    o.outfit_name,
    occ.occasion_name,
    w.weather_name,
    w.temperature_range,
    cl.rating || ' / 5 ดาว' AS user_rating,
    cl.notes
FROM calendar_log cl
JOIN app_user u ON cl.user_id = u.user_id
JOIN outfit o ON cl.outfit_id = o.outfit_id
LEFT JOIN occasion occ ON cl.occasion_id = occ.occasion_id
LEFT JOIN weather w ON cl.weather_id = w.weather_id
WHERE cl.deleted_at IS NULL
ORDER BY cl.log_date DESC;


PROMPT ============================================================================
PROMPT [ทดสอบที่ 4] ทดสอบการทำงานของ Sequence อัตโนมัติ (Auto-increment PK)
PROMPT ลอง INSERT เสื้อผ้าใหม่โดยไม่ระบุ item_id เพื่อดูว่าได้รหัสอัตโนมัติหรือไม่
PROMPT ============================================================================

INSERT INTO clothing_item (user_id, category_id, item_name, color, brand, item_size)
VALUES (1, 1, 'เสื้อเชิ้ตแขนยาวสีฟ้าพาสเทล', 'ฟ้า', 'MUJI', 'L');

-- ตรวจสอบแถวที่เพิ่งเพิ่มเข้ามา
SELECT item_id, item_name, color, brand, item_size, created_at
FROM clothing_item
WHERE item_name = 'เสื้อเชิ้ตแขนยาวสีฟ้าพาสเทล';

-- ยกเลิกการบันทึกชั่วคราวของการทดสอบ (Rollback) เพื่อไม่ให้กระทบข้อมูลหลัก
ROLLBACK;


PROMPT ============================================================================
PROMPT [ทดสอบที่ 5] ทดสอบระบบป้องกันข้อมูลผิดพลาด (Constraint Validations)
PROMPT หมายเหตุ: บล็อกด้านล่างจะทดสอบ 3 กรณี และจับ Exception เพื่อแสดงว่า
PROMPT คอนสเตรนต์ของฐานข้อมูลทำงานอย่างถูกต้อง
PROMPT ============================================================================

SET SERVEROUTPUT ON;

DECLARE
    v_dummy NUMBER;
BEGIN
    DBMS_OUTPUT.PUT_LINE('--- เริ่มทดสอบ Constraints ---');

    -- กรณี 5.1: ทดสอบ CHECK Constraint (ใส่คะแนน rating เกิน 5)
    BEGIN
        INSERT INTO calendar_log (user_id, outfit_id, log_date, rating)
        VALUES (1, 1, SYSDATE, 10);
        DBMS_OUTPUT.PUT_LINE('[FAIL] กรณี 5.1: ระบบยอมให้ใส่ rating = 10 (ผิดปกติ)');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -2290 THEN
                DBMS_OUTPUT.PUT_LINE('[PASS] กรณี 5.1: CHECK Constraint ทำงานถูกต้อง ปฏิเสธ rating = 10 (ORA-02290)');
            ELSE
                DBMS_OUTPUT.PUT_LINE('[INFO] กรณี 5.1 เกิด Error: ' || SQLERRM);
            END IF;
    END;

    -- กรณี 5.2: ทดสอบ UNIQUE Constraint (ใส่ username ซ้ำ)
    BEGIN
        INSERT INTO app_user (username, email, password_hash)
        VALUES ('demo_user', 'different_email@test.com', 'dummy_hash');
        DBMS_OUTPUT.PUT_LINE('[FAIL] กรณี 5.2: ระบบยอมให้ใส่ username ซ้ำ (ผิดปกติ)');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -1 THEN
                DBMS_OUTPUT.PUT_LINE('[PASS] กรณี 5.2: UNIQUE Constraint ทำงานถูกต้อง ปฏิเสธ username ซ้ำ (ORA-00001)');
            ELSE
                DBMS_OUTPUT.PUT_LINE('[INFO] กรณี 5.2 เกิด Error: ' || SQLERRM);
            END IF;
    END;

    -- กรณี 5.3: ทดสอบ FOREIGN KEY Constraint (อ้างอิง user_id ที่ไม่มีอยู่จริง)
    BEGIN
        INSERT INTO clothing_item (user_id, category_id, item_name)
        VALUES (99999, 1, 'Ghost Shirt');
        DBMS_OUTPUT.PUT_LINE('[FAIL] กรณี 5.3: ระบบยอมให้อ้างอิง user_id ที่ไม่มีอยู่จริง (ผิดปกติ)');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -2291 THEN
                DBMS_OUTPUT.PUT_LINE('[PASS] กรณี 5.3: FOREIGN KEY Constraint ทำงานถูกต้อง ปฏิเสธ user_id ที่ไม่มีอยู่จริง (ORA-02291)');
            ELSE
                DBMS_OUTPUT.PUT_LINE('[INFO] กรณี 5.3 เกิด Error: ' || SQLERRM);
            END IF;
    END;

    DBMS_OUTPUT.PUT_LINE('--- สิ้นสุดการทดสอบ Constraints ---');
END;
/
