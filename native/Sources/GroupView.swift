import SwiftUI

// 揪團投票：同一支手機輪流傳給每個人投票（😋 想吃 +2、🙂 可以 +1、🙅 不要 −2），最後計票。
// 網頁版的連結投票只在同一個瀏覽器有效，原生版改成面對面傳手機，不需要伺服器。

struct GroupView: View {
    @EnvironmentObject var app: AppModel
    enum Stage { case setup, handoff(Int), voting(Int), result }
    @State private var stage = Stage.setup
    @State private var players: [String] = []
    @State private var newName = ""
    @State private var votes: [[String: Int]] = []
    @State private var q = ""
    @State private var chosen: Place?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("揪團投票").font(.system(size: 28, weight: .heavy, design: .serif))
                    Text("手機傳一圈，30 秒決定").font(.subheadline).foregroundStyle(Theme.ink2)
                }
                switch stage {
                case .setup: setup
                case .handoff(let i): handoff(i)
                case .voting(let i): voting(i)
                case .result: result
                }
            }
            .padding(.horizontal, 18).padding(.bottom, 24)
        }
        .background(Theme.beige)
        .toolbar(.hidden, for: .navigationBar)
        .sheet(item: $chosen) { p in DecisionSheet(place: p).environmentObject(app) }
        .onAppear { if players.isEmpty { players = [app.prefs.nickname.isEmpty ? "我" : app.prefs.nickname] } }
    }

    var candidates: [Place] { app.groupDraft.compactMap { app.place($0) } }

    // MARK: 設定

    var setup: some View {
        VStack(alignment: .leading, spacing: 16) {
            ZStack(alignment: .bottomLeading) {
                if let img = ArtCache.scene("friends") {
                    Image(uiImage: img).resizable().scaledToFill().frame(height: 140).clipped()
                }
                LinearGradient(colors: [.clear, Theme.indigoDeep.opacity(0.85)], startPoint: .top, endPoint: .bottom)
                HStack {
                    VStack(alignment: .leading) {
                        Text("一群人也能快速決定").font(.headline)
                        Text("挑 2–6 家，大家輪流投").font(.caption)
                    }
                    .foregroundStyle(.white)
                    Spacer()
                    Art(name: "ballot", size: 64)
                }
                .padding(14)
            }
            .frame(height: 140)
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("候選餐廳（\(candidates.count)/6）").font(.headline)
                    Spacer()
                    Button("幫我挑") { autoPick() }.font(.subheadline.bold())
                }
                ForEach(candidates) { p in
                    PlaceRow(place: p, trailing: AnyView(
                        Button { app.groupDraft.removeAll { $0 == p.id } } label: {
                            Image(systemName: "minus.circle.fill").font(.title3).foregroundStyle(Theme.red)
                        }.buttonStyle(.plain)))
                }
                if candidates.isEmpty {
                    Text("按「幫我挑」從目前條件抽 4 家，或搜尋店名加入；店家頁的「加入投票」也會加到這裡。")
                        .font(.caption).foregroundStyle(Theme.ink3)
                }
                HStack {
                    Image(systemName: "magnifyingglass").foregroundStyle(Theme.ink3)
                    TextField("搜尋店名加入", text: $q)
                }
                .padding(10).background(Theme.paper, in: RoundedRectangle(cornerRadius: 12)).overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.line))
                ForEach(searchResults) { p in
                    Button {
                        if candidates.count < 6 && !app.groupDraft.contains(p.id) { app.groupDraft.append(p.id) }
                        q = ""
                    } label: {
                        HStack { Art(name: p.cuisine, size: 22); Text(p.name).lineLimit(1); Spacer(); Image(systemName: "plus.circle").foregroundStyle(Theme.indigo) }
                            .font(.subheadline).padding(.vertical, 4)
                    }
                    .buttonStyle(.plain)
                }
            }
            .card()

            VStack(alignment: .leading, spacing: 10) {
                Text("誰要投票（\(players.count) 人）").font(.headline)
                Flow {
                    ForEach(Array(players.enumerated()), id: \.offset) { i, n in
                        HStack(spacing: 4) {
                            Text(avatar(i)); Text(n)
                            if players.count > 1 {
                                Button { players.remove(at: i) } label: { Image(systemName: "xmark").font(.caption2) }.buttonStyle(.plain)
                            }
                        }
                        .font(.subheadline).padding(.horizontal, 10).padding(.vertical, 6).background(Theme.sand, in: Capsule())
                    }
                }
                HStack {
                    TextField("朋友的名字", text: $newName).onSubmit(addPlayer)
                        .padding(10).background(Theme.paper, in: RoundedRectangle(cornerRadius: 12)).overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.line))
                    Button("加入", action: addPlayer).disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .card()

            Button {
                votes = Array(repeating: [:], count: players.count)
                withAnimation { stage = .handoff(0) }
            } label: { Label("開始投票", systemImage: "hand.raised.fill") }
                .buttonStyle(PrimaryButton())
                .disabled(candidates.count < 2 || players.isEmpty)
                .opacity(candidates.count < 2 ? 0.5 : 1)
        }
    }

    var searchResults: [Place] {
        let k = q.trimmingCharacters(in: .whitespaces).lowercased()
        guard !k.isEmpty else { return [] }
        return Array(app.places.filter { $0.name.lowercased().contains(k) || $0.cuisineInfo.name.contains(k) }.prefix(6))
    }

    func addPlayer() {
        let n = String(newName.trimmingCharacters(in: .whitespaces).prefix(10))
        guard !n.isEmpty, players.count < 12 else { return }
        players.append(n); newName = ""
    }

    func autoPick() {
        let want = max(0, 4 - candidates.count)
        let got = Logic.pick(want, from: app.filtered, prefs: app.prefs, at: app.here, exclude: Set(app.groupDraft))
        if got.isEmpty { app.show("目前條件下沒有店可以挑，去「決定」放寬條件") }
        app.groupDraft = Array((app.groupDraft + got.map(\.id)).prefix(6))
    }

    func avatar(_ i: Int) -> String { ["🍙", "🐻", "🐼", "🦊", "🐱", "🐶", "🐰", "🐸", "🐨", "🐯", "🐧", "🐹"][i % 12] }

    // MARK: 投票

    func handoff(_ i: Int) -> some View {
        VStack(spacing: 18) {
            Text(avatar(i)).font(.system(size: 80))
            Text("把手機交給").foregroundStyle(Theme.ink2)
            Text(players[i]).font(.system(size: 34, weight: .heavy, design: .serif)).foregroundStyle(Theme.indigo)
            Text("其他人別偷看喔").font(.caption).foregroundStyle(Theme.ink3)
            Button("我是\(players[i])，開始投") { withAnimation { stage = .voting(i) } }.buttonStyle(PrimaryButton())
            Button("取消投票") { stage = .setup }.font(.subheadline).foregroundStyle(Theme.ink3)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 30).card()
    }

    func voting(_ i: Int) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("\(avatar(i)) \(players[i]) 的票").font(.headline)
            ForEach(candidates) { p in
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 10) {
                        PlacePhoto(place: p, height: 56, corner: 12).frame(width: 56)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(p.name).font(.subheadline.bold()).lineLimit(1)
                            Text("\(p.cuisineInfo.name) · \(Logic.priceText(p)) · \(Logic.fmtDist(app.dist(p)))").font(.caption).foregroundStyle(Theme.ink2).lineLimit(1)
                        }
                    }
                    HStack(spacing: 8) {
                        voteButton(i, p.id, 2, "😋 想吃")
                        voteButton(i, p.id, 1, "🙂 可以")
                        voteButton(i, p.id, -2, "🙅 不要")
                    }
                }
                .card(12)
            }
            let done = candidates.allSatisfy { votes[i][$0.id] != nil }
            Button(i + 1 < players.count ? "投好了，交給下一位" : "投好了，看結果") {
                withAnimation { stage = i + 1 < players.count ? .handoff(i + 1) : .result }
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            }
            .buttonStyle(PrimaryButton())
            .disabled(!done).opacity(done ? 1 : 0.5)
        }
    }

    func voteButton(_ i: Int, _ id: String, _ v: Int, _ label: String) -> some View {
        let on = votes[i][id] == v
        return Button { votes[i][id] = v; UISelectionFeedbackGenerator().selectionChanged() } label: {
            Text(label).font(.subheadline.weight(on ? .bold : .regular))
                .frame(maxWidth: .infinity, minHeight: 38)
                .foregroundStyle(on ? .white : Theme.ink)
                .background(on ? (v < 0 ? Theme.red : Theme.indigo) : Theme.beige, in: RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
    }

    // MARK: 結果

    struct Tally { let place: Place; let yes: Int; let ok: Int; let no: Int; var score: Int { yes * 2 + ok - no * 2 } }

    var tallies: [Tally] {
        candidates.map { p in
            let vs = votes.compactMap { $0[p.id] }
            return Tally(place: p, yes: vs.filter { $0 == 2 }.count, ok: vs.filter { $0 == 1 }.count, no: vs.filter { $0 == -2 }.count)
        }
        .sorted { ($0.score, $0.yes, -$0.no) > ($1.score, $1.yes, -$1.no) }
    }

    var result: some View {
        let t = tallies
        let ties = t.filter { $0.score == t.first?.score && $0.yes == t.first?.yes && $0.no == t.first?.no }
        return VStack(alignment: .leading, spacing: 14) {
            if let w = t.first {
                VStack(spacing: 10) {
                    Art(name: "trophy", size: 72)
                    Text(ties.count > 1 ? "平手！\(ties.count) 家同分" : "大家最想吃").foregroundStyle(Theme.ink2)
                    Text(ties.count > 1 ? ties.map(\.place.name).joined(separator: "、") : w.place.name)
                        .font(.title2.bold()).multilineTextAlignment(.center)
                    if ties.count > 1 {
                        Button { chosen = ties.randomElement()?.place } label: { Label("抽籤決定", systemImage: "dice.fill") }.buttonStyle(PrimaryButton())
                    } else {
                        Button { chosen = w.place } label: { Label("就吃這家", systemImage: "chevron.right") }.buttonStyle(PrimaryButton())
                    }
                }
                .frame(maxWidth: .infinity).card()
            }
            ForEach(Array(t.enumerated()), id: \.element.place.id) { i, x in
                HStack {
                    Text("\(i + 1)").font(.headline.monospacedDigit()).frame(width: 24)
                    Text(x.place.name).font(.subheadline.bold()).lineLimit(1)
                    Spacer()
                    Text("😋\(x.yes) 🙂\(x.ok) 🙅\(x.no)").font(.caption)
                    Text("\(x.score) 分").font(.caption.bold()).foregroundStyle(Theme.indigo).frame(width: 40, alignment: .trailing)
                }
                .card(12)
            }
            HStack(spacing: 10) {
                Button("重新投票") {
                    votes = Array(repeating: [:], count: players.count)
                    withAnimation { stage = .handoff(0) }
                }.buttonStyle(SoftButton())
                Button("換一批候選") {
                    app.groupDraft = []
                    withAnimation { stage = .setup }
                }.buttonStyle(SoftButton())
            }
        }
    }
}
