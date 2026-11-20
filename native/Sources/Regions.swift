import Foundation
import CoreLocation

// 地區：國家 → 城市 → 區域。和網頁版 src/data/regions.ts 同一份表；區域由店家資料的 area／areaName 整理出來。

struct City: Identifiable, Hashable {
    let key: String
    let country: String
    let name: String
    let lat: Double
    let lng: Double
    let centerName: String
    var id: String { key }
    var center: CLLocationCoordinate2D { CLLocationCoordinate2D(latitude: lat, longitude: lng) }

    static let all: [City] = [
        City(key: "taipei", country: "TW", name: "台北", lat: 25.0526, lng: 121.5204, centerName: "中山站"),
        City(key: "tokyo", country: "JP", name: "東京", lat: 35.6812, lng: 139.7671, centerName: "東京車站"),
    ]
    static let byKey = Dictionary(uniqueKeysWithValues: all.map { ($0.key, $0) })
    static let countries: [(key: String, name: String)] = [("TW", "🇹🇼 台灣"), ("JP", "🇯🇵 日本")]

    /** 離這個位置最近、80 km 內的城市 */
    static func near(_ c: CLLocationCoordinate2D?) -> City? {
        guard let c else { return nil }
        let here = Place(id: "", name: "", cuisine: "", lat: c.latitude, lng: c.longitude)
        return all.map { ($0, Logic.distanceKm(here, from: $0.center)) }.filter { $0.1 < 80 }.min { $0.1 < $1.1 }?.0
    }
}

struct AreaInfo: Identifiable, Hashable {
    let code: String
    let name: String
    let count: Int
    let lat: Double
    let lng: Double
    var id: String { code }
    var center: CLLocationCoordinate2D { CLLocationCoordinate2D(latitude: lat, longitude: lng) }

    /** 某城市的區域，中心 = 該區店家座標平均 */
    static func of(_ city: String, in places: [Place]) -> [AreaInfo] {
        var m: [String: (String, Int, Double, Double)] = [:]
        for p in places where p.city == city {
            guard let a = p.area else { continue }
            let v = m[a] ?? (p.areaName ?? a, 0, 0, 0)
            m[a] = (v.0, v.1 + 1, v.2 + p.lat, v.3 + p.lng)
        }
        return m.map { AreaInfo(code: $0.key, name: $0.value.0, count: $0.value.1, lat: $0.value.2 / Double($0.value.1), lng: $0.value.3 / Double($0.value.1)) }
            .sorted { $0.code < $1.code }
    }
}
