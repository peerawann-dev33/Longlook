# คู่มือโครงสร้างฐานข้อมูล Oracle Database - โครงการ LongLook (Wardrobe & Outfit Planner)

เอกสารนี้อธิบายรายละเอียดโครงสร้างฐานข้อมูลสำหรับระบบ **LongLook (Wardrobe & Outfit Planner)** ที่ออกแบบตามแผนภาพ **ER Diagram (LongLook_ER.pdf)** และ Data Dictionary ของโครงการ สำหรับนำไปติดตั้งและใช้งานบน **Oracle Database** ผ่านเครื่องมือ **Oracle SQL Developer**

---

## 1. ข้อกำหนดและเวอร์ชันระบบฐานข้อมูล

- **ระบบฐานข้อมูลเป้าหมาย:** Oracle Database 19c, 21c หรือ 23c (รองรับทั้ง Enterprise Edition, Standard Edition 2, Oracle Database Free / XE)
- **เครื่องมือจัดการ:** Oracle SQL Developer, SQLcl, หรือ DBeaver
- **Character Set แนะนำ:** AL32UTF8 (เพื่อรองรับภาษาไทยและอิโมจิได้อย่างสมบูรณ์ โดยใน Schema ได้กำหนดคอลัมน์เป็น `VARCHAR2(... CHAR)` ไว้ทั้งหมดเพื่อป้องกันปัญหาขนาดตัวอักษรภาษาไทยแบบหลายไบต์)

---

## 2. โครงสร้างไฟล์ในโฟลเดอร์ `database/`

```
database/
├── schema.sql      # สคริปต์สร้าง Sequences, Tables, Constraints, และ Indexes ทั้งหมด
├── seed.sql        # ข้อมูลตั้งต้น (Master Data) และข้อมูลจำลองทดสอบที่ปลอดภัย
├── verify.sql      # สคริปต์ตรวจสอบความถูกต้องของตาราง คีย์ และจำนวนข้อมูล
└── README.md       # คู่มือการใช้งานและคำอธิบายสถาปัตยกรรมฐานข้อมูล (เอกสารนี้)
```

---

## 3. รายละเอียด 11 ตารางตาม ER Diagram

| ลำดับการสร้าง | Entity ใน ER Diagram | ชื่อตารางจริงใน Oracle | คำอธิบาย | Primary Key | Foreign Keys |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | **USER** | `APP_USER` | จัดเก็บข้อมูลผู้ใช้งานระบบ | `user_id` | - |
| 2 | **CATEGORY** | `CATEGORY` | หมวดหมู่เสื้อผ้า (เช่น เสื้อ, กางเกง, รองเท้า) | `category_id` | - |
| 3 | **STYLE** | `STYLE` | สไตล์แฟชั่น (เช่น CASUAL, KOREAN, FORMAL) | `style_id` | - |
| 4 | **OCCASION** | `OCCASION` | โอกาส/สถานที่แต่งกาย (เช่น ทำงาน, คาเฟ่) | `occasion_id` | - |
| 5 | **WEATHER** | `WEATHER` | สภาพอากาศและช่วงอุณหภูมิ | `weather_id` | - |
| 6 | **CLOTHING_ITEM** | `CLOTHING_ITEM` | รายการชิ้นเสื้อผ้าในตู้ของผู้ใช้ | `item_id` | `user_id`, `category_id` |
| 7 | **ITEM_STYLE** | `ITEM_STYLE` | ตารางเชื่อม M:N ระหว่างเสื้อผ้ากับสไตล์ | `item_style_id` | `item_id`, `style_id` |
| 8 | **OUTFIT** | `OUTFIT` | เซ็ตชุดแต่งกายที่สร้างโดยผู้ใช้ | `outfit_id` | `user_id` |
| 9 | **OUTFIT_ITEM** | `OUTFIT_ITEM` | ตารางเชื่อม M:N ของเสื้อผ้าที่ประกอบในชุด | `(outfit_id, item_id)` | `outfit_id`, `item_id`, `user_id` |
| 10 | **CALENDAR_LOG** | `CALENDAR_LOG` | บันทึกการแต่งกายลงปฏิทินประจำวัน | `log_id` | `user_id`, `outfit_id`, `occasion_id`, `weather_id` |
| 11 | **AUDIT_LOG** | `AUDIT_LOG` | บันทึกประวัติการกระทำเพื่อความปลอดภัย | `audit_id` | `user_id` |

---

## 4. ข้อสมมติฐานและการปรับปรุงเพื่อ Oracle Database

เพื่อให้สคริปต์สามารถทำงานบน Oracle Database ได้อย่างมีเสถียรภาพและไม่เกิดข้อผิดพลาด จึงมีการบันทึกเหตุผลและการตัดสินใจไว้ดังนี้:

1. **ชื่อตาราง `APP_USER` แทน `USER`:**
   - ในระบบ Oracle Database คำว่า `USER` เป็นคำสงวนพิเศษ (Reserved Pseudo-column) ที่คืนค่า Schema ผู้ใช้ปัจจุบัน การตั้งชื่อตารางว่า `USER` อาจทำให้เกิดข้อผิดพลาด ORA-00903: invalid table name เว้นแต่จะครอบ Double Quotes ซึ่งจะก่อปัญหาการคิวรีตามมา จึงใช้ชื่อตารางจริงเป็น `APP_USER` และระบุชัดเจนว่าเป็น Entity USER ตาม ER Diagram
2. **ชื่อคอลัมน์ `item_size` ในตาราง `CLOTHING_ITEM`:**
   - ใน ER Diagram ระบุชื่อแอตทริบิวต์ว่า `size` แต่เนื่องจาก `SIZE` เป็น Reserved Keyword ใน Oracle Database จึงปรับใช้ชื่อคอลัมน์ว่า `item_size` เพื่อป้องกัน ORA-00904 เมื่อเขียนคิวรีทั่วไป
3. **การสร้างรหัสหลักด้วย Oracle Sequence:**
   - สร้าง Sequence แยกตาม Entity เช่น `seq_app_user`, `seq_clothing_item` เป็นต้น โดยผูกเป็นค่าเริ่มต้นผ่าน `DEFAULT seq_name.NEXTVAL` (ไวยากรณ์มาตรฐานของ Oracle 12c เป็นต้นมา) ทำให้รองรับทั้งการ `INSERT` แบบไม่ระบุรหัส (ให้ฐานข้อมูลดึง Sequence เอง) และรองรับให้ Backend สามารถเรียก `SELECT seq_name.NEXTVAL FROM dual` มาใช้งานก่อนได้
4. **ความสัมพันธ์ของ `OUTFIT_ITEM`:**
   - ใช้ Composite Primary Key `(outfit_id, item_id)` เพื่อป้องกันไม่ให้ไอเทมชิ้นเดียวกันถูกเพิ่มซ้ำในชุดเดียวกัน และคงคอลัมน์ `user_id (FK)` ตามที่ปรากฏใน ER Diagram เพื่อความสะดวกรวดเร็วในการคัดกรองข้อมูลตามผู้ใช้ (User Isolation / Partitioning)
5. **การรองรับ Soft Delete:**
   - ตารางหลักที่มีการลบข้อมูล (`APP_USER`, `CLOTHING_ITEM`, `OUTFIT`, `CALENDAR_LOG`) มีคอลัมน์ `deleted_at TIMESTAMP NULL` เพื่อรองรับการลบแบบปลอดภัยโดยไม่ทำลายประวัติการใช้งาน
6. **การจัดเก็บรหัสผ่าน:**
   - คอลัมน์ `password_hash VARCHAR2(255 CHAR)` กำหนดขึ้นเพื่อเก็บค่าแฮชรหัสผ่านความปลอดภัยสูง (เช่น Bcrypt หรือ Argon2) โดยไม่มีการเก็บรหัสผ่านแบบ Plaintext เด็ดขาด

---

## 5. ขั้นตอนการรันไฟล์ใน Oracle SQL Developer

### ขั้นตอนที่ 1: เตรียมการเชื่อมต่อ (Database Connection)
1. เปิดโปรแกรม **Oracle SQL Developer**
2. สร้าง Connection ไปยังฐานข้อมูลหรือ Schema ที่ต้องการ (เช่น User ที่มีสิทธิ์ `CREATE TABLE`, `CREATE SEQUENCE`, `CREATE INDEX`, `CREATE VIEW`)
3. ทดสอบการเชื่อมต่อ (Test Connection) และคลิก **Connect**

### ขั้นตอนที่ 2: รันไฟล์ `database/schema.sql` (สร้างโครงสร้าง)
1. ใน Oracle SQL Developer ไปที่เมนู **File > Open**
2. เลือกไฟล์ `database/schema.sql`
3. ตรวจสอบให้แน่ใจว่าได้เลือก Connection ที่ถูกต้องตรงมุมขวาบนของหน้าต่าง Editor
4. คลิกปุ่ม **Run Script (F5)** (ไอคอนแผ่นกระดาษมีลูกศรสีเขียว ไม่ใช่ปุ่ม Run Statement Ctrl+Enter)
5. ตรวจสอบหน้าต่าง **Script Output** ด้านล่าง จะต้องขึ้นว่าสร้าง Sequence, Table และ Index สำเร็จทั้งหมด โดยไม่มีข้อผิดพลาด ORA-

### ขั้นตอนที่ 3: รันไฟล์ `database/seed.sql` (นำเข้าข้อมูลตั้งต้น)
1. ไปที่เมนู **File > Open** เลือกไฟล์ `database/seed.sql`
2. คลิกปุ่ม **Run Script (F5)**
3. สคริปต์จะทำการแทรกข้อมูล Master Data (หมวดหมู่, สไตล์, โอกาส, สภาพอากาศ) และข้อมูลจำลองทดสอบ พร้อมคำสั่ง `COMMIT;` ให้เรียบร้อย

### ขั้นตอนที่ 4: รันไฟล์ `database/verify.sql` (ตรวจสอบผลลัพธ์)
1. ไปที่เมนู **File > Open** เลือกไฟล์ `database/verify.sql`
2. คลิกปุ่ม **Run Script (F5)**
3. ตรวจสอบผลลัพธ์ใน Script Output:
   - ตารางครบทั้ง 11 ตาราง (Status = VALID)
   - Primary Keys ครบทุกตาราง
   - Foreign Keys ชี้ไปยังตารางที่ถูกต้อง
   - Sequences ถูกสร้างครบ
   - จำนวนแถว (Row Count) มีข้อมูลตรงตามที่ Seed ไว้

---

## 6. ข้อควรระวังและความปลอดภัย

1. **ห้ามใช้คำสั่ง DROP TABLE หรือ TRUNCATE:**
   - สคริปต์ในชุดนี้ได้รับการออกแบบให้เป็นไปตามข้อกำหนดความปลอดภัย โดยไม่มีคำสั่ง `DROP TABLE` หรือคำสั่งทำลายข้อมูล หากต้องการล้างฐานข้อมูลในสภาพแวดล้อม Development ให้ผู้ดูแลระบบพิจารณาดำเนินการด้วยตนเองอย่างรอบคอบ
2. **การทำธุรกรรม (Transaction & Commit):**
   - ใน Oracle Database การทำ DDL (เช่น `CREATE TABLE`, `CREATE SEQUENCE`) จะทำ Auto-commit โดยอัตโนมัติ
   - ส่วนคำสั่ง DML ใน `seed.sql` มีคำสั่ง `COMMIT;` กำกับไว้ท้ายสคริปต์แล้ว หากมีการแก้ไขหรือแทรกข้อมูลเพิ่มเติม อย่าลืมสั่ง `COMMIT;` เสมอ
3. **การเชื่อมต่อจาก Backend Node.js:**
   - เมื่อต้องการเชื่อมต่อ Backend Node.js เข้ากับ Oracle Database ในอนาคต แนะนำให้ใช้ไลบรารีทางการ `oracledb` (node-oracledb) ผ่าน Thin mode หรือ Thick mode (Instant Client)
