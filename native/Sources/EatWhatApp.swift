import SwiftUI

@main
struct EatWhatApp: App {
    @StateObject private var app = AppModel()
    @Environment(\.scenePhase) private var phase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(app)
                .tint(Theme.indigo)
                .preferredColorScheme(.light)
                .task { await app.refresh() }
                .onChange(of: phase) { _, p in
                    // 回到前景：讀最新店家資料、更新位置
                    if p == .active {
                        Task { await app.refresh() }
                        if app.prefs.onboarded { app.location.request() }
                    }
                }
        }
    }
}

struct RootView: View {
    @EnvironmentObject var app: AppModel

    var body: some View {
        TabView(selection: $app.tab) {
            NavigationStack { DecideView().withDetail() }
                .tabItem { Label("決定", systemImage: "dice") }.tag(AppModel.Tab.decide)
            NavigationStack { ExploreView().withDetail() }
                .tabItem { Label("探索", systemImage: "safari") }.tag(AppModel.Tab.explore)
            NavigationStack { GroupView().withDetail() }
                .tabItem { Label("揪團", systemImage: "person.3") }.tag(AppModel.Tab.group)
            NavigationStack { SwipeView() }
                .tabItem { Label("滑卡", systemImage: "rectangle.stack") }.tag(AppModel.Tab.swipe)
            NavigationStack { MeView().withDetail() }
                .tabItem { Label("我的", systemImage: "person.crop.circle") }.tag(AppModel.Tab.me)
        }
        .overlay(alignment: .top) {
            if let t = app.toast {
                ToastView(text: t).padding(.top, 8).transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.spring(duration: 0.3), value: app.toast)
        .fullScreenCover(isPresented: Binding(get: { !app.prefs.onboarded }, set: { _ in })) {
            WelcomeView().environmentObject(app)
        }
        .onAppear {
            Debug.apply(app)
            if app.prefs.onboarded { app.location.request() }
        }
    }
}

extension View {
    /** 店家頁的導覽目的地（NavigationLink(value: 店家 id)） */
    func withDetail() -> some View {
        navigationDestination(for: String.self) { id in DetailView(id: id) }
    }
}

struct WelcomeView: View {
    @EnvironmentObject var app: AppModel
    @State private var name = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                ZStack(alignment: .top) {
                    if let img = ArtCache.scene("spread") {
                        Image(uiImage: img).resizable().scaledToFill().frame(height: 300).clipped()
                    }
                    Noren()
                }
                .frame(height: 300)

                VStack(alignment: .leading, spacing: 18) {
                    Text("吃什麼").font(.system(size: 34, weight: .heavy, design: .serif)).foregroundStyle(Theme.indigo)
                    Text("午餐吃什麼？\n交給我就好。").font(.title2.bold()).foregroundStyle(Theme.ink)
                    VStack(alignment: .leading, spacing: 14) {
                        feature("dice", "一鍵抽 5 家", "設好預算和距離，剩下交給骰子")
                        feature("ballot", "揪團投票", "手機傳一圈，大家各投各的")
                        feature("shield", "可信分數", "評論太少的高分店，不會騙到你")
                    }
                    TextField("你的暱稱", text: $name)
                        .padding(14)
                        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 14))
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.line))
                    Button {
                        app.prefs.nickname = String(name.trimmingCharacters(in: .whitespaces).prefix(12))
                        app.prefs.onboarded = true
                        // 按「開始使用」才跟系統要定位權限
                        app.location.request()
                    } label: {
                        Label("開始使用", systemImage: "chevron.right")
                    }
                    .buttonStyle(PrimaryButton())
                    Text("台北・東京餐廳資料庫，持續更新中").font(.caption).foregroundStyle(Theme.ink3).frame(maxWidth: .infinity)
                }
                .padding(24)
                .background(Theme.beige)
            }
        }
        .background(Theme.beige.ignoresSafeArea())
        .ignoresSafeArea(edges: .top)
    }

    func feature(_ art: String, _ title: String, _ sub: String) -> some View {
        HStack(spacing: 14) {
            Art(name: art, size: 44)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.headline).foregroundStyle(Theme.ink)
                Text(sub).font(.subheadline).foregroundStyle(Theme.ink2)
            }
        }
    }
}

/** CI 截圖用：啟動參數 -screen decide|explore|map|group|swipe|me|detail|admin 直接打開某一頁 */
enum Debug {
    static var screen: String? {
        let a = ProcessInfo.processInfo.arguments
        guard let i = a.firstIndex(of: "-screen"), i + 1 < a.count else { return nil }
        return a[i + 1]
    }

    @MainActor static func apply(_ app: AppModel) {
        guard let s = screen else { return }
        app.prefs.onboarded = s != "welcome"
        switch s {
        case "explore", "map": app.tab = .explore
        case "group": app.tab = .group
        case "swipe": app.tab = .swipe
        case "me", "admin": app.tab = .me
        default: app.tab = .decide
        }
    }
}
