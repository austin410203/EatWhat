import SwiftUI

struct DetailView: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.openURL) var openURL
    let id: String
    @State private var showHours = false
    @State private var scoreInfo = false
    @State private var decided = false
    @State private var editing = false

    var body: some View {
        if let p = app.place(id) {
            content(p)
        } else {
            EmptyNote(art: "fortune", text: "找不到這家店（可能已從資料庫刪除）")
        }
    }

    func content(_ p: Place) -> some View {
        let km = app.dist(p)
        let today = Logic.weekday(Date())
        let eaten = app.prefs.history.filter { $0.id == p.id }.count
        return ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                PlacePhoto(place: p, height: 300, corner: 0, credit: true)

                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 6) {
                            HStack(spacing: 4) { Art(name: p.cuisine, size: 18); Text(p.cuisineInfo.name) }
                                .font(.caption.bold()).padding(.horizontal, 8).padding(.vertical, 4)
                                .background(Theme.indigoSoft, in: Capsule()).foregroundStyle(Theme.indigo)
                            Text("Google 地圖・\(GoogleList.name(p.list))").font(.caption).foregroundStyle(Theme.ink2)
                                .padding(.horizontal, 8).padding(.vertical, 4).background(Theme.sand, in: Capsule())
                        }
                        Text(p.name).font(.system(size: 26, weight: .heavy, design: .serif))
                        if !p.gcat.isEmpty { Text("Google 分類：\(p.gcat)").font(.caption).foregroundStyle(Theme.ink3) }
                        if Logic.noRating(p) {
                            Text("尚無評分資料").font(.subheadline).foregroundStyle(Theme.ink3)
                        } else {
                            HStack(spacing: 6) {
                                Stars(v: p.rating, size: 13)
                                Text(String(format: "%.1f", p.rating)).bold()
                                Text("\(p.reviews) 則評論").foregroundStyle(Theme.ink3)
                            }.font(.subheadline)
                        }
                        OpenText(place: p)
                    }

                    HStack(spacing: 10) {
                        stat("shield", Logic.noRating(p) ? "—" : String(format: "%.1f", Logic.trustScore(p)), "可信分數 ⓘ") { scoreInfo = true }
                        stat("coins", Logic.priceText(p), Logic.priceBounds(p) == nil ? "每人均消" : "每人均消 · \(Logic.priceLevel(Logic.price(p)))")
                        stat("sneaker", Logic.fmtDist(km), "走路 \(Logic.walkMin(km)) 分")
                    }

                    if Logic.lowConfidence(p) {
                        Label("只有 \(p.reviews) 則評論，評分參考價值低，推薦模式會隱藏這家。", systemImage: "exclamationmark.triangle")
                            .font(.caption).foregroundStyle(Theme.amber).padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading).background(Theme.sand, in: RoundedRectangle(cornerRadius: 12))
                    }

                    HStack(spacing: 8) {
                        action("location.north.line.fill", "導航") { openURL(Logic.appleMapsURL(p)) }
                        action("phone.fill", "打電話") { if let u = Logic.telURL(p) { openURL(u) } }
                            .disabled(Logic.telURL(p) == nil)
                        action("person.3.fill", "加入投票") {
                            if !app.groupDraft.contains(p.id) { app.groupDraft.append(p.id) }
                            app.show("已加入揪團候選（\(app.groupDraft.count) 家）")
                        }
                        action("map.fill", "Google 地圖") { openURL(Logic.googlePlaceURL(p)) }
                    }

                    VStack(alignment: .leading, spacing: 0) {
                        Button { withAnimation { showHours.toggle() } } label: {
                            infoRow("clock", "營業時間", Logic.hoursText(p, day: today) + "（今天）", chevron: showHours ? "chevron.up" : "chevron.down")
                        }.buttonStyle(.plain)
                        if showHours {
                            VStack(spacing: 6) {
                                ForEach(0..<7, id: \.self) { d in
                                    HStack {
                                        Text("週" + ["日", "一", "二", "三", "四", "五", "六"][d])
                                        Spacer()
                                        Text(Logic.hoursText(p, day: d))
                                    }
                                    .font(.subheadline.weight(d == today ? .bold : .regular))
                                    .foregroundStyle(d == today ? Theme.indigo : Theme.ink2)
                                }
                            }
                            .padding(.leading, 44).padding(.bottom, 10)
                        }
                        Divider()
                        infoRow("mappin.and.ellipse", "地址", p.addr.isEmpty ? "未提供" : p.addr)
                            .contextMenu { Button("複製地址") { UIPasteboard.general.string = p.addr } }
                        if !p.phone.isEmpty {
                            Divider()
                            infoRow("phone", "電話", p.phone)
                                .contextMenu { Button("複製電話") { UIPasteboard.general.string = p.phone } }
                        }
                        if !p.tags.isEmpty {
                            Divider()
                            HStack(alignment: .top, spacing: 12) {
                                Image(systemName: "tag").frame(width: 32, height: 32).background(Theme.indigoSoft, in: Circle()).foregroundStyle(Theme.indigo)
                                Flow { ForEach(p.tags, id: \.self) { Text(Tags.name($0)).font(.caption).padding(.horizontal, 10).padding(.vertical, 5).background(Theme.sand, in: Capsule()) } }
                            }
                            .padding(.vertical, 10)
                        }
                    }
                    .card(12)

                    SectionHead(title: "位置")
                    MiniMap(place: p)

                    Button { openURL(Logic.googlePlaceURL(p)) } label: {
                        HStack {
                            Image(systemName: "star.bubble.fill").foregroundStyle(Theme.amber)
                            VStack(alignment: .leading) {
                                Text("看 Google 地圖上的評論").font(.subheadline.bold())
                                Text("這家是你在 Google 地圖收藏的店").font(.caption).foregroundStyle(Theme.ink3)
                            }
                            Spacer()
                            Image(systemName: "arrow.up.right.square").foregroundStyle(Theme.ink3)
                        }
                        .card(14)
                    }
                    .buttonStyle(.plain)

                    VStack(spacing: 8) {
                        if eaten > 0 { Text("你來吃過 \(eaten) 次").font(.caption).foregroundStyle(Theme.ink3) }
                        Button { app.toggleBlocked(p.id) } label: {
                            Label(app.isBlocked(p.id) ? "移出「不想再去」" : "不想再去", systemImage: "nosign")
                        }
                        .font(.subheadline).foregroundStyle(Theme.ink2)
                    }
                    .frame(maxWidth: .infinity)
                }
                .padding(.horizontal, 18)
            }
            .padding(.bottom, 90)
        }
        .background(Theme.beige)
        .ignoresSafeArea(edges: .top)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                if app.isAdmin {
                    Button { editing = true } label: { Image(systemName: "square.and.pencil") }
                }
                Button { app.toggleFav(p.id) } label: {
                    Image(systemName: app.isFav(p.id) ? "heart.fill" : "heart").foregroundStyle(app.isFav(p.id) ? Theme.red : Theme.ink)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
        .safeAreaInset(edge: .bottom) {
            HStack(spacing: 12) {
                ScoreBadge(place: p)
                Button { decided = true } label: { Label("就吃這家", systemImage: "chevron.right") }.buttonStyle(PrimaryButton())
            }
            .padding(.horizontal, 18).padding(.vertical, 10)
            .background(.ultraThinMaterial)
        }
        .sheet(isPresented: $decided) { DecisionSheet(place: p).environmentObject(app) }
        .sheet(isPresented: $scoreInfo) { ScoreInfo(place: p).presentationDetents([.medium]) }
        .sheet(isPresented: $editing) { NavigationStack { PlaceEditor(original: p) }.environmentObject(app) }
    }

    func stat(_ art: String, _ value: String, _ label: String, tap: (() -> Void)? = nil) -> some View {
        Button { tap?() } label: {
            VStack(spacing: 4) {
                Art(name: art, size: 32)
                Text(value).font(.subheadline.bold()).foregroundStyle(Theme.ink).lineLimit(1).minimumScaleFactor(0.7)
                Text(label).font(.caption2).foregroundStyle(Theme.ink3).lineLimit(1).minimumScaleFactor(0.7)
            }
            .frame(maxWidth: .infinity).card(10)
        }
        .buttonStyle(.plain).disabled(tap == nil)
    }

    func action(_ icon: String, _ label: String, _ run: @escaping () -> Void) -> some View {
        Button(action: run) {
            VStack(spacing: 6) {
                Image(systemName: icon).font(.title3).frame(width: 48, height: 48)
                    .background(Theme.indigoSoft, in: Circle()).foregroundStyle(Theme.indigo)
                Text(label).font(.caption).foregroundStyle(Theme.ink2)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }

    func infoRow(_ icon: String, _ title: String, _ value: String, chevron: String? = nil) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon).frame(width: 32, height: 32).background(Theme.indigoSoft, in: Circle()).foregroundStyle(Theme.indigo)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline.bold())
                Text(value).font(.caption).foregroundStyle(Theme.ink2)
            }
            Spacer()
            if let chevron { Image(systemName: chevron).foregroundStyle(Theme.ink3) }
        }
        .padding(.vertical, 10)
        .contentShape(Rectangle())
    }
}

struct ScoreInfo: View {
    let place: Place
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("什麼是可信分數？").font(.title3.bold())
            Text("評論很少的店，評分很容易被親友灌高。可信分數會把評分往大家的平均值拉，評論越少拉得越多。").foregroundStyle(Theme.ink2)
            HStack {
                cell("原始評分", String(format: "%.1f", place.rating), false)
                cell("評論數", "\(place.reviews)", false)
                cell("可信分數", String(format: "%.1f", Logic.trustScore(place)), true)
            }
            Text("推薦模式會隱藏評論少於 30 則的店。").font(.caption).foregroundStyle(Theme.ink3)
            Spacer()
        }
        .padding(24)
        .background(Theme.beige)
    }

    func cell(_ t: String, _ v: String, _ hl: Bool) -> some View {
        VStack(spacing: 4) {
            Text(t).font(.caption).foregroundStyle(hl ? .white.opacity(0.8) : Theme.ink3)
            Text(v).font(.title2.bold()).foregroundStyle(hl ? .white : Theme.ink)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 12)
        .background(hl ? Theme.indigo : Theme.paper, in: RoundedRectangle(cornerRadius: 14))
    }
}
