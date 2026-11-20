# 東京用的圖（2026-11-20，ChatGPT）：日式料理示意照（東京店家用）＋ 24 區封面 ＋ 東京主視覺。
# python prompts_tokyo.py > prompts_tokyo.json；每張是 2x2 照片，切圖用 slice_tokyo.py
import json

PHOTO = ("Please generate the image directly, no text reply. Landscape 3:2 image made of four separate realistic photographs in a 2x2 grid, "
         "separated by thin pure white gutters. Editorial restaurant food photography for a restaurant app, natural light, "
         "shallow depth of field, appetizing, rich but natural colors, no text, no logos, no menus with writing, no people's faces. "
         "Top-left: {0}. Top-right: {1}. Bottom-left: {2}. Bottom-right: {3}.")
PLACE = ("Please generate the image directly, no text reply. Landscape 3:2 image made of four separate realistic travel photographs in a 2x2 grid, "
         "separated by thin pure white gutters. Atmospheric Tokyo neighborhood street photography for a restaurant guide app, golden hour or "
         "evening light, rich but natural colors, no readable text anywhere (all signs blurred or out of focus), no logos, no recognizable faces. "
         "Top-left: {0}. Top-right: {1}. Bottom-left: {2}. Bottom-right: {3}.")

food = [
  ('T1', ['jp-sushi-1', 'jp-sushi-2', 'jp-ramen-1', 'jp-ramen-2'],
   ("Edomae nigiri sushi on a pale hinoki wood counter, tuna, sea bream and gizzard shad", "a sushi chef's hands placing nigiri on a dark ceramic plate at a quiet counter",
    "Tokyo shoyu ramen in a white bowl, clear amber broth, chashu, menma and nori", "tsukemen dipping noodles with thick rich broth and a soft egg on a wooden counter")),
  ('T2', ['jp-bbq-1', 'jp-bbq-2', 'jp-japanese-1', 'jp-japanese-2'],
   ("thin slices of marbled A5 wagyu beef grilling over a charcoal yakiniku grill", "elegant yakiniku table with a plate of assorted wagyu cuts and dipping sauces",
    "Japanese kaiseki hassun seasonal appetizer platter on lacquerware", "crisp tempura shrimp and vegetables on paper at a tempura counter")),
  ('T3', ['jp-izakaya-1', 'jp-izakaya-2', 'jp-cafe-1', 'jp-cafe-2'],
   ("yakitori chicken skewers on a charcoal grill with glowing embers", "cozy Tokyo izakaya table with small plates, sake and a highball, warm lantern light",
    "retro Japanese kissaten table with siphon coffee and a thick hotcake with butter", "minimalist Tokyo specialty coffee bar with pour-over coffee, no people")),
  ('T4', ['jp-dessert-1', 'jp-dessert-2', 'jp-bar-1', 'jp-bar-2'],
   ("Japanese wagashi sweets and a bowl of matcha on a wooden tray", "Tokyo patisserie strawberry shortcake and a fruit parfait on a marble table",
    "classic Ginza cocktail bar counter with a stirred martini in crystal glass, dim warm light", "Japanese whisky highball on a dark wooden bar with backlit bottles, no people")),
  ('T5', ['jp-bakery-1', 'jp-bakery-2', 'jp-finedining-1', 'jp-finedining-2'],
   ("Japanese bakery tray with melon pan, curry bread and croissants", "a loaf of fluffy Japanese milk bread shokupan sliced on a board",
    "refined French tasting course plate with seasonal Japanese ingredients, fine dining", "elegant tasting menu table setting with wine glasses in a modern Tokyo restaurant")),
]
areas = [
  ('A1', ['A1301', 'A1302', 'A1303', 'A1304'],
   ("Ginza main street at dusk with elegant department store facades", "Tokyo Station red brick building and Nihonbashi area at blue hour",
    "Shibuya scramble crossing seen from above at night", "Shinjuku neon alleys of Omoide Yokocho with lanterns at night")),
  ('A2', ['A1305', 'A1306', 'A1307', 'A1308'],
   ("Ikebukuro and Takadanobaba busy station street in the evening", "tree-lined Omotesando avenue with modern architecture",
    "Roppongi street at night with Tokyo Tower glowing in the background", "Akasaka quiet backstreet with small restaurants and red lanterns")),
  ('A3', ['A1309', 'A1310', 'A1311', 'A1312'],
   ("Kagurazaka stone-paved alley with traditional restaurants", "Kanda and Akihabara streets with old shops and bright signs, evening",
    "Asakusa Senso-ji temple lantern and Nakamise shopping street", "Ryogoku near the sumo hall along the Sumida river with Tokyo Skytree")),
  ('A4', ['A1313', 'A1314', 'A1315', 'A1316'],
   ("Tsukiji outer market stalls with seafood and morning light", "Shinagawa and Hamamatsucho with the waterfront and office towers at dusk",
    "Kamata old shopping arcade with small eateries in the evening", "Meguro river lined with cherry trees and cafes")),
  ('A5', ['A1317', 'A1318', 'A1319', 'A1320'],
   ("Jiyugaoka and Nakameguro stylish streets with boutique cafes", "Shimokitazawa narrow streets with vintage shops and small bars",
    "Koenji and Nakano retro shopping arcade at night", "Kichijoji Inokashira park pond with rowing boats and trees")),
  ('A6', ['A1321', 'A1322', 'A1323', 'A1324'],
   ("quiet residential Nerima station street with small shops at dusk", "Itabashi local shopping street with a small family restaurant",
    "Sugamo Jizo-dori old shopping street with traditional shops", "Kitasenju old lanes with izakaya lanterns at night")),
  ('A7', ['tokyo-hero', 'tokyo-food', 'tokyo-night', 'tokyo-market'],
   ("Tokyo skyline at sunset with Tokyo Tower and Mount Fuji in the distance", "overhead view of a table full of Japanese dishes: sushi, ramen, tempura, yakitori",
    "warm glowing Tokyo yokocho alley full of tiny restaurants at night", "Tsukiji market counter with fresh tuna sashimi bowls")),
]
out = [{"id": k, "names": n, "prompt": PHOTO.format(*p)} for k, n, p in food]
out += [{"id": k, "names": n, "prompt": PLACE.format(*p)} for k, n, p in areas]
print(json.dumps(out, ensure_ascii=False, indent=1))
