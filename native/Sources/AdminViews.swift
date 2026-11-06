import SwiftUI
import PhotosUI

// 後台：店家資料存在 Worker KV，改完所有裝置（網頁、App）下次開啟就會讀到，不用更新 App。

struct AdminLogin: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.dismiss) var dismiss
    @State private var pw = ""
    @State private var busy = false
    @State private var error = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("管理員登入").font(.title2.bold())
            Text("密碼只存在這支手機的鑰匙圈。").font(.caption).foregroundStyle(Theme.ink3)
            SecureField("管理員密碼", text: $pw)
                .textContentType(.password)
                .padding(12).background(Theme.paper, in: RoundedRectangle(cornerRadius: 12)).overlay(RoundedRectangle(cornerRadius: 12).stroke(error ? Theme.red : Theme.line))
            if error { Text("密碼不對").font(.caption).foregroundStyle(Theme.red) }
            Button {
                busy = true
                Task {
                    let ok = await app.login(pw)
                    busy = false
                    if ok { app.show("已登入管理員"); dismiss() } else { error = true }
                }
            } label: { Text(busy ? "確認中…" : "登入") }
                .buttonStyle(PrimaryButton())
                .disabled(pw.isEmpty || busy)
            Spacer()
        }
        .padding(24)
        .background(Theme.beige)
    }
}

struct AdminList: View {
    @EnvironmentObject var app: AppModel
    @State private var q = ""

    var body: some View {
        let k = q.trimmingCharacters(in: .whitespaces).lowercased()
        let list = app.places.reversed().filter { k.isEmpty || $0.name.lowercased().contains(k) || $0.addr.contains(k) }
        List {
            Section {
                NavigationLink { PlaceEditor(original: nil) } label: {
                    Label("新增餐廳", systemImage: "plus.circle.fill").foregroundStyle(Theme.indigo)
                }
            }
            Section("共 \(list.count) 家") {
                ForEach(list) { p in
                    NavigationLink { PlaceEditor(original: p) } label: {
                        HStack(spacing: 10) {
                            Art(name: p.cuisine, size: 28)
                            VStack(alignment: .leading, spacing: 2) {
                                HStack(spacing: 4) {
                                    Text(p.name).lineLimit(1)
                                    if p.id.hasPrefix("n") { Text("新增").font(.caption2.bold()).foregroundStyle(.white).padding(.horizontal, 5).background(Theme.green, in: Capsule()) }
                                }
                                Text("\(p.cuisineInfo.name) · \(Logic.priceText(p))").font(.caption).foregroundStyle(Theme.ink3)
                            }
                        }
                    }
                }
            }
        }
        .searchable(text: $q, prompt: "搜尋店名或地址")
        .navigationTitle("管理餐廳")
        .scrollContentBackground(.hidden)
        .background(Theme.beige)
    }
}

struct PlaceEditor: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.dismiss) var dismiss
    let original: Place?

    @State private var p = Place(id: "", name: "", cuisine: "taiwanese", lat: 0, lng: 0)
    @State private var coords = ""
    @State private var priceLo = ""
    @State private var priceHi = ""
    @State private var rating = ""
    @State private var reviews = ""
    @State private var days: [String] = Array(repeating: "", count: 7)
    @State private var noHours = false
    @State private var photoItem: PhotosPickerItem?
    @State private var photoData: Data?
    @State private var busy = false
    @State private var err: String?
    @State private var confirmDelete = false
    @State private var loaded = false

    static let wd = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"]

    var body: some View {
        Form {
            Section("照片") {
                if let d = photoData, let ui = UIImage(data: d) {
                    Image(uiImage: ui).resizable().scaledToFill().frame(height: 160).clipped().listRowInsets(EdgeInsets())
                } else if let o = original {
                    PlacePhoto(place: o, height: 160, corner: 0).listRowInsets(EdgeInsets())
                }
                PhotosPicker(selection: $photoItem, matching: .images) { Label(photoData == nil ? "選一張照片" : "換一張", systemImage: "photo") }
            }
            Section("基本資料") {
                TextField("店名（必填）", text: $p.name)
                Picker("料理", selection: $p.cuisine) { ForEach(Cuisine.all) { c in Text(c.name).tag(c.key) } }
                TextField("Google 分類（選填）", text: $p.gcat)
                Picker("清單", selection: $p.list) { ForEach(GoogleList.all, id: \.0) { Text($0.1).tag($0.0) } }.pickerStyle(.segmented)
                HStack {
                    TextField("最低價", text: $priceLo).keyboardType(.numberPad)
                    Text("–")
                    TextField("最高價（空白＝以上）", text: $priceHi).keyboardType(.numberPad)
                }
                TextField("地址", text: $p.addr)
                TextField("電話", text: $p.phone).keyboardType(.phonePad)
            }
            Section {
                TextField("緯度, 經度 或 Google 地圖網址", text: $coords, axis: .vertical)
                    .onChange(of: coords) { _, v in
                        if v.contains("http"), let c = Logic.parseCoords(v) { coords = String(format: "%.6f, %.6f", c.0, c.1) }
                    }
                Button { useHere() } label: { Label("用我現在的位置", systemImage: "location.fill") }
            } header: { Text("座標（必填）") } footer: { Text("可以直接貼 Google 地圖的分享網址，會自動取出座標。") }
            Section("評分") {
                TextField("Google 評分（0–5）", text: $rating).keyboardType(.decimalPad)
                TextField("評論數", text: $reviews).keyboardType(.numberPad)
            }
            Section {
                Toggle("沒有營業時間資料", isOn: $noHours)
                if !noHours {
                    ForEach(0..<7, id: \.self) { d in
                        HStack {
                            Text(Self.wd[d]).frame(width: 44, alignment: .leading)
                            TextField("11:30-14:00, 17:30-21:00", text: $days[d]).font(.callout.monospacedDigit())
                        }
                    }
                    Button("全部套用週一") { let m = days[1]; days = days.map { _ in m } }
                }
            } header: { Text("營業時間") } footer: { Text("空白＝公休；跨夜寫成 18:00-02:00。") }
            Section("情境") {
                ForEach(Tags.all, id: \.0) { t in
                    Toggle(t.1, isOn: Binding(get: { p.tags.contains(t.0) }, set: { on in
                        if on { if !p.tags.contains(t.0) { p.tags.append(t.0) } } else { p.tags.removeAll { $0 == t.0 } }
                    }))
                }
            }
            if let err { Section { Text(err).foregroundStyle(Theme.red) } }
            if original != nil {
                Section { Button("刪除這家店", role: .destructive) { confirmDelete = true } }
            }
        }
        .navigationTitle(original == nil ? "新增餐廳" : "編輯餐廳")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button(busy ? "儲存中…" : "儲存") { Task { await save() } }.disabled(busy)
            }
        }
        .confirmationDialog("確定刪除「\(p.name)」？", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("刪除", role: .destructive) { Task { await remove() } }
        }
        .onAppear(perform: load)
        .onChange(of: photoItem) { _, item in
            Task { photoData = try? await item?.loadTransferable(type: Data.self) }
        }
    }

    func load() {
        guard !loaded else { return }
        loaded = true
        guard let o = original else {
            p.list = "want"
            return
        }
        p = o
        coords = String(format: "%.6f, %.6f", o.lat, o.lng)
        if let r = o.priceRange, r.count == 2 { priceLo = "\(r[0])"; priceHi = r[1] >= 99999 ? "" : "\(r[1])" }
        rating = o.rating > 0 ? String(format: "%.1f", o.rating) : ""
        reviews = o.reviews > 0 ? "\(o.reviews)" : ""
        if let h = o.hours, h.count == 7 { days = h.map(Logic.dayText) } else { noHours = true }
    }

    func useHere() {
        app.location.request()
        if let c = app.location.coordinate { coords = String(format: "%.6f, %.6f", c.latitude, c.longitude) }
        else { err = "還沒拿到位置，稍等一下再按一次" }
    }

    /** 表單 → Place；有錯回傳錯誤訊息 */
    func build() -> String? {
        var q = p
        q.name = q.name.trimmingCharacters(in: .whitespaces)
        if q.name.isEmpty { return "請填店名" }
        guard let c = Logic.parseCoords(coords) else { return "座標格式不對（例：25.0526, 121.5204）" }
        q.lat = c.0; q.lng = c.1
        let lo = Int(priceLo.trimmingCharacters(in: .whitespaces)), hi = Int(priceHi.trimmingCharacters(in: .whitespaces))
        switch (lo, hi) {
        case (nil, nil): q.priceRange = nil
        case let (l?, nil): q.priceRange = [l, 99999]
        case let (nil, h?): q.priceRange = [1, h]
        case let (l?, h?): if l > h { return "最低價不能高於最高價" }; q.priceRange = [l, h]
        }
        q.rating = min(5, max(0, Double(rating) ?? 0))
        q.reviews = max(0, Int(reviews) ?? 0)
        if noHours {
            q.hours = nil
        } else {
            var h: [[[Int]]] = []
            for (i, t) in days.enumerated() {
                guard let d = Logic.parseDay(t) else { return "\(Self.wd[i])的營業時間格式不對" }
                h.append(d)
            }
            q.hours = h
        }
        p = q
        return nil
    }

    func save() async {
        if let e = build() { err = e; return }
        err = nil; busy = true
        defer { busy = false }
        do {
            var id = p.id
            if original == nil {
                let before = Set(app.places.map(\.id))
                try await app.write { key in try await API.create(p, key: key) }
                id = app.places.first { !before.contains($0.id) }?.id ?? ""
            } else {
                try await app.write { key in try await API.update(p, key: key) }
            }
            if let d = photoData, !id.isEmpty, let jpeg = Self.shrink(d) {
                try await app.write { key in try await API.uploadPhoto(id, jpeg: jpeg, key: key) }
            }
            app.show(original == nil ? "已新增「\(p.name)」" : "已儲存")
            dismiss()
        } catch {
            err = error.localizedDescription
        }
    }

    func remove() async {
        busy = true
        defer { busy = false }
        do {
            try await app.write { key in try await API.delete(p.id, key: key) }
            app.show("已刪除")
            dismiss()
        } catch { err = error.localizedDescription }
    }

    /** 縮成 900 px 寬的 JPEG（伺服器上限 3 MB） */
    static func shrink(_ data: Data) -> Data? {
        guard let img = UIImage(data: data) else { return nil }
        let scale = min(1, 900 / img.size.width)
        let size = CGSize(width: img.size.width * scale, height: img.size.height * scale)
        let out = UIGraphicsImageRenderer(size: size).image { _ in img.draw(in: CGRect(origin: .zero, size: size)) }
        return out.jpegData(compressionQuality: 0.82)
    }
}
