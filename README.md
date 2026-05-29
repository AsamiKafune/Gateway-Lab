# Gateway-Lab
Gateway สำหรับรับข้อมูลโดเนตจากหลายแพลตฟอร์มแล้วส่งต่อเข้า Streamlabs

# ♦️ ผู้ใช้ทั่วไป
- โหลดไฟล์จาก [คลิ๊กที่นี่](https://github.com/AsamiKafune/Gateway-Lab/releases)
- แตกไฟล์และแก้ไข config.json โดยแก้ overlayURL ของแพลตฟอร์มต่างๆเช่น ganknow เอาลิ้งก์จาก [คลิ๊กที่นี่](https://ganknow.com/manage/stream-settings?tab=alert)
```
# ตัวอย่าง

{
    "platform": {
        "ganknow": {
            "endpoint": "wss://api.ganknow.com/v1/ws/users/media-share?page=alert-and-tts&source=streaming&user_id=",
            "overlayURL":"https://stream.ganknow.com/XXXXX-XXXX-XXXXXXXX" <--- ตรงนี้
        }
    }
}
```
- กดเปิดไฟล์ชื่อว่า gateway-lab-win.exe และ login Streamlab ให้เรียบร้อยเป็นอันจบ

# 🚩 DEV
- `Gateway/` ตัวรับ event โดเนตและส่งข้อมูลเข้า Streamlabs
- `StreamlabAuth/` ตัวช่วย OAuth callback เพื่อแลก `code` เป็น `access_token`

## Requirement

- Node.js 18+ แนะนำ LTS
- บัญชี Streamlabs
- Streamlabs app credentials
  - `CLIENT_ID`
  - `CLIENT_SECRECT` ตามชื่อตัวแปรที่โค้ดใช้อยู่ตอนนี้
- URL overlay ของ GankNow

## การตั้งค่า

### 1. ติดตั้ง dependencies

รันแยกในแต่ละโฟลเดอร์:

```powershell
cd StreamlabAuth
npm install

cd ..\Gateway
npm install
```

### 2. ตั้งค่า `StreamlabAuth`

คัดลอก `StreamlabAuth/example.env` เป็น `StreamlabAuth/.env` แล้วแก้ค่าจริง:

```env
PORT=6661
HOST_URL=http://localhost:6660
REDIRECT=http://localhost:6661/api/v1/account/redirect
CLIENT_SECRECT=YOUR_STREAMLABS_CLIENT_SECRET
CLIENT_ID=YOUR_STREAMLABS_CLIENT_ID
```

ความหมาย:

- `PORT` พอร์ตของ service auth
- `HOST_URL` URL ของ `Gateway` ที่จะรับ `access_token`
- `REDIRECT` redirect URL ที่ต้องตรงกับค่าที่ตั้งใน Streamlabs app
- `CLIENT_SECRECT` client secret ของ Streamlabs app
- `CLIENT_ID` client id ของ Streamlabs app

### 3. ตั้งค่า `Gateway/config.json`

สร้างไฟล์ `config.json` ในโฟลเดอร์ `Gateway/`

ตัวอย่าง:

```json
{
  "platform": {
    "ganknow": {
      "endpoint": "wss://stream.ganknow.com/",
      "overlayURL": "https://stream.ganknow.com/xxxxxxxx"
    }
  }
}
```

หมายเหตุ:

- ถ้า `overlayURL` เป็นค่าว่าง ระบบจะไม่เชื่อม GankNow
- โค้ดจะตัด prefix `https://stream.ganknow.com/` ออกจาก `overlayURL` แล้วนำไปต่อกับ `endpoint`

## วิธีใช้งาน

### 1. เปิด service auth

```powershell
cd StreamlabAuth
node index.js
```

เมื่อเริ่มสำเร็จ จะฟังที่พอร์ตใน `.env` เช่น `6661`

### 2. เปิด gateway

```powershell
cd Gateway
node index.js
```

ตัว gateway จะเปิดเว็บเซิร์ฟเวอร์ที่ `http://localhost:6660`

### 3. เชื่อม Streamlabs ครั้งแรก

ถ้ายังไม่มีไฟล์ `.token` ใน `Gateway/` โปรแกรมจะแสดงลิงก์สำหรับ login Streamlabs

ขั้นตอน:

1. เปิดลิงก์ที่แสดงใน console
2. Login และอนุญาตสิทธิ์ให้แอป
3. ระบบ auth จะ redirect กลับมาที่ `Gateway`
4. `Gateway` จะบันทึก token ไว้ในไฟล์ `.token`

หลังจากนั้นครั้งถัดไปโปรแกรมจะพยายามใช้ token เดิมอัตโนมัติ

## การทำงานโดยย่อ

1. `Gateway` โหลดค่า `config.json`
2. ถ้ามี token จะเรียก Streamlabs API เพื่อตรวจสอบบัญชี
3. ถ้า token ใช้ได้ จะเชื่อม WebSocket ไปที่ GankNow
4. เมื่อมี event ประเภท `QUEUE` และ `ALERT_AND_TTS`
5. ระบบจะดึงชื่อผู้โดเนต, ข้อความ, และยอดโดเนต
6. จากนั้นส่งเข้า Streamlabs ผ่าน `POST /api/v2.0/donations`

## ไฟล์ที่ระบบสร้างเอง
- `Gateway/.token` เก็บ Streamlabs access token หลัง authorize สำเร็จ