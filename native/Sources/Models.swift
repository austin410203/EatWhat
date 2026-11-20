import Foundation

// 店家資料：和網頁版共用後台資料庫（Worker KV `places`，GET /api/places）。欄位和 src/data/places.ts 的 SavedRow 相同。

struct Place: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var cuisine: String
    var gcat: String
    var list: String            // want / fav / star（Google 地圖清單）
    var cid: String?
    var lat: Double
    var lng: Double
    var rating: Double
    var reviews: Int
    var price: Int?
    var priceRange: [Int]?      // [最低, 最高]；最高 99999 = 不封頂
    var addr: String
    var phone: String
    var hours: [[[Int]]]?       // index 0 = 週日；每段 [開始分鐘, 結束分鐘]，結束 > 1440 = 跨夜
    var tags: [String]
    var photo: Double?          // 後台上傳的照片版本（時間戳）
    // 2026-11-20 加入東京店家時新增（台北舊資料沒有）
    var city: String = "taipei"
    var area: String?           // 東京 = 食べログ區域代碼 A1301…
    var areaName: String?
    var desc: String?           // 店家介紹
    var nameAlt: String?        // 英文／羅馬拼音店名
    var src: String?            // "tabelog" = rating／reviews 是食べログ分數
    var tlUrl: String?
    var badges: [String] = []
    var priceNote: String?      // 日圓價位原文（priceRange 已換成台幣）
    var hoursNote: String?
    var access: String?
    var gq: String?             // Google 地圖搜尋字串

    var isTabelog: Bool { src == "tabelog" }

    enum CodingKeys: String, CodingKey {
        case id, name, cuisine, gcat, list, cid, lat, lng, rating, reviews, price, priceRange, addr, phone, hours, tags, photo
        case city, area, areaName, desc, nameAlt, src, tlUrl, badges, priceNote, hoursNote, access, gq
    }

    init(id: String, name: String, cuisine: String, gcat: String = "", list: String = "want", cid: String? = nil,
         lat: Double, lng: Double, rating: Double = 0, reviews: Int = 0, price: Int? = nil, priceRange: [Int]? = nil,
         addr: String = "", phone: String = "", hours: [[[Int]]]? = nil, tags: [String] = [], photo: Double? = nil) {
        self.id = id; self.name = name; self.cuisine = cuisine; self.gcat = gcat; self.list = list; self.cid = cid
        self.lat = lat; self.lng = lng; self.rating = rating; self.reviews = reviews; self.price = price
        self.priceRange = priceRange; self.addr = addr; self.phone = phone; self.hours = hours; self.tags = tags; self.photo = photo
    }

    init(from d: Decoder) throws {
        let c = try d.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? ""
        cuisine = try c.decodeIfPresent(String.self, forKey: .cuisine) ?? "taiwanese"
        gcat = try c.decodeIfPresent(String.self, forKey: .gcat) ?? ""
        list = try c.decodeIfPresent(String.self, forKey: .list) ?? "want"
        cid = try c.decodeIfPresent(String.self, forKey: .cid)
        lat = try c.decodeIfPresent(Double.self, forKey: .lat) ?? 0
        lng = try c.decodeIfPresent(Double.self, forKey: .lng) ?? 0
        rating = try c.decodeIfPresent(Double.self, forKey: .rating) ?? 0
        reviews = try c.decodeIfPresent(Int.self, forKey: .reviews) ?? 0
        price = try c.decodeIfPresent(Int.self, forKey: .price)
        priceRange = try c.decodeIfPresent([Int].self, forKey: .priceRange)
        addr = try c.decodeIfPresent(String.self, forKey: .addr) ?? ""
        phone = try c.decodeIfPresent(String.self, forKey: .phone) ?? ""
        hours = try c.decodeIfPresent([[[Int]]].self, forKey: .hours)
        tags = try c.decodeIfPresent([String].self, forKey: .tags) ?? []
        photo = try c.decodeIfPresent(Double.self, forKey: .photo)
        city = try c.decodeIfPresent(String.self, forKey: .city) ?? "taipei"
        area = try c.decodeIfPresent(String.self, forKey: .area)
        areaName = try c.decodeIfPresent(String.self, forKey: .areaName)
        desc = try c.decodeIfPresent(String.self, forKey: .desc)
        nameAlt = try c.decodeIfPresent(String.self, forKey: .nameAlt)
        src = try c.decodeIfPresent(String.self, forKey: .src)
        tlUrl = try c.decodeIfPresent(String.self, forKey: .tlUrl)
        badges = try c.decodeIfPresent([String].self, forKey: .badges) ?? []
        priceNote = try c.decodeIfPresent(String.self, forKey: .priceNote)
        hoursNote = try c.decodeIfPresent(String.self, forKey: .hoursNote)
        access = try c.decodeIfPresent(String.self, forKey: .access)
        gq = try c.decodeIfPresent(String.self, forKey: .gq)
    }

    var cuisineInfo: Cuisine { Cuisine.byKey[cuisine] ?? Cuisine.all[0] }
}

struct PlacesData: Codable {
    var ver: Double
    var list: [Place]
}

struct Cuisine: Identifiable, Hashable {
    let key: String
    let name: String
    let price: (Int, Int)
    let dishes: [String]
    var id: String { key }

    static func == (a: Cuisine, b: Cuisine) -> Bool { a.key == b.key }
    func hash(into h: inout Hasher) { h.combine(key) }

    static let all: [Cuisine] = [
        .init(key: "taiwanese", name: "台式小吃", price: (80, 200), dishes: ["滷肉飯", "蚵仔煎", "貢丸湯"]),
        .init(key: "bento", name: "便當", price: (90, 160), dishes: ["排骨便當", "雞腿便當", "鯖魚便當"]),
        .init(key: "beefnoodle", name: "牛肉麵", price: (150, 320), dishes: ["紅燒牛肉麵", "清燉牛肉麵", "滷味拼盤"]),
        .init(key: "dumpling", name: "水餃鍋貼", price: (70, 160), dishes: ["高麗菜水餃", "韭菜鍋貼", "酸辣湯"]),
        .init(key: "ramen", name: "拉麵", price: (220, 380), dishes: ["豚骨拉麵", "雞白湯拉麵", "溏心蛋"]),
        .init(key: "donburi", name: "日式丼飯", price: (160, 300), dishes: ["親子丼", "炙燒鮭魚丼", "豬排丼"]),
        .init(key: "sushi", name: "壽司", price: (300, 1200), dishes: ["握壽司拼盤", "海膽軍艦", "味噌湯"]),
        .init(key: "hotpot", name: "火鍋", price: (350, 900), dishes: ["麻辣鴨血", "手切牛五花", "豆腐拼盤"]),
        .init(key: "bbq", name: "燒肉", price: (500, 1400), dishes: ["和牛拼盤", "厚切牛舌", "石鍋拌飯"]),
        .init(key: "korean", name: "韓式料理", price: (200, 450), dishes: ["韓式炸雞", "部隊鍋", "海鮮煎餅"]),
        .init(key: "thai", name: "泰式料理", price: (200, 450), dishes: ["打拋豬", "綠咖哩", "月亮蝦餅"]),
        .init(key: "vietnamese", name: "越南料理", price: (130, 260), dishes: ["生牛肉河粉", "法國麵包", "春捲"]),
        .init(key: "indian", name: "印度料理", price: (250, 500), dishes: ["奶油雞", "蒜味烤餅", "印度奶茶"]),
        .init(key: "italian", name: "義式料理", price: (300, 800), dishes: ["瑪格麗特披薩", "青醬燉飯", "提拉米蘇"]),
        .init(key: "burger", name: "美式漢堡", price: (220, 450), dishes: ["招牌牛肉堡", "松露薯條", "奶昔"]),
        .init(key: "brunch", name: "早午餐", price: (180, 380), dishes: ["班尼迪克蛋", "鬆餅", "拿鐵"]),
        .init(key: "cafe", name: "咖啡廳", price: (150, 350), dishes: ["手沖咖啡", "肉桂捲", "鹹派"]),
        .init(key: "vegetarian", name: "蔬食", price: (150, 400), dishes: ["蔬菜咖哩", "藜麥沙拉", "豆腐排"]),
        .init(key: "dessert", name: "甜點", price: (120, 300), dishes: ["芒果冰", "檸檬塔", "花生豆花"]),
        .init(key: "bar", name: "酒吧", price: (400, 900), dishes: ["招牌調酒", "炸物拼盤", "精釀啤酒"]),
        .init(key: "stirfry", name: "熱炒", price: (250, 500), dishes: ["三杯雞", "炒水蓮", "鹽酥蝦"]),
        .init(key: "japanese", name: "日式料理", price: (300, 900), dishes: ["燒鳥", "生魚片", "定食"]),
        .init(key: "chinese", name: "中式料理", price: (300, 800), dishes: ["小籠包", "港式點心", "紅燒獅子頭"]),
        .init(key: "western", name: "西式餐廳", price: (500, 1500), dishes: ["牛排", "燉飯", "油封鴨"]),
        .init(key: "bakery", name: "麵包烘焙", price: (80, 250), dishes: ["可頌", "肉桂捲", "酸種麵包"]),
        .init(key: "izakaya", name: "居酒屋", price: (400, 1000), dishes: ["串燒", "唐揚雞", "生啤酒"]),
        .init(key: "finedining", name: "Fine Dining", price: (2000, 5000), dishes: ["主廚套餐", "餐酒搭配"]),
        .init(key: "bistro", name: "餐酒館", price: (500, 1200), dishes: ["下酒小點", "自然酒"]),
    ]
    static let byKey: [String: Cuisine] = Dictionary(uniqueKeysWithValues: all.map { ($0.key, $0) })
}

enum Tags {
    static let all: [(String, String)] = [
        ("solo", "一人食"), ("group", "適合聚餐"), ("kids", "親子友善"), ("pet", "寵物友善"),
        ("veg", "有素食選項"), ("private", "可包場"), ("quiet", "安靜好聊"), ("late", "宵夜"),
    ]
    static func name(_ k: String) -> String { all.first { $0.0 == k }?.1 ?? k }
}

enum GoogleList {
    static let all: [(String, String)] = [("want", "想去"), ("fav", "喜愛"), ("star", "已加星號")]
    static func name(_ k: String) -> String { all.first { $0.0 == k }?.1 ?? "想去" }
}

struct Filters: Codable, Equatable {
    var budget = 500          // 每人上限；1500 = 不限
    var budgetMin = 0
    var distance = 3.0        // 公里；99 = 不限
    var minScore = 3.5
    var cuisines: [String] = []
    var tags: [String] = []
    var openNow = true
    var trusted = true        // 推薦模式：排除評論太少的店
    var avoidRecent = true    // 避開 3 天內吃過的
}

struct HistoryItem: Codable, Hashable {
    var id: String
    var at: Date
}

/** 使用者選的地區；Prefs.region == nil = 自動（跟著手機位置） */
struct RegionSel: Codable, Equatable {
    var city: String
    var area: String?
}

struct Prefs: Codable {
    var nickname = ""
    var region: RegionSel?
    var favorites: [String] = []
    var blocked: [String] = []
    var history: [HistoryItem] = []
    var taste: [String: Int] = [:]  // 滑卡累積的口味分數，-3..+3
    var filters = Filters()
    var onboarded = false
}
