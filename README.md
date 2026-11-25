# Mafia — o‘yin platformasi (vaqtinchalik nom)

Uzbekcha Mafia platformasining dastlabki veb-versiyasi. Stack: React 19, TypeScript, Express, tRPC, Drizzle ORM va Manus boshqaradigan MySQL. API keyinchalik mobil mijozlar bilan qayta ishlatilishi uchun HTTP/tRPC qatlamida ajratilgan.

## Ishga tushirish

Talablar: Node.js 22, pnpm 10.18. Manus muhitida loyiha sozlamalari `DATABASE_URL`, Manus OAuth va server kalitlarini beradi; maxfiy qiymatlarni repoga yoki brauzer kodiga yozmang.

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Mahalliy, Manus’dan tashqari muhitda `DATABASE_URL`, `MANUS_PROJECT_ID`, `MANUS_API_KEY`, `MANUS_API_URL`, `MANUS_JWT_SECRET` va kerak bo‘lsa `MANUS_OAUTH_API_URL` ni xavfsiz environment orqali ta’minlang. Kirish hozir Manus OAuth’ga bog‘liq; mustaqil email/parol ro‘yxatdan o‘tishi yo‘q.

## Tekshiruv va build

```bash
pnpm check       # TypeScript
pnpm test        # Vitest
pnpm build       # frontend va server
pnpm start       # production bundle
```

`pnpm db:migrate` mavjud migratsiyalarni qo‘llaydi. `pnpm db:push` schema o‘zgarishini generatsiya qilib migratsiya qiladi; production ma’lumotlar bazasida ko‘rib chiqmasdan ishlatmang. Manus muhitidagi baza development, test va production uchun umumiy bo‘lishi mumkin; test paytida real ma’lumotni o‘chirmang.

## Joylashtirish

Loyihada Node 22 asosidagi `Dockerfile` bor. Manus WebDev deployment konfiguratsiyasi Dockerfile’ni yig‘adi, `pnpm build` ni bajaradi va `PORT` (odatda 3000) da `dist/index.js` ni ishga tushiradi. Health endpoint: `GET /api/health`. Cloud’da platforma tomonidan berilgan MySQL va Manus OAuth qiymatlarini ishlating; ularni Docker build vaqtida yoki frontend bundle’ga qo‘shmang. Deploydan avval migratsiyalarni nazoratli tartibda qo‘llang.

## Hozirgi holat

Ishlayotgan dastlabki oqimlar: Manus orqali autentifikatsiya, profil nomi/rasmi va maxfiylik sozlamalarini saqlash, ommaviy/maxfiy xona yaratish, qo‘shilish so‘rovlari va egasining tasdig‘i/rad etishi, maxfiy xonaga taklif kodi hamda ikki urinish limiti, serverda rol taqsimlash, matnli umumiy chat, ovoz berish va ovoz teng yoki bo‘sh bo‘lganda chiqarib yubormaslik. Perfect rejimda fuqarolar kamida 3 ta bo‘lishi, barcha 11 rol tanlanganda kamida 13 o‘yinchi bo‘lishi tekshiriladi. O‘yin holati hozir polling orqali yangilanadi; WebSocket transporti yo‘q.

Bu hali to‘liq Mafia platformasi emas. Rol qobiliyatlari, Mafia/Ghost ovoz kanallari, AI o‘yinchilar, o‘yin yakuni/g‘alaba hisoblash, doimiy statistika va tarix, moderatorning to‘liq boshqaruvi, internet uzilgandan keyingi to‘liq tiklash, chat-kanal huquqlari va to‘liq anti-cheat hali amalga oshirilmagan. Ovoz provayderi/TURN/SFU ulanmagan; native Uzbek TTS sifati sinovdan o‘tmagan. Soxta vaqt hisoblagichi ko‘rsatilmaydi; bosqich davomiyligi sozlanmagan. Tafsilotlar: [`TODO.md`](TODO.md) va [`docs/open-questions.md`](docs/open-questions.md).

Oddiy veb-sahifa ilovalar o‘rtasida almashishni, OS bildirishnomalarini yoki Android kiosk/iOS Guided Access rejimini majburan boshqara olmaydi. Tashqi AI yoki ovoz API kaliti hozirgi amalga oshirilgan oqimlar uchun talab qilinmaydi; bu integratsiyalar yoqilmagan.
