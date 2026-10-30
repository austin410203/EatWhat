# Prompts for ChatGPT image generation (raw/NN.png). Run: python prompts.py > prompts.json
import json

ICON = ("Please generate the image directly, no text reply. Landscape 3:2 image: a 4 columns x 3 rows grid of 12 separate app icons "
        "on a pure flat white background. Each icon is one cute glossy 3D clay-render object, soft studio lighting, warm saturated colors, "
        "slight 3/4 top view, no cast shadow on the background, no text, no labels, no frames, generous empty white space around every icon, "
        "all icons the same size and centered in their cells. Icons in order, left to right, top to bottom: ")
PHOTO = ("Please generate the image directly, no text reply. Landscape 3:2 image made of four separate realistic photographs in a 2x2 grid, "
         "separated by thin pure white gutters. Editorial restaurant food photography for a restaurant app, natural window light, "
         "shallow depth of field, appetizing, rich but natural colors, no text, no logos, no menus with writing, no people's faces. "
         "Top-left: {0}. Top-right: {1}. Bottom-left: {2}. Bottom-right: {3}.")

icons = [
  ["braised pork rice bowl with chopsticks", "bento box with fried pork chop, rice and vegetables", "bowl of beef noodle soup",
   "three pan-fried dumplings", "ramen bowl with soft egg, chashu and fish cake", "Japanese rice bowl topped with tempura shrimp",
   "two pieces of nigiri sushi, salmon and tuna", "bubbling hot pot with red and white broth", "marbled beef slices on a small round grill",
   "stone bowl bibimbap with fried egg", "bowl of tom yum soup with shrimp and lime", "banh mi sandwich"],
  ["curry bowl with naan bread", "plate of spaghetti with tomato sauce and basil", "cheeseburger", "stack of pancakes with butter, syrup and berries",
   "latte cup with heart latte art", "colorful salad bowl", "slice of strawberry shortcake", "cocktail glass with an orange slice",
   "wok-fried shrimp with chili and garlic", "rice ball onigiri with nori", "bowl of white rice with chopsticks resting on top", "fortune cookie"],
  ["two red dice", "map pin with a fork and spoon on it", "ballot box with a heart card going in", "fan of three tilted playing cards",
   "golden trophy cup", "green shield with a white check mark", "glossy red heart", "small orange alarm clock",
   "stack of gold coins", "white sneaker", "party popper with confetti", "small retro slot machine"],
]
photos = [
  ("Taiwanese braised pork rice and side dishes on a small eatery table", "steaming pots on a busy Taiwanese street-food counter",
   "fried pork chop bento in a paper box with rice and greens", "several bento boxes on a wooden table seen from above"),
  ("Taiwanese beef noodle soup with thick noodles and braised beef", "beef noodle shop table with chili oil, pickled greens and the bowl",
   "pan-fried dumplings with crispy skirt in a pan", "plate of boiled dumplings with dipping sauce and chopsticks"),
  ("tonkotsu ramen with soft-boiled egg and chashu", "cozy wooden ramen counter with a steaming bowl",
   "salmon donburi rice bowl with roe", "katsudon rice bowl with miso soup on a tray"),
  ("omakase sushi platter on a wooden board", "sushi bar counter with nigiri on a plate, warm lighting",
   "Taiwanese hot pot with split broth and sliced meat and vegetables", "hot pot restaurant table with many small plates of ingredients"),
  ("Japanese yakiniku beef grilling over charcoal", "yakiniku table with raw marbled beef plates and grill",
   "Korean bibimbap in a hot stone bowl with banchan", "Korean fried chicken and kimchi with side dishes"),
  ("Thai green curry with jasmine rice", "pad thai with shrimp, lime and peanuts",
   "Vietnamese pho with herbs and lime", "banh mi sandwiches and Vietnamese iced coffee"),
  ("Indian butter chicken curry with naan", "thali platter with several curries and rice",
   "spaghetti pomodoro with basil in a trattoria", "wood-fired margherita pizza on a table"),
  ("juicy double cheeseburger with fries", "American diner table with burger, fries and milkshake",
   "brunch plate with eggs benedict and avocado toast", "pancake stack with berries and coffee by a window"),
  ("latte with latte art and a croissant on a cafe table", "bright minimalist cafe interior with plants, no people",
   "colorful vegan grain bowl", "vegetarian restaurant table with salads and tofu dishes"),
  ("strawberry shortcake slice and tea", "dessert display case with cakes and tarts",
   "two cocktails on a dark bar counter with warm bokeh", "moody bar interior with bottles on shelves, no people"),
  ("Taiwanese stir-fry restaurant table with shrimp, clams and greens and beer", "flaming wok stir-fry in a restaurant kitchen, hands only",
   "friends' hands toasting glasses over a table full of shared dishes, no faces", "overhead view of a table with many different dishes"),
]
out = [{"id": f"{i+1:02d}", "kind": "icons", "prompt": ICON + "; ".join(f"{j+1}. {x}" for j, x in enumerate(s)) + "."} for i, s in enumerate(icons)]
out += [{"id": f"{i+4:02d}", "kind": "photos", "prompt": PHOTO.format(*p)} for i, p in enumerate(photos)]
print(json.dumps(out, ensure_ascii=False, indent=1))
