# Mafia o‘yin platformasi — ishlab chiqish rejasi

## Maqsad va doira

Brend nomi hali tanlanmagan, o‘zbek tilidagi moslashuvchan veb-platforma: foydalanuvchi profillari, ommaviy va maxfiy xonalar, sozlanadigan rejim va rollar, server boshqaradigan o‘yin bosqichlari va ovozlar, chat, AI o‘yinchilar, o‘yin tarixi hamda maxfiylik sozlamalari. Kelajakdagi mobil ilovalar ham shu backend/API’dan foydalanishi uchun o‘yin qoidalari va ruxsatlar interfeysdan ajratiladi.

Birinchi bosqich faqat maket bilan cheklanmaydi: React ilova, MySQL/Drizzle orqali saqlash, Manus OAuth autentifikatsiyasi, tRPC API va serverdagi o‘yin qoidalari birgalikda ishlab chiqiladi. Matnli o‘yin va asosiy xona jarayonlari ishlaydi. Tashqi ovoz xizmati yoki tekshirilmagan o‘zbekcha ovoz sintezi ishlayapti deb ko‘rsatilmaydi.

## Arxitektura va ma’lumotlar oqimi

- **Veb:** React 19, TypeScript, Vite, Tailwind, Wouter va tRPC client. Interfeys o‘zbek tilida bo‘ladi; ruscha va inglizcha tarjimalarni keyin ulash uchun matnlar ajratiladi.
- **Server/API:** Express va tRPC. Kirish starterdagi haqiqiy Manus OAuth oqimiga tayanadi. `webdev_app_session` nomli cookie, HS256 tekshiruvi hamda Preview uchun `SameSite=None; Secure` sozlamalari saqlanadi. Username profilga tegishli; alohida parol tizimi qo‘shilmaydi.
- **Ma’lumotlar bazasi:** boshqariladigan MySQL va Drizzle migration. Users/profiles/privacy, rooms/invitations/join requests, games/players/role assignments/role actions/phases/votes/chat/events, AI players va statistics uchun jadvallar yaratiladi. Taklif tokenlari xeshlangan holda saqlanadi. Maxfiy xona va maxfiy o‘yin ma’lumotlariga kirishni server tekshiradi.
- **O‘yin qoidalari:** interfeysdan mustaqil domain service va serverdagi state machine. Rollar faqat tegishli o‘yinchiga yoki ruxsatli jamoa kanaliga yuboriladi; o‘yinchi chiqarilgach uning roli qoidaga muvofiq ochiladi. Server a’zolik, bosqich, ovoz va xona egasi ruxsatlarini tekshiradi. Maxfiy xona uchun ayni hisob va xona kesimida ikki so‘rov chegarasi takroriy yoki parallel so‘rovlar bilan chetlab o‘tilmaydi.
- **Real-time:** autentifikatsiyalangan WebSocket/Socket.IO gateway va ruxsatga qarab filtrlangan eventlar; kerakli dependency ishlab chiqish paytida qo‘shiladi. O‘yin holatining yagona manbai server bo‘ladi. Domain service kelajakdagi mobil API uchun qayta ishlatiladigan qilib ajratiladi.
- **AI:** provider-independent adapter; Manus LLM API bo‘lsa, serverdan chaqiriladi. Har bir AI faqat o‘z roli va umumiy hodisalardan bilishi mumkin bo‘lgan kontekstni oladi. Easy/Medium/Hard darajalari, bir xonada ko‘pi bilan uch AI, xarakter/ovoz sozlamalari alohida saqlanadi. LLM ishlashi loyiha credit sarflashi mumkin.
- **Ovoz:** WebRTC signaling va kanalga ruxsat berish serverda nazorat qilinadi; ruxsatsiz foydalanuvchiga Mafia yoki Arvohlar kanalining signali ham, ovoz oqimi ham yuborilmaydi. TURN/SFU xizmati, manzili yoki kaliti berilmagani sababli ovoz adapteri ulangan deb ko‘rsatilmaydi; matnli rejim ishlaydi. Ovoz provayderini almashtirishga tayyor adapter bo‘ladi, lekin o‘zbekcha TTS sifati sinovdan o‘tmaguncha kafolatlanmaydi.

## Asosiy oqim va kelishilmagan qoidalar

Foydalanuvchi dashboard’dan xona ochadi yoki qo‘shilish so‘rovini yuboradi; xona egasi so‘rovni qabul qiladi yoki rad etadi; so‘ng sozlamalar, o‘yinni boshlash, tun, tong, kunduzgi muhokama, ovoz va natija serverdagi state machine orqali yuradi. Ovoz berish, matnli chat, yakuniy natija, o‘yin tarixi va statistika shu oqimga ulanadi. Oddiy rejimda tanlangan maxsus rollar joylashtirilib, qolgan o‘rinlar fuqarolar bilan to‘ldiriladi. Mukammal rejimda tanlangan har bir maxsus roldan kamida bittadan, fuqarodan kamida uchtadan bo‘ladi. O‘yinni boshlash uchun kamida to‘rt haqiqiy o‘yinchi kerak; AI qo‘shish mumkinligi taklif qilinadi va bitta xonadagi AI soni uchtadan oshmaydi. Mukammal rejimdagi 11 rolning barchasi tanlansa, kamida 13 o‘yinchi kerak.

Internet uzilib qayta ulanishda o‘yin holati serverdan tiklanadi. Tasdiqlanmagan qoidalar alohida configuration savollari sifatida qoladi: Don yakuniy nishonni qanday tasdiqlashi; Witch iksirlarini necha marta ishlatishi va o‘zini nishonga ola olishi; Lawyer o‘zini himoya qila olishi; o‘yinchi ovozini o‘zgartirishi yoki o‘ziga ovoz berishi; Maniac g‘alabasining jamoaviy sharti; moderator o‘yin boshlanishidan oldin qanday tayinlanishi. Bu qoidalar taxmin bilan belgilanmaydi. Mustaqil rolning shaxsiy maqsadi o‘yinni yakunlamaydi; jamoaviy g‘alaba sharti aniqlanmagan vaziyatda avtomatik g‘alaba e’lon qilinmaydi.

## Loyiha tuzilmasi

`client/src/pages/` va `client/src/features/auth|rooms|game|profile|history/` sahifalar hamda frontend qismlarini saqlaydi. `client/src/lib/` tRPC client, tarjima va formatlash yordamchilariga ajratiladi. `server/_core/` starter OAuth/session/context kodini saqlaydi. `server/routers/` auth, rooms, game, chat va profile API’larini beradi. `server/services/game/` state machine, rol harakatlari, tekshiruvlar va g‘alaba siyosati uchun javob beradi. `server/realtime/` ulanish, xona a’zoligi va ruxsat bo‘yicha filtrlangan xabarlarni boshqaradi. `server/ai/` LLM adapteri va xavfsiz kontekst filtrini; `server/voice/` WebRTC signaling va almashtiriladigan ovoz adapterini saqlaydi. `drizzle/` schema/migration uchun, `docs/` o‘rnatish, deploy va ochiq savollar uchun ishlatiladi. `public/manus-routes.json` veb-sahifalar ro‘yxatini bildiradi.

## Ishlab chiqish bosqichlari

1. Data model, o‘yin domain va API chegaralarini aniqlab, talablarning to‘liq shartlarini `TODO.md`ga ko‘chirish.
2. Ma’lumotlar bazasi jadvallari va migrationlar, server tekshiruvlari, Manus OAuth hamda profil API’larini yaratish.
3. Dashboard, xona yaratish va qo‘shilish so‘rovlari, taklif havolalari, o‘yin sozlamalarining moslashuvchan interfeysini yaratish.
4. O‘yin bosqichlari, rol harakatlari, real-time matnli chat va ovoz berish, natija hamda tarixni ulash.
5. AI o‘yinchilar adapteri, profil statistikasi va maxfiylik sozlamalarini ulash.
6. Ovoz/TTS adapterlari va ularning haqiqiy sozlanish holatini ko‘rsatish; tashqi kalit kerak bo‘lsa hujjatlashtirish.
7. Turlarni tekshirish, mavjud testlar va build/route/runtime tekshiruvlarini bajarish; o‘rnatish/deploy yo‘riqnomasi hamda yechilmagan savollarni tayyorlash.

## Tashqi bog‘liqliklar

Boshqariladigan server, MySQL va Manus OAuth tayyor. Manus LLM API mavjud bo‘lsa, AI matnini serverdan yaratish mumkin; u loyiha credit sarflashi mumkin. Haqiqiy ovozli media uchun SFU/TURN xizmati va provayder sozlamasi zarur. Tabiiy o‘zbekcha TTS ovozining sifati hali tekshirilmagan. Ulanmagan qismlar provider adapter va holat ko‘rsatkichlari bilan aniq ajratiladi.

## Dizayn

**Uch yo‘nalish va ehtimollari:** neo-noir kuzatuv paneli (0.08); arxiv hujjatlari ruhidagi tahririy uslub (0.06); zamonaviy, iliq klub muhiti (0.04). **Tanlov:** neo-noir tahririy “ish papkasi” uslubi; dramatik, lekin dashboard’da o‘qilishi oson.

**Dizayn yo‘nalishi:** zamonaviy neo-noir va ish hujjatlari estetikasi. **Asosiy tamoyillar:** o‘yin holati doim ravshan; ma’lumotlarning ko‘rish tartibi aniq; matnlar ixcham guruhlangan; animatsiya faqat muhim holat o‘zgarishida. To‘q ko‘mir-yashil fon tungi muhit beradi, iliq oq matn o‘qishni yengillashtiradi, misrang-to‘q sariq esa ovoz, vaqt va jonli holatni ajratadi. Xato va xavf holatlari rangdan tashqari belgi/matn bilan ham ko‘rsatiladi.

Desktop’da chap tomonda ixcham navigatsiya, asosiy maydon tepasida sahifa konteksti, ostida xona ro‘yxati va tafsilotlari bo‘ladi; faqat markaziy banner va bir xil kartalar panjarasiga tayanmaydi. Telefonda navigatsiya quyi panelga o‘tadi va mazmun bir ustun bo‘lib joylashadi. Takrorlanuvchi vizual belgilar: papka raqami uslubidagi kichik yorliq, ovozlar soni tushirilgan dumaloq avatar, bosqich va vaqtni ko‘rsatuvchi qoramtir status chizig‘i.

Har bir amal loading, error, empty va success holatlariga ega. Harakatlar 160–240 ms davom etadigan yengil ko‘rinish almashuvi bilan chegaralanadi; `prefers-reduced-motion` hurmat qilinadi. Matn uchun Inter/sans-serif turidagi fallback, raqam va metama’lumot uchun IBM Plex Mono turidagi monospace ishlatiladi; kichik izoh matni 14px dan kichik bo‘lmaydi.

**Brend mohiyati:** strategik ijtimoiy deduction o‘yinini adolatli real-time qoidalar bilan birlashtirgan stol o‘yinlari platformasi; xarakteri — mulohazali, sirli, adolatli. **Ovoz ohangi:** qisqa, xotirjam va tushunarli. Misollar: “Tun boshlandi. Qaroringizni yashirincha bering.” “Xona oching va maxfiy havolani jamoangizga yuboring.” **Nomi va belgisi:** yakuniy nom tanlanmaydi; vaqtincha “Mafia / O‘yin platformasi” yozuvi va uch bo‘lakli papka burchagi hamda berkitilgan oy tasviridan iborat chiziqli belgi ishlatiladi. Misrang-to‘q sariq hozircha faqat interfeys aksentidir, yakuniy brend qarori emas.
