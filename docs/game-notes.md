# Farm game — reference notes (from screenshots)

Working notes collected from screenshots of the original game. Not final design.

## Seed shop catalog

"Income" is the sell value **per item**; a harvest pays `income × yield`.
Variants = "Số lượng màu sắc khác nhau" (number of colour variants).

Badges: 🪖 = purple helmet badge (the "Bé …" character plants), EXP = bonus-XP crop,
🟠 = orange leaf badge (meaning unknown).

### Green tier
| Seed (VI) | English | Price | Variants | XP | Yield | Income/item | Grow time | Badge |
|---|---|---|---|---|---|---|---|---|
| Củ cải trắng | White radish | 0 | 3 | 0 | 2 | 1 | 6s | |
| Lúa mì | Wheat | 83 | 3 | 0 | 3 | 33 | 20s | |
| Gói ngẫu nhiên thường | Common random pack | 130 | 10 mutations | rand | rand | per crop | per crop | |
| Cà chua | Tomato | 224 | 3 | 0 | 3 | 90 | 1m | |
| Cà rốt | Carrot | 251 | 3 | 0 | 3 | 101 | 41s | |
| Nấm | Mushroom | 298 | 3 | 0 | 3 | 119 | 3m | |

### Blue tier
| Seed (VI) | English | Price | Variants | XP | Yield | Income/item | Grow time | Badge |
|---|---|---|---|---|---|---|---|---|
| Hoa hướng dương | Sunflower | 137 | 3 | 70 | 4 | 121 | 41m | EXP |
| Dưa leo | Cucumber | 199 | 3 | 25 | 3 | 155 | 6m | |
| Tỏi | Garlic | 225 | 3 | 30 | 4 | 198 | 30m | |
| Gói ngẫu nhiên hiếm | Rare random pack | 225 | 18 mutations | rand | rand | per crop | per crop | |
| Chuối | Banana | 247 | 3 | 40 | 5 | 243 | 1h22m | |
| Ớt chuông | Bell pepper | 266 | 3 | 35 | 4 | 234 | 41m | |
| Cà tím | Eggplant | 285 | 3 | 45 | 5 | 279 | 2h3m | |
| Bé Cáo Hoa Quỳnh | Fox-Bloom Baby | 302 | 5 | 25 | 4 | 161 | 13m | 🪖 |
| Khoai tây | Potato | 357 | 3 | 25 | 4 | 209 | 10m | 🟠 |

### Purple tier
| Seed (VI) | English | Price | Variants | XP | Yield | Income/item | Grow time | Badge |
|---|---|---|---|---|---|---|---|---|
| Nho | Grape | 199 | 3 | 180 | 5 | 306 | 6h52m | EXP |
| Bé Gừng Nóng Lạnh | Hot-Cold Ginger Baby | 255 | 5 | 61 | 5 | 229 | 1h1m | 🪖 |
| Bí ngô | Pumpkin | 285 | 3 | 61 | 5 | 360 | 3h26m | |
| Bé Sen Ve | Lotus Baby | 314 | 5 | 73 | 5 | 442 | 6h52m | 🪖 |
| Xà lách | Lettuce | 317 | 3 | 73 | 6 | 409 | 8h15m | |
| Bé Củ Cải Tím | Purple Radish Baby | 328 | 5 | 67 | 5 | 378 | 4h7m | 🪖 |
| Hành tây | Onion | 344 | 3 | 79 | 6 | 483 | 11h | |
| Bông Đèn Lồng | Lantern Flower | 367 | 5 | 79 | 6 | 430 | 8h15m | 🪖 |
| Gói ngẫu nhiên cực hiếm | Super-rare random pack | 375 | 31 mutations | rand | rand | per crop | per crop | |
| Ngô | Corn | 385 | 8 | 65 | 5 | 406 | 2h45m | 🟠 |
| Măng Cụt Hai Súng | Twin-Gun Mangosteen | 393 | 5 | 90 | 6 | 504 | 11h | 🪖 |

### Red tier
| Seed (VI) | English | Price | Variants | XP | Yield | Income/item | Grow time | Badge |
|---|---|---|---|---|---|---|---|---|
| Dâu tây | Strawberry | 369 | 8 | 350 | 6 | 504 | 16h30m | EXP |
| Hoa Long Đởm Bóng Đêm | Night-Shade Gentian | 408 | 5 | 200 | 6 | 609 | 13h45m | 🪖 |
| ? (fox-flower creature) | ? | 459 | ? | ? | ? | ? | ? | 🪖 |
| ? (green cabbage creature) | ? | 502 | ? | ? | ? | ? | ? | 🪖 |

### Level-locked ("Mở khóa")
| Unlock level | Item | Badge |
|---|---|---|
| 27 | bird-like creature seed | 🪖 |
| 28 | random pack | |
| 29 | creature seed | 🪖 |
| 30 | pear | 🟠 |

## Mechanics observed
- Farm = 4×4 isometric grid (16 plots). Player has farm level + XP bar.
- Plant icons: watering can = needs water; hand = ready to steal/harvest.
- Friend strip: "Tưới nước" (water) / "Có thể trộm" (can steal). Tabs: friend list / suggested friends.
- Daily limits: take crops from friends 20/day, from strangers 3/day.
- Mutations: grown plants can mutate into rare glowing forms (gold, pink/purple, silver/crystal auras).
- 3–4 visual stages per plant while growing.
- Encyclopedia ("Bách khoa"): 110/125 plant types collected. Storage/warehouse: 484/550.
- Shop UI: currency (leaf coin), quantity slider, side buttons: Shop, Weekend deal, storage chest, encyclopedia.
