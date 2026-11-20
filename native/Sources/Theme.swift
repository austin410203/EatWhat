import SwiftUI
import UIKit

// 設計：食堂風——深藍門簾色＋米色紙底（和 App 圖示同一組顏色）。

enum Theme {
    static let indigo = Color(red: 0.122, green: 0.227, blue: 0.373)      // #1F3A5F
    static let indigoDeep = Color(red: 0.086, green: 0.165, blue: 0.282)  // #162A48
    static let indigoSoft = Color(red: 0.867, green: 0.894, blue: 0.929)  // #DDE4ED
    static let beige = Color(red: 0.965, green: 0.937, blue: 0.902)       // #F6EFE6 背景
    static let paper = Color(red: 1.0, green: 0.988, blue: 0.965)         // #FFFCF6 卡片
    static let sand = Color(red: 0.937, green: 0.894, blue: 0.812)        // #EFE4CF
    static let wood = Color(red: 0.776, green: 0.635, blue: 0.443)        // #C6A271 木頭色點綴
    static let ink = Color(red: 0.122, green: 0.118, blue: 0.106)
    static let ink2 = Color(red: 0.42, green: 0.40, blue: 0.37)
    static let ink3 = Color(red: 0.64, green: 0.61, blue: 0.56)
    static let line = Color(red: 0.90, green: 0.86, blue: 0.80)
    static let green = Color(red: 0.16, green: 0.55, blue: 0.38)
    static let amber = Color(red: 0.80, green: 0.55, blue: 0.10)
    static let red = Color(red: 0.75, green: 0.27, blue: 0.24)
    static let tabelog = Color(red: 0.71, green: 0.33, blue: 0.11)     // 食べログ橘

    static func scoreColor(_ p: Place) -> Color {
        if Logic.noRating(p) { return ink3 }
        if Logic.lowConfidence(p) { return amber }
        let s = Logic.trustScore(p)
        return s >= 4.3 ? green : s >= 3.9 ? indigo : ink3
    }
}

extension View {
    func card(_ pad: CGFloat = 16) -> some View {
        padding(pad)
            .background(Theme.paper, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(Theme.line, lineWidth: 1))
    }
}

// MARK: 按鈕

struct PrimaryButton: ButtonStyle {
    var color = Theme.indigo
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(color, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .opacity(configuration.isPressed ? 0.85 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

struct SoftButton: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(Theme.indigo)
            .frame(maxWidth: .infinity, minHeight: 44)
            .background(Theme.indigoSoft, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .opacity(configuration.isPressed ? 0.75 : 1)
    }
}

struct Chip: View {
    let text: String
    var on = false
    var icon: String? = nil
    var action: () -> Void = {}
    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if let icon { Image(systemName: icon).font(.caption) }
                Text(text).font(.subheadline.weight(on ? .semibold : .regular))
            }
            .padding(.horizontal, 12).padding(.vertical, 7)
            .foregroundStyle(on ? .white : Theme.ink)
            .background(on ? Theme.indigo : Theme.paper, in: Capsule())
            .overlay(Capsule().stroke(on ? Theme.indigo : Theme.line, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

struct SectionHead: View {
    let title: String
    var sub: String? = nil
    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title).font(.title3.bold()).foregroundStyle(Theme.ink)
            Spacer()
            if let sub { Text(sub).font(.caption).foregroundStyle(Theme.ink3) }
        }
    }
}

// MARK: 圖片

/** 料理插圖（Resources/Art/icons 的 webp，ChatGPT 生成的 3D 黏土風圖示） */
struct Art: View {
    let name: String
    var size: CGFloat = 40
    var body: some View {
        if let img = ArtCache.icon(name) {
            Image(uiImage: img).resizable().scaledToFit().frame(width: size, height: size)
        } else {
            Image(systemName: "fork.knife").frame(width: size, height: size).foregroundStyle(Theme.ink3)
        }
    }
}

enum ArtCache {
    private static var icons: [String: UIImage] = [:]
    static func icon(_ name: String) -> UIImage? {
        if let i = icons[name] { return i }
        guard let url = Bundle.main.url(forResource: name, withExtension: "webp", subdirectory: "Art/icons"),
              let img = UIImage(contentsOfFile: url.path) else { return nil }
        icons[name] = img
        return img
    }

    /** 東京店家用的日式示意照（jp-<料理>-1/2.jpg，_art/prompts_tokyo.py） */
    static let jpPhotos: Set<String> = ["sushi", "ramen", "bbq", "japanese", "izakaya", "cafe", "dessert", "bar", "bakery", "finedining"]

    /** 每種料理兩張示意照片，依店家 id 輪流；東京的店有日式版就用日式版 */
    static func cuisinePhoto(_ cuisine: String, seed: String = "", city: String = "taipei") -> UIImage? {
        var h: UInt32 = 0
        for u in seed.unicodeScalars { h = h &* 31 &+ u.value }
        let n = h % 2 == 0 ? 1 : 2
        let jp = city == "tokyo" && jpPhotos.contains(cuisine)
        for name in (jp ? ["jp-\(cuisine)-\(n)"] : []) + ["\(cuisine)-\(n)", "\(cuisine)-1", "taiwanese-1"] {
            if let url = Bundle.main.url(forResource: name, withExtension: "jpg", subdirectory: "Art/photos"),
               let img = UIImage(contentsOfFile: url.path) { return img }
        }
        return nil
    }

    static func scene(_ name: String) -> UIImage? {
        Bundle.main.url(forResource: name, withExtension: "jpg", subdirectory: "Art/photos").flatMap { UIImage(contentsOfFile: $0.path) }
    }

    /** 東京區域封面（Art/areas/<區域代碼>.jpg） */
    static func area(_ code: String) -> UIImage? {
        Bundle.main.url(forResource: code, withExtension: "jpg", subdirectory: "Art/areas").flatMap { UIImage(contentsOfFile: $0.path) }
    }

    /** Google 照片署名（拍攝者） */
    static let credits: [String: String] = {
        guard let url = Bundle.main.url(forResource: "place_photos", withExtension: "json"),
              let d = try? Data(contentsOf: url),
              let j = try? JSONSerialization.jsonObject(with: d) as? [String: [String: String]] else { return [:] }
        return j.compactMapValues { $0["author"] }
    }()

    /** 店家照片：後台上傳的優先，再來是 2026-10-31 存下來的 Google 照片 */
    static func photoURL(_ p: Place) -> URL? {
        if let v = p.photo { return URL(string: "\(API.base.absoluteString)/api/photo/\(p.id)?v=\(Int64(v))") }
        if credits[p.id] != nil { return URL(string: "\(API.base.absoluteString)/img/places/\(p.id).jpg") }
        return nil
    }
}

/** 遠端圖片：記憶體＋磁碟快取，讀不到就用料理示意圖 */
@MainActor
final class ImageStore {
    static let shared = ImageStore()
    private let mem = NSCache<NSURL, UIImage>()
    private let session: URLSession = {
        let c = URLSessionConfiguration.default
        c.urlCache = URLCache(memoryCapacity: 20 << 20, diskCapacity: 300 << 20)
        c.requestCachePolicy = .returnCacheDataElseLoad
        return URLSession(configuration: c)
    }()

    func cached(_ url: URL) -> UIImage? { mem.object(forKey: url as NSURL) }

    func load(_ url: URL) async -> UIImage? {
        if let i = cached(url) { return i }
        guard let r = try? await session.data(from: url),
              (r.1 as? HTTPURLResponse)?.statusCode == 200,
              let img = UIImage(data: r.0) else { return nil }
        mem.setObject(img, forKey: url as NSURL)
        return img
    }
}

struct PlacePhoto: View {
    let place: Place
    var height: CGFloat = 180
    var corner: CGFloat = 18
    var credit = false
    @State private var img: UIImage?

    var body: some View {
        let url = ArtCache.photoURL(place)
        Color.clear
            .frame(height: height)
            .frame(maxWidth: .infinity)
            .overlay {
                if let ui = img ?? url.flatMap({ ImageStore.shared.cached($0) }) ?? ArtCache.cuisinePhoto(place.cuisine, seed: place.id, city: place.city) {
                    Image(uiImage: ui).resizable().scaledToFill()
                } else {
                    Theme.sand
                }
            }
            .overlay(alignment: .bottomTrailing) {
                if credit, height >= 120, place.photo == nil, img != nil, let a = ArtCache.credits[place.id] {
                    Text("\(a) · Google Maps")
                        .font(.system(size: 9)).foregroundStyle(.white.opacity(0.85))
                        .padding(.horizontal, 6).padding(.vertical, 3)
                        .background(.black.opacity(0.35), in: Capsule())
                        .padding(8)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: corner, style: .continuous))
            .task(id: url) {
                guard let url else { return }
                img = await ImageStore.shared.load(url)
            }
    }
}

// MARK: 店家小元件

struct ScoreBadge: View {
    let place: Place
    var body: some View {
        HStack(spacing: 3) {
            Image(systemName: Logic.lowConfidence(place) ? "exclamationmark.triangle.fill" : "star.fill").font(.caption2)
            Text(Logic.noRating(place) ? "—" : String(format: "%.1f", Logic.trustScore(place))).font(.subheadline.bold())
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 8).padding(.vertical, 4)
        .background(Theme.scoreColor(place), in: Capsule())
    }
}

struct OpenText: View {
    let place: Place
    var body: some View {
        let s = Logic.openStatus(place)
        HStack(spacing: 5) {
            Circle().fill(s.unknown ? Theme.ink3 : s.open ? (s.closingSoon ? Theme.amber : Theme.green) : Theme.red).frame(width: 7, height: 7)
            Text(s.unknown ? s.text : s.open ? (s.closingSoon ? "快打烊 · " : "營業中 · ") + s.text : "休息中 · " + s.text)
                .font(.caption).foregroundStyle(Theme.ink2)
        }
    }
}

struct Stars: View {
    let v: Double
    var size: CGFloat = 12
    var body: some View {
        HStack(spacing: 1) {
            ForEach(0..<5) { i in
                Image(systemName: v >= Double(i) + 0.75 ? "star.fill" : v >= Double(i) + 0.25 ? "star.leadinghalf.filled" : "star")
                    .font(.system(size: size)).foregroundStyle(Theme.amber)
            }
        }
    }
}

struct PlaceRow: View {
    @EnvironmentObject var app: AppModel
    let place: Place
    var trailing: AnyView? = nil
    var body: some View {
        NavigationLink(value: place.id) {
            HStack(spacing: 12) {
                PlacePhoto(place: place, height: 76, corner: 14).frame(width: 76)
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(place.name).font(.headline).foregroundStyle(Theme.ink).lineLimit(1)
                        if app.isFav(place.id) { Image(systemName: "heart.fill").font(.caption).foregroundStyle(Theme.red) }
                    }
                    HStack(spacing: 6) {
                        Art(name: place.cuisine, size: 16)
                        Text("\(place.cuisineInfo.name) · \(Logic.priceText(place)) · \(Logic.fmtDist(app.dist(place)))")
                            .font(.caption).foregroundStyle(Theme.ink2).lineLimit(1)
                    }
                    if place.isTabelog {
                        Text("食べログ \(String(format: "%.2f", place.rating))\(place.areaName.map { " · " + ($0.components(separatedBy: "（").first ?? $0) } ?? "")")
                            .font(.caption2.weight(.semibold)).foregroundStyle(Theme.tabelog).lineLimit(1)
                    }
                    OpenText(place: place)
                }
                Spacer(minLength: 4)
                if let trailing { trailing } else { ScoreBadge(place: place) }
            }
            .padding(10)
            .background(Theme.paper, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Theme.line, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

struct EmptyNote: View {
    let art: String
    let text: String
    var body: some View {
        VStack(spacing: 10) {
            Art(name: art, size: 72)
            Text(text).font(.subheadline).foregroundStyle(Theme.ink2).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 28)
    }
}

struct ToastView: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.subheadline.weight(.semibold)).foregroundStyle(.white)
            .padding(.horizontal, 16).padding(.vertical, 10)
            .background(Theme.indigoDeep.opacity(0.95), in: Capsule())
            .shadow(color: .black.opacity(0.15), radius: 10, y: 4)
    }
}

/** 門簾裝飾：頁首上方的深藍布條，兩道開衩 */
struct Noren: View {
    var body: some View {
        GeometryReader { g in
            let w = g.size.width
            Path { p in
                p.addRect(CGRect(x: 0, y: 0, width: w, height: 10))
                for i in 0..<3 {
                    let x0 = CGFloat(i) * w / 3 + (i == 0 ? 0 : 3), x1 = CGFloat(i + 1) * w / 3 - (i == 2 ? 0 : 3)
                    p.addRoundedRect(in: CGRect(x: x0, y: 0, width: x1 - x0, height: 26), cornerSize: CGSize(width: 6, height: 6))
                }
            }
            .fill(Theme.indigo)
        }
        .frame(height: 26)
    }
}
