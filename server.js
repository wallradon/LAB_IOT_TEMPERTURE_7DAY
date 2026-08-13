const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 3000;

// อนุญาตให้รับส่งข้อมูลข้ามโดเมน และแปลงข้อมูลที่รับมาให้อยู่ในรูปแบบ JSON
app.use(cors());
app.use(express.json());

// 1. ตั้งค่าการเชื่อมต่อฐานข้อมูล
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'rootpassword', // รหัสผ่านที่เราตั้งไว้ใน Docker
    database: 'esp_data'      // ชื่อฐานข้อมูล
});

// 2. ตรวจสอบว่าเชื่อมต่อ Database ได้ไหม
db.connect((err) => {
    if (err) {
        console.error('❌ เชื่อมต่อ Database ไม่สำเร็จ:', err.message);
        return;
    }
    console.log('✅ เชื่อมต่อ MySQL สำเร็จแล้ว!');
});

// 3. สร้างช่องทาง (Endpoint) สำหรับรับข้อมูลจาก ESP32
// เราจะใช้ Method: POST และ Path: /api/temp
app.post('/api/temp', (req, res) => {
    // ดึงค่าอุณหภูมิที่ส่งมาใน Body
    const { temperature } = req.body;

    // เช็คว่า ESP32 ส่งค่า temperature มาจริงไหม
    if (temperature === undefined) {
        return res.status(400).json({ error: 'กรุณาส่งค่า temperature มาด้วย' });
    }

    // คำสั่ง SQL สำหรับบันทึกข้อมูล
    const sql = 'INSERT INTO sensor_logs (temperature) VALUES (?)';

    // สั่งบันทึกลง Database
    db.query(sql, [temperature], (err, result) => {
        if (err) {
            console.error('❌ บันทึกข้อมูลไม่สำเร็จ:', err);
            return res.status(500).json({ error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
        }

        console.log(`📥 ได้รับและบันทึกอุณหภูมิ: ${temperature} °C`);
        res.status(201).json({
            message: 'บันทึกข้อมูลอุณหภูมิสำเร็จ!',
            id: result.insertId
        });
    });
});

// 4. สั่งให้ Server เริ่มทำงาน
app.listen(port, () => {
    console.log(`🚀 Server API รันอยู่ที่ http://localhost:${port}`);
});