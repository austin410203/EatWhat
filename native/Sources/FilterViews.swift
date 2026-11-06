import SwiftUI

/** 自動換行的排列（篩選籤） */
struct Flow: Layout {
    var spacing: CGFloat = 8
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let w = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, row: CGFloat = 0, maxX: CGFloat = 0
        for s in subviews {
            let sz = s.sizeThatFits(.unspecified)
            if x > 0 && x + sz.width > w { x = 0; y += row + spacing; row = 0 }
            x += sz.width + spacing; row = max(row, sz.height); maxX = max(maxX, x)
        }
        return CGSize(width: min(maxX, w), height: y + row)
    }
    func placeSubviews(in b: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = b.minX, y = b.minY, row: CGFloat = 0
        for s in subviews {
            let sz = s.sizeThatFits(.unspecified)
            if x > b.minX && x + sz.width > b.maxX { x = b.minX; y += row + spacing; row = 0 }
            s.place(at: CGPoint(x: x, y: y), proposal: .unspecified)
            x += sz.width + spacing; row = max(row, sz.height)
        }
    }
}

enum FilterText {
    static func budget(_ f: Filters) -> String {
        switch (f.budgetMin > 0, f.budget < 1500) {
        case (false, false): return "預算不限"
        case (false, true): return "NT$\(f.budget) 以內"
        case (true, false): return "NT$\(f.budgetMin) 以上"
        case (true, true): return "NT$\(f.budgetMin)–\(f.budget)"
        }
    }
    static func distance(_ d: Double) -> String {
        d >= 99 ? "不限距離" : d < 1 ? "\(Int(d * 1000)) m" : (d == d.rounded() ? "\(Int(d)) km" : "\(d) km")
    }
}

/** 每人預算：上限＋下限兩組籤 */
struct BudgetPicker: View {
    @EnvironmentObject var app: AppModel
    static let maxes = [150, 200, 300, 500, 800, 1000, 1500]
    static let mins = [0, 200, 500, 1000]

    var body: some View {
        let f = app.prefs.filters
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("每人預算").font(.subheadline.weight(.semibold))
                Spacer()
                Text(FilterText.budget(f)).font(.subheadline.bold()).foregroundStyle(Theme.indigo)
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    Text("最高").font(.caption).foregroundStyle(Theme.ink3)
                    ForEach(Self.maxes, id: \.self) { v in
                        Chip(text: v >= 1500 ? "不限" : "\(v)", on: f.budget == v) {
                            app.prefs.filters.budget = v
                            if app.prefs.filters.budgetMin >= v && v < 1500 { app.prefs.filters.budgetMin = 0 }
                        }
                    }
                }
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    Text("最低").font(.caption).foregroundStyle(Theme.ink3)
                    ForEach(Self.mins, id: \.self) { v in
                        Chip(text: v == 0 ? "不限" : "\(v)", on: f.budgetMin == v) {
                            app.prefs.filters.budgetMin = v
                            if v >= app.prefs.filters.budget { app.prefs.filters.budget = 1500 }
                        }
                    }
                }
            }
        }
    }
}

struct DistanceChips: View {
    @EnvironmentObject var app: AppModel
    static let options = [0.5, 1, 1.5, 2, 3, 5, 99]
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(Self.options, id: \.self) { d in
                    Chip(text: d >= 99 ? "不限" : FilterText.distance(d), on: app.prefs.filters.distance == d) {
                        app.prefs.filters.distance = d
                    }
                }
            }
        }
    }
}

struct FilterSheet: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.dismiss) var dismiss
    var count: Int

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    BudgetPicker()
                    group("距離") { DistanceChips() }
                    group("想吃什麼") {
                        Flow {
                            Chip(text: "都可以", on: app.prefs.filters.cuisines.isEmpty) { app.prefs.filters.cuisines = [] }
                            ForEach(Cuisine.all) { c in
                                Chip(text: c.name, on: app.prefs.filters.cuisines.contains(c.key)) { toggle(&app.prefs.filters.cuisines, c.key) }
                            }
                        }
                    }
                    group("情境") {
                        Flow {
                            ForEach(Tags.all, id: \.0) { t in
                                Chip(text: t.1, on: app.prefs.filters.tags.contains(t.0)) { toggle(&app.prefs.filters.tags, t.0) }
                            }
                        }
                    }
                    group("可信分數至少") {
                        HStack(spacing: 6) {
                            ForEach([0, 3.5, 3.8, 4.0, 4.2], id: \.self) { s in
                                Chip(text: s == 0 ? "不限" : String(format: "%.1f", s), on: app.prefs.filters.minScore == s) { app.prefs.filters.minScore = s }
                            }
                        }
                    }
                    VStack(spacing: 0) {
                        Toggle("只看營業中", isOn: $app.prefs.filters.openNow).padding(.vertical, 8)
                        Divider()
                        Toggle(isOn: $app.prefs.filters.trusted) {
                            VStack(alignment: .leading) {
                                Text("推薦模式")
                                Text("排除評論太少、可能灌分的店").font(.caption).foregroundStyle(Theme.ink3)
                            }
                        }.padding(.vertical, 8)
                        Divider()
                        Toggle("避開 3 天內吃過的", isOn: $app.prefs.filters.avoidRecent).padding(.vertical, 8)
                    }
                    .card(12)
                    Button("重設條件") { app.prefs.filters = Filters() }.font(.subheadline)
                }
                .padding(20)
            }
            .background(Theme.beige)
            .navigationTitle("篩選條件").navigationBarTitleDisplayMode(.inline)
            .safeAreaInset(edge: .bottom) {
                Button("看 \(count) 家") { dismiss() }.buttonStyle(PrimaryButton()).padding(.horizontal, 20).padding(.bottom, 8)
            }
        }
    }

    func group<V: View>(_ title: String, @ViewBuilder _ v: () -> V) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.subheadline.weight(.semibold))
            v()
        }
    }
}

func toggle(_ list: inout [String], _ k: String) {
    if let i = list.firstIndex(of: k) { list.remove(at: i) } else { list.append(k) }
}
