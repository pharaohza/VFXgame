# VFXgame — PetAI VFX Library

เว็บเลือก VFX จาก PetTown Three, Pettown Unity, War of Paws, Hovl Studio และ JMO Assets รวม **988 รายการ**: เอฟเฟกต์และเวอร์ชัน 470 รายการ พร้อม texture / atlas 518 รายการ

ค้นหาและกรองตามแหล่งที่มา ประเภทพรีวิว และเวอร์ชัน เลือกการ์ดเพื่อดูตัวอย่าง กด **+** เพื่อเก็บรายการ แล้วส่งออก JSON พร้อม skill ID, version, SHA-256 และพาธอ้างอิงต้นฉบับ รายการที่เลือกเก็บใน localStorage ของเบราว์เซอร์นั้น

## เริ่มใช้งาน

ต้องใช้ Node.js 22.12 ขึ้นไป (CI ใช้ Node.js 24)

```sh
npm ci
npm run check
npm run build
npm run dev
```

เปิด [http://127.0.0.1:5190](http://127.0.0.1:5190) หลังข้อความ Local ปรากฏ เปลี่ยนพอร์ตด้วย environment variable `PORT` ได้ ตัว server ให้บริการไฟล์จาก `dist/` จึงต้อง build ก่อนเริ่ม

ผล build เป็นเว็บ static ที่ `dist/` ใช้ host ที่ให้บริการจาก root URL `/` ได้

## พรีวิวในคลัง

| แบบ | จำนวน | การแสดงผล |
| --- | ---: | --- |
| Three.js | 60 | เรียกโค้ด VFX PetTown ต้นฉบับ: สกิล บอส สถานะ ฝุ่นวิ่ง และรอยเท้า หมุนกล้องและเลื่อนเวลาได้ |
| Godot recording | 211 | ภาพเคลื่อนไหวจาก renderer ต้นฉบับ รวมเวอร์ชันเก่าสำหรับเทียบ |
| Unity adapted | 178 | จำลองจาก texture และค่าที่อ่านจาก ParticleSystem |
| Engine source | 21 | มีไฟล์ต้นฉบับหรือ texture ประกอบ ต้องเปิดใน engine เพื่อดูเอฟเฟกต์เต็ม |
| Textures / atlases | 518 | แสดง asset ประกอบต้นฉบับ |

พรีวิว Unity ไม่ได้รัน Unity shader, curve, sub-emitter, trail หรือ hierarchy ครบแบบ engine ต้นฉบับ จึงอาจดูต่างจาก Unity การแสดงภาพ Godot ในเว็บไม่เปลี่ยนสถานะการยอมรับงานศิลป์ของต้นฉบับ

## ไฟล์ใน repository

- `src/`: เว็บและตัวพรีวิว รวมโค้ด PetTown ที่นำมาใช้กับตัวโหลด texture ของเว็บนี้
- `public/catalog.json`: รายการ 988 รายการ พร้อมที่มาและข้อมูลพรีวิว
- `public/media/`, `public/assets/fx/`: สื่อพรีวิวและ texture ที่เว็บใช้ เปิดเว็บได้โดยไม่ต้องมี donor projects
- `docs/source-inventory.json`: พาธ donor 5,779 พาธและ SHA-256 ที่ไม่ซ้ำ 3,951 รายการ
- `docs/validation/`: ผลตรวจ browser, Unity ทั้ง 178 พรีวิว และการตรวจ hash คลังต้นฉบับ
- `tools/`: build, ตรวจ catalog, สร้าง catalog ใหม่ และ browser QA

คลังไฟล์ต้นฉบับเต็มขนาดประมาณ **2.65 GiB** เก็บแยกในเครื่องที่รวบรวม โดย `objects/` และ `inventory.json` จับคู่ source path กับ object และ hash ไฟล์ต้นฉบับเต็มชุดนี้ไม่ได้รวมใน Git repository พาธใน repo ใช้ `donor://` อ้างอิงชุดต้นทางโดยไม่เปิดเผยพาธภายในเครื่อง

ขอบเขตรวบรวม: Hovl Studio และ JMO Assets ตามพาธที่ระบุ, VFX ใน Pettown Unity, ParticleSystem prefab ที่พบ, โค้ดและ texture ของ PetTown Three, VFX ของ War of Paws ทั้ง `apps/game` และ `godot-prototype`, `art/vfx_sources`, `art/source_assets/skill_rig_lab/vfx` และภาพรีวิว motion.gif พร้อมภาพนิ่ง เก็บ dependency ที่อ้างตรงผ่าน Unity GUID และ Godot `res://` ในคลังต้นฉบับด้วย ไม่นำ cache, build, log และเฟรม QA ที่ซ้ำรายเฟรมเข้ามา

Inventory บันทึก `res://` ที่หาไม่พบสองรายการจาก dependency ข้างเคียง: รูปแบบชื่อไฟล์ที่ต่อสตริงใน `frontier_texture_pool.gd` และ `texture_0135.res` ใน metadata ของ online visuals ทั้งสองไม่ใช่ไฟล์ที่เว็บต้องโหลด

## ตรวจงานและสร้าง catalog ใหม่

```sh
npm run check
npm run build
```

สำหรับ browser QA ให้เปิด server ก่อน จากนั้นรัน:

```sh
npm run qa:browser
npm run qa:unity
```

Windows ใช้ Microsoft Edge ที่ติดตั้งอยู่ ระบบอื่นต้องติดตั้ง Chromium ด้วย `npx playwright-core install chromium` ก่อน ผล QA และภาพหน้าจอเขียนใน `artifacts/` ตัว `qa:browser` จะสร้าง thumbnail จากช่วงที่แสดงเอฟเฟกต์ชัด และอัปเดตเวลาใน catalog ด้วย

`npm run catalog` เป็นงานรวบรวมต้นทาง ต้องกำหนด donor projects ผ่าน environment: `VFX_HOVL_ROOT`, `VFX_PETNEW_ASSETS`, `VFX_PETTOWN_ASSETS`, `VFX_WAR_OF_PAWS_ROOT`, `VFX_PETTOWN_THREE_ROOT` และปลายทางคลังดิบ `VFX_ARCHIVE_DIR` (ค่าเริ่มต้น `artifacts/source-archive`) การ build และเปิดเว็บตามปกติไม่ต้องใช้พาธเหล่านี้ หลังสร้าง catalog ใหม่ให้ทำ browser QA, รัน `node tools/prune-media.mjs` และ build ใหม่ คำสั่งรวบรวมไม่ลบ source object เก่า

ผลตรวจชุดที่รวบรวม: เปิดพรีวิว PetTown ทั้ง 60 แบบและ Unity ทั้ง 178 แบบผ่าน ตรวจ Godot ตัวแทน การค้นหา ผลลัพธ์ว่าง การจำรายการหลัง reload การส่งออก JSON และ viewport 390px ผ่าน ตรวจ hash ของ source object ทั้ง 3,951 ไฟล์ตรงกับ inventory

