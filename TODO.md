# TODO — Mafia Game Platform

## Joriy holat (2026-11-25)

- **Qisman bajarilgan:** Manus OAuth, profil sozlamalari, xona yaratish va topish, egasi tomonidan qo‘shilish so‘rovlarini ko‘rish, rolni serverda taqsimlash, maxfiy rolni tirik boshqa o‘yinchilardan yashirish, matnli chat, ovoz berish va tie/no-vote natijalari.
- **Hali to‘liq emas:** xona a’zolari ro‘yxati va boshqaruvi, qobiliyatlar bilan kecha bosqichi, o‘yin natijalari/g‘alaba, moderator, AI, ovoz kanallari, doimiy statistika/tarix, reconnect va qayta ulanib tiklanish, to‘liq chat-kanal/ruxsat tekshiruvlari, anti-cheat.
- **Interfeys va hujjatlar:** responsive dastlabki ekranlar bor; polling real vaqt WebSocket emas. Taymer sozlanmagan deb ko‘rsatiladi. Ovoz/TTS integratsiyalari ulangan deb da’vo qilinmaydi.
- **Qoidalar:** [`docs/open-questions.md`](docs/open-questions.md) dagi savollar ochiq qoladi.

## Accounts, profiles, privacy, statistics, and history
- Users can register/sign in, choose a username, upload a profile image, and edit their profiles.
- Persist overall statistics, wins, losses, games played, roles played, events per game, votes, game duration, and final results.
- Users can independently control who sees their statistics and game history in profile settings. Private game data is visible only to authorized users.

## Dashboard and rooms
- The dashboard lists public rooms with room name, player count, and one of these statuses: Waiting, In progress, Finished. Provide access to statistics, profile, and settings.
- Users can create public or private rooms and submit a join request through an invitation link. Room owners can manage players.
- Public rooms are visible to all users and discoverable from the dashboard. Joining requires a request that the owner accepts or rejects.
- Private rooms do not appear on the dashboard and can be opened only through a special invitation link. Visitors sign in/register, enter a username, and request to join; the owner accepts or rejects the request.
- A user can submit at most two requests to the same private room. Accepted and rejected requests count toward the limit. Duplicate or parallel requests cannot bypass it.

## Game modes and roles
- Provide Simple and Perfect modes. The room owner chooses which roles participate and how many of each. Roles are assigned randomly; in Simple mode, remaining seats are filled with Civilians.
- Require at least 4 real players to start. If too few, show exactly: “O‘yinda hali jamoa a’zolari yetarli emas. Kamida 4 ta a’zo bo‘lishi kerak.” In an online room, ask exactly “O‘yinchilar soni kam, AI o‘yinchilar qo‘shasizmi?” and offer “Ha, qolgan a’zolarni AI qilish” and “Yo‘q, guruhga hali odam qo‘shiladi”.
- Simple mode includes Mafia, Doctor, Commissioner, and Civilian. The first Perfect-mode release includes all 11 roles: Mafia, Don, Doctor, Commissioner, Civilian, Maniac, Jester (Masxaraboz), Lawyer, Bodyguard, Silencer, and Witch (Jodugar). Every selected special role has at least one player; Civilian has at least three. Selecting all 11 roles requires at least 13 players.
- Mafia selects a target at night and has a private audio channel accessible only to living Mafia members. Don confirms the final decision. Commissioner sees Don as regular Mafia. If Don is eliminated, living Mafia members vote for a new Don; the Mafia member with the most votes becomes Don.
- Doctor chooses one player to heal each night, may heal themself only 3 times total, may heal other players without limit, and chooses only one person per night.
- Commissioner investigates one player each night and learns their team. Mafia and Don appear as Mafia. A Mafia member protected by Lawyer may appear as Civilian to Commissioner; this does not change the member’s real team.
- Lawyer protects one Mafia member at night so Commissioner sees that target as Civilian. Whether Lawyer can protect themself is unresolved.
- Silencer can target a member of any team. That player cannot speak during the next daytime discussion: microphone is blocked in voice mode and sending messages is blocked in text mode. Voting rights remain.
- Bodyguard protects one player each night. If Mafia attacks that player, Bodyguard takes the attack and both survive. Bodyguard protects only one player per night.
- Maniac is an independent team, attempts to kill one player each night, and has the personal goal of being the last survivor. Achieving that personal goal does not automatically end the game.
- Jester (Masxaraboz) seeks elimination by daytime voting. If eliminated by that vote, the personal goal is achieved; if killed at night, it is not achieved. Achieving the goal does not automatically end the game.
- At game start, Witch secretly chooses Mafia, Civilians, or Independent; other players do not learn the choice. Poison causes the selected target to die the next morning. Sleep prevents the target from speaking the next day and limits them to one vote. There is no life potion. Changing Witch’s team does not remove access to the potions. Potion-use count and self-targeting are unresolved and must not be invented.

## Moderator, communications, voting, and phases
- Moderator is separate from game teams and can set phase durations, start/end phases, pause/resume the game, cancel a phase if necessary, manage voting, and resolve technical/organizational problems.
- If moderator exits the app or switches to another app during a game, moderator status is lost. A regular website cannot fully block app switching or OS notifications; do not claim otherwise. Pause remains in effect. Don takes over and can appoint a new moderator. How the initial moderator is selected remains unresolved.
- Support “Voice + text chat” and “Text only chat”. Living Mafia can use a private audio channel. The Ghosts channel is for eliminated real players only. Living players cannot hear Ghosts; Ghosts cannot hear living players. Ghosts cannot vote or use role abilities. An eliminated AI immediately becomes silent and never joins Ghosts.
- At the top of chat, show players horizontally with round profile pictures, usernames, and vote counts. Show no number for zero votes. Selecting a player offers “Aybdor deb tanlash”; selecting them again offers “Ayblovni olib tashlash”. Votes update in real time.
- If two or more players tie for the highest vote count, nobody is eliminated and the next phase begins. A player who did not vote has no vote counted; nobody can vote on their behalf.
- Eliminated players cannot vote or use role abilities. Their role is revealed to everyone and their profile shows the eliminated state.
- Phase order is Night, Dawn, Day discussion, Voting, Results. Roles act at night; Dawn announces overnight events and the roles of players killed overnight; living players discuss during the day; voting selects suspects; the highest-vote player is eliminated in Results, and ties eliminate nobody. Moderator sets each phase duration.

## Victory and results
- The game ends only when one team wins. Personal goals for independent roles do not automatically end the game. Witch wins with the team Witch selected if that team wins.
- Do not invent team victory conditions for Maniac or other independent roles when unspecified; expose them as configuration/open questions.
- Results show the winning team, every player’s name/profile image/role, won-or-lost state, and game duration. Provide “Qayta o‘ynash” and “Xonaga qaytish”.

## AI players
- If an online room lacks people, the room owner can choose to add AI. A room holds at most 3 AI players. The owner sets AI count, each AI’s Easy/Medium/Hard difficulty, character, and voice.
- Easy reasons simply, sometimes guesses incorrectly, asks simple questions, and lacks strong strategy. Medium analyzes actions and suspicious behavior, asks logical questions, and votes according to the situation. Hard remembers previous discussions, adapts strategy to its role, may bluff or defend itself, and analyzes voting history.
- AI has a distinct avatar and AI marker, may start conversations and reply, and does not interrupt others. It uses its own analysis and permitted statements when voting. It remembers game history but uses only information its role is allowed to know; it never knows other roles’ secrets. Once eliminated, it becomes fully silent and no longer affects play.
- If an AI fails, first attempt recovery. If recovery fails, create a new AI that continues the previous AI’s role and necessary game state.
- AI speech must be natural, clean Uzbek with correct pronunciation/grammar, no Russian/English accent, distinct voice timbres, consistent natural speed, and spoken/text language matching the room. Do not claim native Uzbek TTS is ready without a real quality test; keep a replaceable TTS-provider abstraction.
- Restrict each AI to permitted game data and protect secrets on the server.

## Connectivity, security, and design
- If a player loses internet, the game continues for others; on reconnect, restore that player’s role and game state. A player who permanently leaves is automatically considered to have lost.
- Implement server-side validation, authentication/authorization, rate limiting, secure sessions, private-room access control, anti-cheat, secret-role protection, and AI data-access restrictions. The server owns game state; browsers never receive unauthorized secret data.
- Responsive layouts work on desktop, tablet, and phone; include accessibility, loading/error/empty/success states, polished hover/animation, readable fonts, good color harmony, and clear navigation. The game view has a distinct atmosphere from the dashboard and clearly shows phase, time remaining, living players, chat, voice channel, voting, and role abilities. Reveal roles only to authorized users.
- Keep the backend/API reusable by future Android and iOS apps. Android kiosk/lock-task and iOS Guided Access require separate future study; the website cannot enforce operating-system lock behavior.
- Keep these unresolved rules explicitly listed rather than deciding them: how Don confirms the Mafia team’s final decision; Witch potion-use count and self-targeting; whether Lawyer can protect themself; whether a player can change a vote; whether self-voting is allowed; how team victory is counted if Maniac is last alive; and how the initial moderator is assigned.

## Setup, deployment, verification, and disclosure
- Deliver installation/run instructions, deployment instructions, actual verification results, and an unresolved-questions list.
- Disclose any external API key or service requirement. Never present an unconnected or unimplemented feature as operational.
