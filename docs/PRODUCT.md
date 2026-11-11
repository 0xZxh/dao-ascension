# 仙途寻道·问鼎天榜（DaoAscension）

网页仙侠养成。打开即可玩，不必安装。

在线地址：https://dao-ascension-eta.vercel.app

赛道：`games` · `nfts` · `agents` · `defi`  
黑客松：NEAR HACKATHON 2026（开发截止 2026-11-14T23:59:00Z）

---

## 1. 产品

要解决的问题：

1. 浇水、锻造、战斗每次都弹钱包签名，玩法被打断。
2. 角色 NFT 往往只是一张图，和气血、背包、灵田分开存放。
3. 排行榜只看战力，种田和锻造的玩家没有名次。

本产品的做法：

- 一个道身 NFT（NEP-171）绑定一个子账户。境界、气血、攻击、飞剑、背包和九宫灵田跟这个账户走。
- 播种、灌溉、炼丹、锻造、闯塔在会话里完成，不逐次弹钱包。签名范围限定在游戏动作（Function Call Key，NEP-413）。
- 气血来自灵圃，攻击来自剑庐，材料来自秘境。三条线各自上榜，另有论剑积分榜。
- 买种、锻造和秘境门票花掉的灵石进入宗门国库。结算时国库按 **50% / 20% / 30%** 拆分：50% 发给四榜，20% 留给运营，30% 留到下一周。四榜占这 50% 的份额是诛魔 30%、论剑 30%、百草 20%、神工 20%。奖励可经 NEAR Intents 换成其他链上的稳定币。兑换比例：1 NEAR = 50 灵石。

---

## 2. 现在能玩的循环

1. 创建道身，选择一种法相。
2. 灵圃：播种、灵泉、采摘炼丹。气血上限上升，并得到战斗用的回血丹。
3. 剑庐：用玄铁和陨铁锻造飞剑。攻击上升。
4. 秘境：五层镇魔塔。血量低时自动服药。胜了掉落矿石和种子。
5. 论剑：和道友交手，积分进入问鼎论剑榜。
6. 天榜与国库：查看四榜名次和上述分账。奖励以传谕发到信箱，领取后入账。

顶栏可以在中文和英文之间切换。

---

## 3. 怎么试

打开 https://dao-ascension-eta.vercel.app

| 做 | 看到 |
| :--- | :--- |
| 创建道身并确认 | 进入洞府，顶栏出现气血、攻击和灵石 |
| 在空灵畦播种，再灵泉，再采摘炼丹 | 气血上限数字变大 |
| 打开剑庐，锻造并佩戴飞剑 | 攻击数字变大 |
| 进入秘境，挑战第 1 层 | 出现胜负战报；胜利时背包增加矿石或种子 |
| 打开宗门国库 | 四榜并列，以及 50% / 20% / 30% 的分配 |
| 顶栏切换 EN | 同一界面变为英文 |

---

## 4. 路线图

| 阶段 | 时间 | 玩家得到什么 |
| :--- | :--- | :--- |
| Demo（当前） | 2026-11-01 ~ 2026-11-14 | 上面的单人循环已可在网页完整体验 |
| Alpha | 2026-11-17 ~ 2026-12-26 | 进度按 NEAR 账户保存；种植、锻造、战斗结算上链；周榜改为真实玩家 |
| Beta | 2027-01 ~ 2027-02 | 主网；周榜奖励经 NEAR Intents 实际跨链发放；道身可以转让；赛季 |
| 正式版 | Beta 之后 | 在 Cocos 与 Unity 中选定一个游戏框架，把这条循环做成可安装的正式游戏 |

---

## 5. What it is

DaoAscension is a browser xianxia cultivation game. Open the site and play. No install.

Live: https://dao-ascension-eta.vercel.app

Tracks: `games`, `nfts`, `agents`, `defi`.  
Event: NEAR HACKATHON 2026. Development ends 2026-11-14T23:59:00Z.

Problems:

1. Watering, forging, and fighting each ask for a wallet signature, which breaks the loop.
2. A character NFT is often only an image, stored apart from HP, inventory, and plots.
3. Leaderboards rank combat power only, so farmers and crafters have no rank.

What the product does:

- One cultivator NFT (NEP-171) is bound to one sub-account. Realm, HP, ATK, sword, bag, and the 3×3 herb garden stay with that account.
- Planting, watering, pill refining, forging, and tower runs happen inside the session without a wallet popup each time. The signature is limited to game actions (Function Call Key, NEP-413).
- HP comes from the herb garden, ATK from the forge, and materials from the tower. Each line has its own board, plus a duel board.
- Spirit stones spent on seeds, forging, and tower tickets go into the sect treasury. A settlement splits the treasury **50% / 20% / 30%**: 50% to the four boards, 20% to operations, 30% kept for the next week. Of that 50%: Demon Slayer 30%, Duel 30%, Herb 20%, Forge 20%. Rewards can be quoted into stablecoins on other chains through NEAR Intents. Rate: 1 NEAR = 50 spirit stones.

---

## 6. What you can play now

1. Create a cultivator and pick a form.
2. Herb garden: plant, water with the spirit spring, harvest and refine. Max HP rises, and you receive combat pills.
3. Forge: smelt iron and meteor ore into a flying sword. ATK rises.
4. Tower: five floors. The cultivator takes a pill when HP is low. A win drops ore and seeds.
5. Duel: fight another cultivator. The score feeds the duel board.
6. Boards and treasury: read the four ranks and the split above. Rewards arrive as mail; claiming them adds them to the account.

The header switches between Chinese and English.

---

## 7. How to try it

Open https://dao-ascension-eta.vercel.app

| Do | See |
| :--- | :--- |
| Create a cultivator and confirm | The cave opens. HP, ATK, and spirit stones appear in the header |
| Plant an empty plot, water it, then harvest and refine | The Max HP number increases |
| Open the forge, forge a sword, and equip it | The ATK number increases |
| Enter the tower and challenge floor 1 | A win/loss report. A win adds ore or a seed to the bag |
| Open the sect treasury | Four boards, and the 50% / 20% / 30% split |
| Switch the header to EN | The same screen in English |

---

## 8. Roadmap

| Stage | When | What a player gets |
| :--- | :--- | :--- |
| Demo (now) | 2026-11-01 ~ 2026-11-14 | The single-player loop above, playable in the browser |
| Alpha | 2026-11-17 ~ 2026-12-26 | Progress saved per NEAR account; plant, forge, and combat settlement on-chain; boards filled by real players |
| Beta | 2027-01 ~ 2027-02 | Mainnet; weekly prizes paid out across chains through NEAR Intents; cultivator transfer; seasons |
| Full game | After Beta | Choose either Cocos or Unity, then turn this loop into an installable game |
