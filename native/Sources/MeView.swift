import SwiftUI

struct MeView: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.openURL) var openURL
    enum ListTab: String, CaseIterable { case fav = "收藏", history = "吃過", blocked = "不想再去" }
    @State private var tab = ListTab.fav
    @State private var login = false
    @State private var confirmReset = false
    @State private var admin = Debug.screen == "admin"

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("我的").font(.system(size: 28, weight: .heavy, design: .serif))

                HStack(spacing: 14) {
                    Art(name: "onigiri", size: 54)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("暱稱（揪團時顯示）").font(.caption).foregroundStyle(Theme.ink3)
                        TextField("輸入暱稱", text: $app.prefs.nickname).font(.headline)
                    }
                }
                .card()

                taste

                Picker("", selection: $tab) {
                    ForEach(ListTab.allCases, id: \.self) { t in Text("\(t.rawValue) \(count(t))").tag(t) }
                }
                .pickerStyle(.segmented)
                list

                settings

                VStack(alignment: .leading, spacing: 6) {
                    Text("關於").font(.headline)
                    Text("店家來自你在 Google 地圖收藏的台北餐廳，評分與營業時間是匯入時的資料，之後由後台維護。照片署名屬原拍攝者。")
                        .font(.caption).foregroundStyle(Theme.ink2)
                    Text("吃什麼 v\(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "") (\(Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "")) · Empty Office")
                        .font(.caption2).foregroundStyle(Theme.ink3)
                }
                .card()
            }
            .padding(.horizontal, 18).padding(.bottom, 24)
        }
        .background(Theme.beige)
        .toolbar(.hidden, for: .navigationBar)
        .sheet(isPresented: $login) { AdminLogin().environmentObject(app).presentationDetents([.medium]) }
        .navigationDestination(isPresented: $admin) { AdminList() }
        .confirmationDialog("清除所有收藏、紀錄與設定？", isPresented: $confirmReset, titleVisibility: .visible) {
            Button("清除", role: .destructive) { app.resetAll() }
        }
    }

    func count(_ t: ListTab) -> Int {
        switch t {
        case .fav: return app.prefs.favorites.count
        case .history: return app.prefs.history.count
        case .blocked: return app.prefs.blocked.count
        }
    }

    var taste: some View {
        let all = app.prefs.taste.filter { $0.value != 0 }.sorted { $0.value > $1.value }
        let shown = Array(all.filter { $0.value > 0 }.prefix(6)) + Array(all.filter { $0.value < 0 }.suffix(3))
        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("我的口味").font(.headline)
                Spacer()
                Button("滑卡調整 ›") { app.tab = .swipe }.font(.subheadline)
            }
            if shown.isEmpty {
                Text("還沒有口味資料，去「滑卡」選幾張，推薦會更合你胃口。").font(.caption).foregroundStyle(Theme.ink3)
            }
            ForEach(shown, id: \.key) { e in
                let k = e.key, v = e.value
                HStack {
                    Art(name: k, size: 22)
                    Text(Cuisine.byKey[k]?.name ?? k).font(.subheadline).frame(width: 84, alignment: .leading)
                    GeometryReader { g in
                        let half = g.size.width / 2
                        let w = half * CGFloat(abs(v)) / 3
                        ZStack(alignment: .leading) {
                            Capsule().fill(Theme.sand)
                            Capsule().fill(v > 0 ? Theme.indigo : Theme.red)
                                .frame(width: w)
                                .offset(x: v > 0 ? half : half - w)
                        }
                    }
                    .frame(height: 8)
                }
            }
        }
        .card()
    }

    @ViewBuilder
    var list: some View {
        let ids: [String] = tab == .fav ? app.prefs.favorites : tab == .blocked ? app.prefs.blocked : app.prefs.history.map(\.id)
        VStack(spacing: 10) {
            ForEach(Array(ids.enumerated()), id: \.offset) { i, id in
                if let p = app.place(id) {
                    switch tab {
                    case .history:
                        PlaceRow(place: p, trailing: AnyView(Text(ago(app.prefs.history[i].at)).font(.caption).foregroundStyle(Theme.ink3)))
                    case .blocked:
                        PlaceRow(place: p, trailing: AnyView(Button("解除") { app.toggleBlocked(id) }.font(.caption.bold())))
                    case .fav:
                        PlaceRow(place: p)
                    }
                }
            }
            if ids.isEmpty {
                EmptyNote(art: tab == .fav ? "heart" : tab == .history ? "clock" : "shield",
                          text: tab == .fav ? "在店家頁按 ♡ 收藏" : tab == .history ? "決定吃哪家之後會記在這裡，3 天內吃過的不會再推薦" : "按「不想再去」的店不會再出現")
            }
        }
    }

    func ago(_ d: Date) -> String {
        let m = Int(-d.timeIntervalSinceNow / 60)
        if m < 60 { return "\(max(1, m)) 分鐘前" }
        if m < 1440 { return "\(m / 60) 小時前" }
        return "\(m / 1440) 天前"
    }

    var settings: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("設定").font(.headline).padding(.bottom, 6)
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("位置")
                    Text(app.location.denied ? "定位被關掉，現在用中山站計算距離" : app.location.coordinate == nil ? "還沒定位，現在用中山站" : String(format: "目前位置（誤差 ±%.0f m）", app.location.accuracy))
                        .font(.caption).foregroundStyle(Theme.ink3)
                }
                Spacer()
                Button(app.location.denied ? "開啟設定" : "重新定位") {
                    if app.location.denied { openURL(URL(string: UIApplication.openSettingsURLString)!) } else { app.location.request() }
                }
                .font(.subheadline)
            }
            .padding(.vertical, 10)
            Divider()
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("管理員")
                    Text(app.isAdmin ? "已登入：可以新增、修改、刪除店家" : "登入後可以維護餐廳資料庫").font(.caption).foregroundStyle(Theme.ink3)
                }
                Spacer()
                if app.isAdmin {
                    Button("管理餐廳") { admin = true }.font(.subheadline.bold())
                    Button("登出") { app.adminKey = nil }.font(.subheadline).foregroundStyle(Theme.ink3)
                } else {
                    Button("登入") { login = true }.font(.subheadline)
                }
            }
            .padding(.vertical, 10)
            Divider()
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("餐廳資料")
                    Text("共 \(app.places.count) 家・\(app.placesVer > 0 ? "已同步" : "內建資料")").font(.caption).foregroundStyle(Theme.ink3)
                }
                Spacer()
                Button("重新整理") { Task { await app.refresh(); app.show("已更新（\(app.places.count) 家）") } }.font(.subheadline)
            }
            .padding(.vertical, 10)
            Divider()
            Button("清除收藏、紀錄與口味", role: .destructive) { confirmReset = true }
                .font(.subheadline).padding(.vertical, 12)
        }
        .card()
    }
}
