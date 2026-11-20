import SwiftUI

struct DecideView: View {
    @EnvironmentObject var app: AppModel
    enum Phase { case idle, rolling, picked }
    @State private var phase = Phase.idle
    @State private var picks: [Place] = []
    @State private var seen: Set<String> = []
    @State private var reel = ["ramen", "bento", "sushi"]
    @State private var more = false
    @State private var chosen: Place?

    var meal: String {
        let h = Calendar.current.component(.hour, from: Date())
        return h < 5 ? "宵夜" : h < 10 ? "早餐" : h < 14 ? "午餐" : h < 17 ? "下午茶" : h < 21 ? "晚餐" : "宵夜"
    }

    var body: some View {
        let pool = app.filtered
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("嗨，\(app.prefs.nickname.isEmpty ? "朋友" : app.prefs.nickname)").font(.subheadline).foregroundStyle(Theme.ink2)
                        Text("\(meal)吃什麼？").font(.system(size: 32, weight: .heavy, design: .serif)).foregroundStyle(Theme.ink)
                    }
                    Spacer()
                    LocationPill()
                }

                if phase != .picked {
                    LocateCard()
                    hero(pool.count)
                    cuisineRow
                    filterCard
                }

                switch phase {
                case .rolling:
                    HStack(spacing: 18) { ForEach(0..<3, id: \.self) { i in Art(name: reel[i], size: 64) } }
                        .frame(maxWidth: .infinity).padding(.vertical, 8)
                case .idle:
                    idleButtons(pool)
                case .picked:
                    pickedList(pool)
                }
            }
            .padding(.horizontal, 18).padding(.bottom, 24)
        }
        .background(Theme.beige)
        .toolbar(.hidden, for: .navigationBar)
        .sheet(isPresented: $more) { FilterSheet(count: pool.count).environmentObject(app) }
        .sheet(item: $chosen) { p in DecisionSheet(place: p).environmentObject(app).presentationDetents([.large]) }
    }

    func hero(_ n: Int) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 6) {
                Text("30 秒幫你決定").font(.title3.bold()).foregroundStyle(.white)
                Text("附近有 \(n) 家符合你的條件").font(.subheadline).foregroundStyle(.white.opacity(0.8))
            }
            Spacer()
            Art(name: "dice", size: 84)
                .rotationEffect(.degrees(phase == .rolling ? 20 : 0))
                .animation(phase == .rolling ? .easeInOut(duration: 0.12).repeatForever() : .default, value: phase)
        }
        .padding(18)
        .background(
            LinearGradient(colors: [Theme.indigo, Theme.indigoDeep], startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }

    var cuisineRow: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("想吃什麼").font(.title3.bold())
                Spacer()
                if !app.prefs.filters.cuisines.isEmpty { Button("清除") { app.prefs.filters.cuisines = [] }.font(.subheadline) }
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    cat("fortune", "都可以", app.prefs.filters.cuisines.isEmpty) { app.prefs.filters.cuisines = [] }
                    ForEach(Cuisine.all) { c in
                        cat(c.key, c.name, app.prefs.filters.cuisines.contains(c.key)) { toggleCuisine(c.key) }
                    }
                }
            }
        }
    }

    func cat(_ art: String, _ name: String, _ on: Bool, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Art(name: art, size: 42)
                    .frame(width: 64, height: 64)
                    .background(on ? Theme.indigoSoft : Theme.paper, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(on ? Theme.indigo : Theme.line, lineWidth: on ? 2 : 1))
                Text(name).font(.caption).foregroundStyle(on ? Theme.indigo : Theme.ink2).lineLimit(1)
            }
            .frame(width: 70)
        }
        .buttonStyle(.plain)
    }

    func toggleCuisine(_ k: String) {
        let on = !app.prefs.filters.cuisines.contains(k)
        toggle(&app.prefs.filters.cuisines, k)
        // Fine Dining 每人多在 NT$2,000 以上，選它時把預算上限放到不限
        if on && k == "finedining" && app.prefs.filters.budget < 1500 {
            app.prefs.filters.budget = 1500
            app.show("Fine Dining 每人約 NT$2,000 起，預算上限改成不限")
        }
    }

    var filterCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            BudgetPicker()
            Divider()
            HStack(spacing: 8) {
                Text("距離").font(.subheadline.weight(.semibold))
                DistanceChips()
            }
            HStack(spacing: 8) {
                Chip(text: "營業中", on: app.prefs.filters.openNow, icon: "clock") { app.prefs.filters.openNow.toggle() }
                Chip(text: "推薦模式", on: app.prefs.filters.trusted, icon: "checkmark.seal") { app.prefs.filters.trusted.toggle() }
                Chip(text: "更多", icon: "slider.horizontal.3") { more = true }
            }
        }
        .card()
    }

    @ViewBuilder
    func idleButtons(_ pool: [Place]) -> some View {
        VStack(spacing: 12) {
            if pool.isEmpty {
                Text("沒有符合的店，放寬預算或距離試試").font(.subheadline).foregroundStyle(Theme.amber)
                    .frame(maxWidth: .infinity).padding().background(Theme.sand, in: RoundedRectangle(cornerRadius: 14))
            } else {
                Button { roll(5, pool) } label: { Label("幫我決定", systemImage: "dice.fill") }.buttonStyle(PrimaryButton())
            }
            HStack {
                Button { roll(1, pool) } label: { Label("隨便啦，直接給我一家", systemImage: "sparkles") }
                    .disabled(pool.isEmpty)
                Spacer()
                Button { app.tab = .explore } label: { Text("看全部 \(pool.count) 家 ›") }
            }
            .font(.subheadline)
        }
    }

    func roll(_ n: Int, _ pool: [Place]) {
        guard !pool.isEmpty else { return }
        phase = .rolling
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        let keys = Cuisine.all.map(\.key)
        let result = Logic.pick(n, from: pool, prefs: app.prefs, at: app.here)
        Task {
            for _ in 0..<13 {
                reel = (0..<3).map { _ in keys.randomElement()! }
                try? await Task.sleep(for: .milliseconds(90))
            }
            withAnimation(.spring) {
                picks = result
                seen = Set(result.map(\.id))
                phase = .picked
            }
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            if n == 1, let r = result.first { chosen = r }
        }
    }

    func swap(_ i: Int, _ pool: [Place]) {
        let others = seen.union(picks.map(\.id))
        guard let next = Logic.pick(1, from: pool, prefs: app.prefs, at: app.here, exclude: others).first else {
            app.show("沒有其他符合條件的店了"); return
        }
        seen = others.union([next.id])
        withAnimation { picks[i] = next }
    }

    func pickedList(_ pool: [Place]) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .bottom) {
                VStack(alignment: .leading) {
                    Text("抽出 \(picks.count) 家").font(.subheadline).foregroundStyle(Theme.ink2)
                    Text("今天就選一家吧").font(.title2.bold())
                }
                Spacer()
                Chip(text: "改條件", icon: "slider.horizontal.3") { withAnimation { phase = .idle } }
            }
            ForEach(Array(picks.enumerated()), id: \.element.id) { i, p in
                VStack(alignment: .leading, spacing: 8) {
                    NavigationLink(value: p.id) {
                        PlacePhoto(place: p, height: 170)
                            .overlay(alignment: .topLeading) {
                                HStack(spacing: 4) { Art(name: p.cuisine, size: 18); Text(p.cuisineInfo.name).font(.caption.bold()) }
                                    .padding(.horizontal, 8).padding(.vertical, 4).background(.thinMaterial, in: Capsule()).padding(10)
                            }
                            .overlay(alignment: .topTrailing) { ScoreBadge(place: p).padding(10) }
                            .overlay(alignment: .bottomLeading) {
                                Text("0\(i + 1)").font(.system(size: 30, weight: .black, design: .serif)).foregroundStyle(.white).shadow(radius: 4).padding(10)
                            }
                    }
                    .buttonStyle(.plain)
                    Text(p.name).font(.headline)
                    HStack(spacing: 12) {
                        Label(Logic.priceText(p), systemImage: "yensign.circle")
                        let km = app.dist(p)
                        Label("\(Logic.fmtDist(km)) · \(Logic.walkMin(km)) 分", systemImage: "figure.walk")
                    }
                    .font(.caption).foregroundStyle(Theme.ink2)
                    OpenText(place: p)
                    HStack(spacing: 10) {
                        Button { swap(i, pool) } label: { Label("換一家", systemImage: "arrow.triangle.2.circlepath") }.buttonStyle(SoftButton())
                        Button { chosen = p } label: { Text("就這家") }.buttonStyle(PrimaryButton()).frame(height: 44)
                    }
                }
                .card(12)
            }
            HStack(spacing: 10) {
                Button { roll(5, pool) } label: { Label("全部重抽", systemImage: "dice") }.buttonStyle(SoftButton())
                Button {
                    app.groupDraft = picks.map(\.id)
                    app.tab = .group
                } label: { Label("揪團投票", systemImage: "person.3") }.buttonStyle(SoftButton())
            }
        }
    }
}

/** 「就決定是你了！」：導航、看店家、只記錄 */
struct DecisionSheet: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.dismiss) var dismiss
    @Environment(\.openURL) var openURL
    let place: Place
    var onDetail: (() -> Void)? = nil

    var body: some View {
        let km = app.dist(place)
        ScrollView {
            VStack(spacing: 16) {
                Art(name: "popper", size: 72).padding(.top, 20)
                Text("就決定是你了！").font(.title.bold())
                PlacePhoto(place: place, height: 190)
                    .overlay(alignment: .bottomLeading) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(place.name).font(.title3.bold())
                            Text("\(place.cuisineInfo.name) · \(Logic.priceText(place)) · \(Logic.fmtDist(km))").font(.caption)
                        }
                        .foregroundStyle(.white).shadow(radius: 4).padding(12)
                    }
                Text("走路約 \(Logic.walkMin(km)) 分鐘").foregroundStyle(Theme.ink2)
                VStack(spacing: 10) {
                    Button {
                        app.markEaten(place.id)
                        openURL(Logic.appleMapsURL(place))
                    } label: { Label("出發！Apple 地圖導航", systemImage: "location.north.line.fill") }
                        .buttonStyle(PrimaryButton())
                    Button {
                        app.markEaten(place.id)
                        openURL(Logic.googleDirURL(place))
                    } label: { Label("用 Google 地圖導航", systemImage: "map") }
                        .buttonStyle(SoftButton())
                    Button {
                        app.markEaten(place.id)
                        dismiss()
                    } label: { Label("就吃這家（只記錄）", systemImage: "checkmark") }
                        .buttonStyle(SoftButton())
                    Button("關閉") { dismiss() }.padding(.top, 4)
                }
            }
            .padding(20)
        }
        .background(Theme.beige)
    }
}

/** 決定頁右上：目前地區，點了選國家／城市／區域 */
struct LocationPill: View {
    @EnvironmentObject var app: AppModel
    @State private var open = false
    var body: some View {
        Button { open = true } label: {
            HStack(spacing: 4) {
                Image(systemName: app.inCity ? "location.fill" : "mappin.and.ellipse").font(.caption)
                Text(app.location.locating ? "定位中…" : app.regionLabel).font(.caption.weight(.semibold)).lineLimit(1)
            }
            .padding(.horizontal, 10).padding(.vertical, 7)
            .foregroundStyle(app.inCity ? .white : Theme.indigo)
            .background(app.inCity ? Theme.indigo : Theme.indigoSoft, in: Capsule())
        }
        .buttonStyle(.plain)
        .frame(maxWidth: 190, alignment: .trailing)
        .sheet(isPresented: $open) { RegionPicker().environmentObject(app).presentationDetents([.medium, .large]) }
    }
}

/** 選地區：自動（手機位置）或 國家 → 城市 → 區域 */
struct RegionPicker: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.dismiss) var dismiss
    @State private var country = "TW"

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Button {
                        app.prefs.region = nil
                        app.location.request()
                        dismiss()
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "location.fill").foregroundStyle(Theme.indigo)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("自動（用手機位置）").font(.headline)
                                Text(app.location.coordinate == nil ? "還沒定位" : String(format: "誤差約 %.0f 公尺", app.location.accuracy))
                                    .font(.caption).foregroundStyle(Theme.ink3)
                            }
                            Spacer()
                            if app.prefs.region == nil { Image(systemName: "checkmark").foregroundStyle(Theme.indigo) }
                        }
                        .card(14)
                    }
                    .buttonStyle(.plain)

                    Picker("國家", selection: $country) {
                        ForEach(City.countries, id: \.key) { Text($0.name).tag($0.key) }
                    }
                    .pickerStyle(.segmented)

                    ForEach(City.all.filter { $0.country == country }) { c in
                        let areas = AreaInfo.of(c.key, in: app.places)
                        let count = app.places.filter { $0.city == c.key }.count
                        VStack(alignment: .leading, spacing: 10) {
                            Button { pick(c.key, nil) } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(c.name).font(.headline)
                                        Text("全部 · \(count) 家 · 沒定位時從\(c.centerName)算距離").font(.caption).foregroundStyle(Theme.ink3)
                                    }
                                    Spacer()
                                    if app.prefs.region == RegionSel(city: c.key, area: nil) { Image(systemName: "checkmark").foregroundStyle(Theme.indigo) }
                                }
                                .card(12)
                            }
                            .buttonStyle(.plain)
                            if !areas.isEmpty {
                                Flow {
                                    ForEach(areas) { a in
                                        Chip(text: "\(a.name) \(a.count)", on: app.prefs.region == RegionSel(city: c.key, area: a.code)) { pick(c.key, a.code) }
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(20)
            }
            .background(Theme.beige)
            .navigationTitle("選擇地區").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("關閉") { dismiss() } } }
        }
        .onAppear { country = app.city.country }
    }

    func pick(_ city: String, _ area: String?) {
        app.prefs.region = RegionSel(city: city, area: area)
        app.show("已切換到 \(app.regionLabel)")
        dismiss()
    }
}

/** 沒有定位或人不在選的城市時的提示卡 */
struct LocateCard: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.openURL) var openURL
    var body: some View {
        let loc = app.location
        if loc.coordinate == nil && !loc.locating {
            HStack(spacing: 12) {
                Art(name: "pin", size: 40)
                VStack(alignment: .leading, spacing: 2) {
                    Text(loc.denied ? "定位被關掉了" : "用你的位置找附近的店").font(.subheadline.bold())
                    Text(loc.denied ? "到「設定 › 吃什麼 › 位置」打開；現在從\(app.area?.name ?? app.city.centerName)計算距離" : "現在從\(app.area?.name ?? app.city.centerName)計算距離").font(.caption).foregroundStyle(Theme.ink2)
                }
                Spacer()
                Button(loc.denied ? "設定" : "定位") {
                    if loc.denied { openURL(URL(string: UIApplication.openSettingsURLString)!) } else { loc.request() }
                }
                .font(.subheadline.bold())
            }
            .card(12)
        } else if !app.inCity && app.area == nil {
            Text("你現在不在\(app.city.name)，距離從\(app.city.centerName)計算；可以在右上角選區域。").font(.caption).foregroundStyle(Theme.ink2)
                .padding(10).frame(maxWidth: .infinity, alignment: .leading).background(Theme.sand, in: RoundedRectangle(cornerRadius: 12))
        }
    }
}
