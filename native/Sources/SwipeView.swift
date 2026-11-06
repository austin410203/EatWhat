import SwiftUI

/** 滑卡選口味：右滑想吃、左滑不想，口味分數會影響推薦 */
struct SwipeView: View {
    @EnvironmentObject var app: AppModel
    @State private var deck: [(Cuisine, String)] = SwipeView.newDeck()
    @State private var idx = 0
    @State private var drag: CGSize = .zero
    @State private var liked: [Cuisine] = []

    static func newDeck() -> [(Cuisine, String)] {
        Cuisine.all.shuffled().map { ($0, $0.dishes.randomElement() ?? "") }
    }

    var body: some View {
        VStack(spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("滑卡選口味").font(.system(size: 28, weight: .heavy, design: .serif))
                    Text(idx < deck.count ? "\(idx + 1) / \(deck.count)" : "完成！").font(.subheadline).foregroundStyle(Theme.ink2)
                }
                Spacer()
            }
            if idx < deck.count {
                Text("右滑想吃、左滑不想，推薦會越來越合你胃口").font(.caption).foregroundStyle(Theme.ink3)
                ZStack {
                    if idx + 1 < deck.count { card(deck[idx + 1]).scaleEffect(0.95).offset(y: 12) }
                    card(deck[idx])
                        .overlay(alignment: .topLeading) { stamp("想吃", Theme.green).opacity(Double(drag.width / 90)).padding(20) }
                        .overlay(alignment: .topTrailing) { stamp("不要", Theme.red).opacity(Double(-drag.width / 90)).padding(20) }
                        .offset(drag)
                        .rotationEffect(.degrees(Double(drag.width / 18)))
                        .gesture(
                            DragGesture()
                                .onChanged { drag = $0.translation }
                                .onEnded { v in
                                    if v.translation.width > 90 { decide(1) }
                                    else if v.translation.width < -90 { decide(-1) }
                                    else { withAnimation(.spring) { drag = .zero } }
                                })
                }
                .frame(maxHeight: .infinity)
                HStack(spacing: 28) {
                    round("xmark", Theme.red) { decide(-1) }
                    round("star.fill", Theme.amber, small: true) { decide(2) }
                    round("heart.fill", Theme.green) { decide(1) }
                }
                .padding(.bottom, 12)
            } else {
                done
                Spacer()
            }
        }
        .padding(.horizontal, 18)
        .background(Theme.beige)
        .toolbar(.hidden, for: .navigationBar)
    }

    func card(_ c: (Cuisine, String)) -> some View {
        ZStack(alignment: .bottomLeading) {
            if let img = ArtCache.cuisinePhoto(c.0.key) {
                Image(uiImage: img).resizable().scaledToFill()
            }
            LinearGradient(colors: [.clear, .black.opacity(0.7)], startPoint: .center, endPoint: .bottom)
            VStack(alignment: .leading, spacing: 4) {
                Art(name: c.0.key, size: 64)
                Text(c.0.name).font(.system(size: 30, weight: .heavy, design: .serif))
                Text(c.1).font(.headline)
                Text("每人約 NT$\(c.0.price.0)–\(c.0.price.1)").font(.caption)
            }
            .foregroundStyle(.white).padding(20)
        }
        .frame(maxWidth: .infinity).frame(height: 430)
        .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
        .shadow(color: .black.opacity(0.12), radius: 12, y: 6)
    }

    func stamp(_ t: String, _ c: Color) -> some View {
        Text(t).font(.title.bold()).foregroundStyle(c).padding(.horizontal, 12).padding(.vertical, 4)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(c, lineWidth: 3)).rotationEffect(.degrees(-12))
    }

    func round(_ icon: String, _ c: Color, small: Bool = false, _ run: @escaping () -> Void) -> some View {
        Button(action: run) {
            Image(systemName: icon).font(small ? .title3 : .title).foregroundStyle(c)
                .frame(width: small ? 54 : 68, height: small ? 54 : 68)
                .background(Theme.paper, in: Circle()).overlay(Circle().stroke(Theme.line))
                .shadow(color: .black.opacity(0.08), radius: 6, y: 3)
        }
        .buttonStyle(.plain)
    }

    func decide(_ v: Int) {
        guard idx < deck.count else { return }
        let c = deck[idx].0
        app.addTaste(c.key, v == 2 ? 2 : v)
        if v > 0 { liked.append(c) }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        withAnimation(.easeIn(duration: 0.22)) {
            drag = v == 2 ? CGSize(width: 0, height: -700) : CGSize(width: v > 0 ? 500 : -500, height: 0)
        }
        Task {
            try? await Task.sleep(for: .milliseconds(230))
            idx += 1
            drag = .zero
        }
    }

    var done: some View {
        VStack(spacing: 14) {
            Art(name: "heart", size: 84)
            Text("口味記下來了！").font(.title2.bold())
            if liked.isEmpty {
                Text("好像都不太想吃…那就交給骰子吧！").foregroundStyle(Theme.ink2)
            } else {
                Text("你最近想吃").foregroundStyle(Theme.ink2)
                Flow { ForEach(liked.prefix(8)) { c in HStack(spacing: 4) { Art(name: c.key, size: 20); Text(c.name) }.font(.caption).padding(.horizontal, 10).padding(.vertical, 5).background(Theme.sand, in: Capsule()) } }
            }
            Button { app.tab = .decide } label: { Label("用新口味幫我決定", systemImage: "dice.fill") }.buttonStyle(PrimaryButton())
            Button("再滑一輪") { deck = Self.newDeck(); idx = 0; liked = [] }.buttonStyle(SoftButton())
        }
        .card(20)
    }
}
