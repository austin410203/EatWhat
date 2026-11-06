import Foundation
import CoreLocation
import Combine
import Security
import UIKit

// App 狀態：店家資料（後台資料庫＋本機快取＋打包備援）、使用者偏好（UserDefaults）、定位、管理員密碼（Keychain）。

@MainActor
final class AppModel: ObservableObject {
    @Published var places: [Place] = []
    @Published var placesVer: Double = -1
    @Published var prefs: Prefs { didSet { savePrefs() } }
    @Published var adminKey: String? { didSet { Keychain.set(adminKey, for: "adminKey") } }
    @Published var toast: String?
    /** 店家頁「加入投票」加進來、還沒開始的揪團候選 */
    @Published var groupDraft: [String] = []
    @Published var tab: Tab = .decide
    private var bag: AnyCancellable?

    enum Tab: Hashable { case decide, explore, group, swipe, me }

    let location: LocationService
    private var byId: [String: Place] = [:]

    init() {
        location = LocationService()
        if let d = UserDefaults.standard.data(forKey: "prefs"), let p = try? JSONDecoder().decode(Prefs.self, from: d) {
            prefs = p
        } else {
            prefs = Prefs()
        }
        adminKey = Keychain.get("adminKey")
        // 位置一變，整個畫面重算距離
        bag = location.objectWillChange.sink { [weak self] _ in self?.objectWillChange.send() }
        let cached = Self.cacheURL.flatMap { try? Data(contentsOf: $0) }.flatMap { try? JSONDecoder().decode(PlacesData.self, from: $0) }
        if let c = cached {
            setPlaces(c, persist: false)
        } else if let url = Bundle.main.url(forResource: "saved", withExtension: "json"),
                  let d = try? Data(contentsOf: url), let list = try? JSONDecoder().decode([Place].self, from: d) {
            setPlaces(PlacesData(ver: -1, list: list), persist: false)
        }
    }

    // MARK: 店家

    func place(_ id: String) -> Place? { byId[id] }

    var here: CLLocationCoordinate2D { location.coordinate ?? Logic.fallback }

    func dist(_ p: Place) -> Double { Logic.distanceKm(p, from: here) }

    var filtered: [Place] { Logic.apply(prefs.filters, places: places, prefs: prefs, from: here) }

    private static var cacheURL: URL? {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?.appendingPathComponent("places.json")
    }

    func setPlaces(_ d: PlacesData, persist: Bool = true) {
        places = d.list
        placesVer = d.ver
        byId = Dictionary(d.list.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        guard persist, let url = Self.cacheURL else { return }
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? JSONEncoder().encode(d).write(to: url)
    }

    /** 開 App、回到前景時讀最新資料；沒變（304）或離線就沿用快取 */
    func refresh() async {
        if let d = try? await API.places(ifNotVer: placesVer) { setPlaces(d) }
    }

    // MARK: 偏好

    private func savePrefs() {
        if let d = try? JSONEncoder().encode(prefs) { UserDefaults.standard.set(d, forKey: "prefs") }
    }

    func isFav(_ id: String) -> Bool { prefs.favorites.contains(id) }
    func isBlocked(_ id: String) -> Bool { prefs.blocked.contains(id) }

    /** 收藏和「不想再去」互斥 */
    func toggleFav(_ id: String) {
        if let i = prefs.favorites.firstIndex(of: id) { prefs.favorites.remove(at: i); show("已取消收藏") }
        else { prefs.favorites.insert(id, at: 0); prefs.blocked.removeAll { $0 == id }; show("已加入收藏") }
    }

    func toggleBlocked(_ id: String) {
        if let i = prefs.blocked.firstIndex(of: id) { prefs.blocked.remove(at: i); show("已移出「不想再去」") }
        else { prefs.blocked.insert(id, at: 0); prefs.favorites.removeAll { $0 == id }; show("不會再推薦這家") }
    }

    func markEaten(_ id: String) {
        prefs.history.insert(HistoryItem(id: id, at: Date()), at: 0)
        if prefs.history.count > 100 { prefs.history.removeLast(prefs.history.count - 100) }
        show("已記到「最近吃過」")
    }

    func addTaste(_ cuisine: String, _ v: Int) {
        prefs.taste[cuisine] = max(-3, min(3, (prefs.taste[cuisine] ?? 0) + v))
    }

    func resetAll() {
        prefs = Prefs(nickname: prefs.nickname, onboarded: true)
        show("已清除")
    }

    func show(_ s: String) {
        toast = s
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        Task { try? await Task.sleep(for: .seconds(2.2)); if toast == s { toast = nil } }
    }

    // MARK: 管理員

    var isAdmin: Bool { adminKey != nil }

    func login(_ pw: String) async -> Bool {
        guard await API.checkAdmin(pw) else { return false }
        adminKey = pw
        return true
    }

    /** 寫入後台；密碼錯（401）就登出 */
    func write(_ op: (String) async throws -> PlacesData) async throws {
        guard let key = adminKey else { throw APIError.unauthorized }
        do { setPlaces(try await op(key)) }
        catch APIError.unauthorized { adminKey = nil; throw APIError.unauthorized }
    }
}

extension Prefs {
    init(nickname: String, onboarded: Bool) { self.init(); self.nickname = nickname; self.onboarded = onboarded }
}

// MARK: - 定位

@MainActor
final class LocationService: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published var coordinate: CLLocationCoordinate2D?
    @Published var accuracy: Double = 0
    @Published var status: CLAuthorizationStatus
    @Published var locating = false
    private let mgr = CLLocationManager()

    override init() {
        status = mgr.authorizationStatus
        super.init()
        mgr.delegate = self
        mgr.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    var denied: Bool { status == .denied || status == .restricted }
    var granted: Bool { status == .authorizedWhenInUse || status == .authorizedAlways }

    /** 還沒問過就跳系統視窗；已授權就更新一次位置 */
    func request() {
        if status == .notDetermined { mgr.requestWhenInUseAuthorization(); return }
        if granted { locating = true; mgr.requestLocation() }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
        let s = m.authorizationStatus
        Task { @MainActor in
            status = s
            if granted { locating = true; mgr.requestLocation() }
        }
    }

    nonisolated func locationManager(_ m: CLLocationManager, didUpdateLocations locs: [CLLocation]) {
        guard let l = locs.last else { return }
        Task { @MainActor in
            coordinate = l.coordinate
            accuracy = l.horizontalAccuracy
            locating = false
        }
    }

    nonisolated func locationManager(_ m: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in locating = false }
    }

    /** 人在台北以外（離中山站 20 km 以上） */
    var farFromTaipei: Bool {
        guard let c = coordinate else { return false }
        return Logic.distanceKm(Place(id: "", name: "", cuisine: "", lat: c.latitude, lng: c.longitude), from: Logic.fallback) > 20
    }
}

// MARK: - 後台 API（worker/index.js）

enum APIError: LocalizedError {
    case unauthorized, server(String)
    var errorDescription: String? {
        switch self {
        case .unauthorized: return "管理員密碼錯誤或已失效"
        case .server(let s): return s
        }
    }
}

enum API {
    static let base = URL(string: "https://eat.emptyoffice.app")!

    static func places(ifNotVer ver: Double) async throws -> PlacesData? {
        var req = URLRequest(url: base.appendingPathComponent("api/places"), cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        if ver >= 0 { req.setValue("\"v\(Int64(ver))\"", forHTTPHeaderField: "If-None-Match") }
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else { return nil }
        return try JSONDecoder().decode(PlacesData.self, from: data)
    }

    static func checkAdmin(_ pw: String) async -> Bool {
        var req = URLRequest(url: base.appendingPathComponent("api/admin/check"))
        req.httpMethod = "POST"
        req.setValue("Bearer \(pw)", forHTTPHeaderField: "Authorization")
        guard let r = try? await URLSession.shared.data(for: req) else { return false }
        return (r.1 as? HTTPURLResponse)?.statusCode == 200
    }

    static func send(_ path: String, method: String, key: String, body: Data?, type: String = "application/json") async throws -> PlacesData {
        var req = URLRequest(url: base.appendingPathComponent(path))
        req.httpMethod = method
        req.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        if body != nil { req.setValue(type, forHTTPHeaderField: "Content-Type") }
        req.httpBody = body
        let (data, resp) = try await URLSession.shared.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        if code == 401 { throw APIError.unauthorized }
        guard (200..<300).contains(code) else {
            let msg = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
            throw APIError.server(msg ?? "HTTP \(code)")
        }
        return try JSONDecoder().decode(PlacesData.self, from: data)
    }

    /** 新增／修改用的欄位（id、price、photo 由伺服器決定） */
    static func body(_ p: Place) -> Data? {
        var d: [String: Any] = [
            "name": p.name, "cuisine": p.cuisine, "gcat": p.gcat, "list": p.list, "lat": p.lat, "lng": p.lng,
            "rating": p.rating, "reviews": p.reviews, "addr": p.addr, "phone": p.phone, "tags": p.tags,
        ]
        d["priceRange"] = p.priceRange ?? NSNull()
        d["hours"] = p.hours ?? NSNull()
        if let cid = p.cid { d["cid"] = cid }
        return try? JSONSerialization.data(withJSONObject: d)
    }

    static func create(_ p: Place, key: String) async throws -> PlacesData {
        try await send("api/places", method: "POST", key: key, body: body(p))
    }

    static func update(_ p: Place, key: String) async throws -> PlacesData {
        try await send("api/places/\(p.id)", method: "PUT", key: key, body: body(p))
    }

    static func delete(_ id: String, key: String) async throws -> PlacesData {
        try await send("api/places/\(id)", method: "DELETE", key: key, body: nil)
    }

    static func uploadPhoto(_ id: String, jpeg: Data, key: String) async throws -> PlacesData {
        try await send("api/photo/\(id)", method: "PUT", key: key, body: jpeg, type: "image/jpeg")
    }
}

// MARK: - Keychain（管理員密碼只存在這台手機）

enum Keychain {
    static func set(_ value: String?, for key: String) {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrAccount as String: key]
        SecItemDelete(q as CFDictionary)
        guard let v = value?.data(using: .utf8) else { return }
        var add = q
        add[kSecValueData as String] = v
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(add as CFDictionary, nil)
    }

    static func get(_ key: String) -> String? {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrAccount as String: key,
                                kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var out: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let d = out as? Data else { return nil }
        return String(data: d, encoding: .utf8)
    }
}
