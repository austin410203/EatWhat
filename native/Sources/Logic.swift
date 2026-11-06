import Foundation
import CoreLocation

// 和網頁版 src/lib/logic.ts 同一套規則：距離、可信分數、營業時間、篩選、加權抽選。

enum Logic {
    /** 測試位置：中山站。沒有定位時用這裡算距離 */
    static let fallback = CLLocationCoordinate2D(latitude: 25.0526, longitude: 121.5204)

    static func distanceKm(_ p: Place, from: CLLocationCoordinate2D) -> Double {
        let R = 6371.0, rad = Double.pi / 180
        let dLat = (p.lat - from.latitude) * rad, dLng = (p.lng - from.longitude) * rad
        let a = pow(sin(dLat / 2), 2) + cos(from.latitude * rad) * cos(p.lat * rad) * pow(sin(dLng / 2), 2)
        return 2 * R * asin(sqrt(a))
    }

    static func walkMin(_ km: Double) -> Int { max(1, Int((km * 1.25 * 1000 / 75).rounded())) }

    static func fmtDist(_ km: Double) -> String {
        km < 1 ? "\(Int((km * 100).rounded()) * 10) m" : String(format: "%.1f km", km)
    }

    /** 可信分數：把評分往平均值拉，評論數越少拉得越多（貝氏平均） */
    static func trustScore(_ p: Place) -> Double {
        let v = Double(p.reviews)
        return ((v * p.rating + 40 * 3.9) / (v + 40) * 10).rounded() / 10
    }

    /** 沒抓到評分資料的店（顯示「—」，不算灌分嫌疑） */
    static func noRating(_ p: Place) -> Bool { p.reviews == 0 }

    /** 推薦模式要排除：評論太少 */
    static func lowConfidence(_ p: Place) -> Bool { p.reviews < 30 && !noRating(p) }

    // MARK: 營業時間

    struct OpenStatus { var open: Bool; var closingSoon: Bool; var unknown: Bool; var text: String }

    static func hm(_ m: Int) -> String {
        let mm = ((m % 1440) + 1440) % 1440
        return String(format: "%02d:%02d", mm / 60, mm % 60)
    }

    static func weekday(_ d: Date) -> Int { Calendar.current.component(.weekday, from: d) - 1 }

    static func openStatus(_ p: Place, now: Date = Date()) -> OpenStatus {
        guard let hours = p.hours, hours.count == 7 else {
            return OpenStatus(open: false, closingSoon: false, unknown: true, text: "營業時間未提供")
        }
        let day = weekday(now)
        let c = Calendar.current.dateComponents([.hour, .minute], from: now)
        let min = (c.hour ?? 0) * 60 + (c.minute ?? 0)
        for s in hours[(day + 6) % 7] where s.count == 2 && s[1] > 1440 && min < s[1] - 1440 {
            return OpenStatus(open: true, closingSoon: s[1] - 1440 - min <= 45, unknown: false, text: "營業到 \(hm(s[1]))")
        }
        for s in hours[day] where s.count == 2 && min >= s[0] && min < s[1] {
            return OpenStatus(open: true, closingSoon: s[1] - min <= 45, unknown: false, text: "營業到 \(hm(s[1]))")
        }
        if let later = hours[day].first(where: { $0.count == 2 && $0[0] > min }) {
            return OpenStatus(open: false, closingSoon: false, unknown: false, text: "\(hm(later[0])) 開門")
        }
        let wd = ["日", "一", "二", "三", "四", "五", "六"]
        for k in 1...7 {
            let d = hours[(day + k) % 7]
            if let first = d.first, first.count == 2 {
                return OpenStatus(open: false, closingSoon: false, unknown: false,
                                  text: k == 1 ? "明天 \(hm(first[0])) 開門" : "週\(wd[(day + k) % 7]) \(hm(first[0])) 開門")
            }
        }
        return OpenStatus(open: false, closingSoon: false, unknown: false, text: "暫停營業")
    }

    static func hoursText(_ p: Place, day: Int) -> String {
        guard let h = p.hours, h.count == 7 else { return "未提供" }
        if h[day].isEmpty { return "公休" }
        return h[day].filter { $0.count == 2 }.map { "\(hm($0[0]))–\(hm($0[1]))" }.joined(separator: "、")
    }

    // MARK: 價位

    static func priceBounds(_ p: Place) -> (Int, Int)? {
        guard let r = p.priceRange, r.count == 2 else { return nil }
        return (r[0], r[1])
    }

    /** 排序用的代表價 */
    static func price(_ p: Place) -> Int {
        if let v = p.price { return v }
        let c = p.cuisineInfo
        return (c.price.0 + c.price.1) / 20 * 10
    }

    static func priceText(_ p: Place) -> String {
        guard let b = priceBounds(p) else { return "價位未提供" }
        let (lo, hi) = b
        let n = { (v: Int) -> String in
            let f = NumberFormatter(); f.numberStyle = .decimal
            return f.string(from: NSNumber(value: v)) ?? "\(v)"
        }
        if hi >= 99999 { return "NT$\(n(lo)) 以上" }
        if lo <= 1 { return "NT$\(n(hi)) 以內" }
        if lo == hi { return "NT$\(n(lo))" }
        return "NT$\(n(lo))–\(n(hi))"
    }

    static func priceLevel(_ v: Int) -> String { v < 200 ? "$" : v < 400 ? "$$" : v < 800 ? "$$$" : "$$$$" }

    // MARK: 篩選與排序

    static func recentIds(_ prefs: Prefs) -> Set<String> {
        let cut = Date().addingTimeInterval(-3 * 24 * 3600)
        return Set(prefs.history.filter { $0.at > cut }.map(\.id))
    }

    static func apply(_ f: Filters, places: [Place], prefs: Prefs, from: CLLocationCoordinate2D, now: Date = Date()) -> [Place] {
        let recent = f.avoidRecent ? recentIds(prefs) : []
        let blocked = Set(prefs.blocked)
        return places.filter { p in
            if blocked.contains(p.id) { return false }
            // 價位：和預算區間有重疊就算；沒有價位資料的不因預算被排除
            if let b = priceBounds(p) {
                if f.budget < 1500 && b.0 > f.budget { return false }
                if b.1 < f.budgetMin { return false }
            }
            if distanceKm(p, from: from) > f.distance { return false }
            if !f.cuisines.isEmpty && !f.cuisines.contains(p.cuisine) { return false }
            if !f.tags.isEmpty && !f.tags.allSatisfy({ p.tags.contains($0) }) { return false }
            if f.openNow { let os = openStatus(p, now: now); if !os.open && !os.unknown { return false } }
            if f.trusted && lowConfidence(p) { return false }
            if trustScore(p) < f.minScore && !noRating(p) { return false }
            if recent.contains(p.id) { return false }
            return true
        }
    }

    enum SortKey: String, CaseIterable { case smart = "綜合推薦", score = "可信分數", distance = "距離", price = "價格" }

    /** 綜合分：可信分數為主，距離近、合口味加分 */
    static func smartScore(_ p: Place, prefs: Prefs, from: CLLocationCoordinate2D) -> Double {
        let taste = Double(prefs.taste[p.cuisine] ?? 0)
        let fav = prefs.favorites.contains(p.id) ? 0.3 : 0
        return trustScore(p) - distanceKm(p, from: from) * 0.18 + taste * 0.12 + fav
    }

    static func sort(_ list: [Place], by key: SortKey, prefs: Prefs, from: CLLocationCoordinate2D) -> [Place] {
        switch key {
        case .score: return list.sorted { trustScore($0) > trustScore($1) }
        case .distance: return list.sorted { distanceKm($0, from: from) < distanceKm($1, from: from) }
        case .price:
            let v = { (p: Place) -> Int in priceBounds(p) == nil ? Int.max : price(p) }
            return list.sorted { v($0) < v($1) }
        case .smart:
            let s = Dictionary(uniqueKeysWithValues: list.map { ($0.id, smartScore($0, prefs: prefs, from: from)) })
            return list.sorted { s[$0.id]! > s[$1.id]! }
        }
    }

    /** 加權隨機抽 n 家，不同料理盡量不重複 */
    static func pick(_ n: Int, from list: [Place], prefs: Prefs, at: CLLocationCoordinate2D, exclude: Set<String> = []) -> [Place] {
        var pool = list.filter { !exclude.contains($0.id) }
        var out: [Place] = []
        var used = Set<String>()
        while out.count < n && !pool.isEmpty {
            let weights = pool.map { p -> Double in
                let base = exp((smartScore(p, prefs: prefs, from: at) - 3.5) * 1.6)
                return used.contains(p.cuisine) ? base * 0.15 : base
            }
            var x = Double.random(in: 0..<max(weights.reduce(0, +), 1e-9))
            var k = 0
            while k < pool.count - 1 { x -= weights[k]; if x <= 0 { break }; k += 1 }
            let p = pool.remove(at: k)
            used.insert(p.cuisine)
            out.append(p)
        }
        return out
    }

    // MARK: 外部連結

    static func appleMapsURL(_ p: Place) -> URL {
        let q = p.name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        return URL(string: "maps://?daddr=\(p.lat),\(p.lng)&dirflg=w&q=\(q)")!
    }

    static func googleDirURL(_ p: Place) -> URL {
        URL(string: "https://www.google.com/maps/dir/?api=1&destination=\(String(format: "%.5f,%.5f", p.lat, p.lng))&travelmode=walking")!
    }

    static func googlePlaceURL(_ p: Place) -> URL {
        if let cid = p.cid, !cid.isEmpty { return URL(string: "https://maps.google.com/?cid=\(cid)")! }
        return URL(string: "https://www.google.com/maps/search/?api=1&query=\(p.lat),\(p.lng)")!
    }

    static func telURL(_ p: Place) -> URL? {
        let digits = p.phone.filter { $0.isNumber || $0 == "+" }
        return digits.isEmpty ? nil : URL(string: "tel:\(digits)")
    }

    // MARK: 後台：營業時間文字

    /** 「11:30-14:00, 17:30-21:00」→ [[690, 840], [1050, 1260]]；空白 = 公休；結束早於開始 = 跨夜；格式錯回 nil */
    static func parseDay(_ text: String) -> [[Int]]? {
        let t = text.trimmingCharacters(in: .whitespaces)
        if t.isEmpty || t == "公休" { return [] }
        var out: [[Int]] = []
        for part in t.split(whereSeparator: { ",，、;；".contains($0) }) {
            let ends = part.split(whereSeparator: { "-–~～".contains($0) }).map { $0.trimmingCharacters(in: .whitespaces) }
            guard ends.count == 2, let a = parseHM(ends[0]), var b = parseHM(ends[1]) else { return nil }
            if b <= a { b += 1440 }
            out.append([a, b])
        }
        return out.count <= 4 ? out : nil
    }

    private static func parseHM(_ s: String) -> Int? {
        let p = s.replacingOccurrences(of: "：", with: ":").split(separator: ":")
        guard let h = Int(p.first ?? ""), h >= 0, h <= 24 else { return nil }
        let m = p.count > 1 ? Int(p[1]) ?? -1 : 0
        guard m >= 0, m < 60 else { return nil }
        return h * 60 + m
    }

    static func dayText(_ d: [[Int]]) -> String {
        d.map { "\(hm($0[0]))-\(hm($0[1]))" }.joined(separator: ", ")
    }

    /** 從 Google 地圖網址或「緯度, 經度」文字取座標 */
    static func parseCoords(_ s: String) -> (Double, Double)? {
        let patterns = [#"!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)"#, #"@(-?\d+\.\d+),(-?\d+\.\d+)"#, #"[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)"#, #"^\s*(-?\d+\.\d+)\s*[,，]\s*(-?\d+\.\d+)\s*$"#]
        for p in patterns {
            guard let re = try? NSRegularExpression(pattern: p),
                  let m = re.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)),
                  let r1 = Range(m.range(at: 1), in: s), let r2 = Range(m.range(at: 2), in: s),
                  let a = Double(s[r1]), let b = Double(s[r2]) else { continue }
            return (a, b)
        }
        return nil
    }
}
