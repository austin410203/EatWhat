import SwiftUI
import MapKit

struct ExploreView: View {
    @EnvironmentObject var app: AppModel
    @State private var mapMode = Debug.screen == "map"
    @State private var sort = Logic.SortKey.smart
    @State private var q = ""
    @State private var filters = false
    @State private var selected: String?

    var body: some View {
        let base = app.filtered
        let list = Logic.sort(searched(base), by: sort, prefs: app.prefs, from: app.here)
        VStack(spacing: 0) {
            VStack(spacing: 10) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("探索餐廳").font(.system(size: 28, weight: .heavy, design: .serif))
                        Text("\(app.regionLabel) · \(list.count) 家").font(.subheadline).foregroundStyle(Theme.ink2)
                    }
                    Spacer()
                    Picker("", selection: $mapMode) {
                        Image(systemName: "list.bullet").tag(false)
                        Image(systemName: "map").tag(true)
                    }
                    .pickerStyle(.segmented).frame(width: 100)
                }
                HStack(spacing: 8) {
                    HStack {
                        Image(systemName: "magnifyingglass").foregroundStyle(Theme.ink3)
                        TextField("搜尋店名、料理或地址", text: $q)
                        if !q.isEmpty { Button { q = "" } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(Theme.ink3) } }
                    }
                    .padding(10).background(Theme.paper, in: RoundedRectangle(cornerRadius: 12)).overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.line))
                    Button { filters = true } label: {
                        Image(systemName: "slider.horizontal.3").font(.title3).foregroundStyle(.white)
                            .frame(width: 44, height: 44).background(Theme.indigo, in: RoundedRectangle(cornerRadius: 12))
                    }
                }
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(Logic.SortKey.allCases, id: \.self) { k in Chip(text: k.rawValue, on: sort == k) { sort = k } }
                        Text(FilterText.budget(app.prefs.filters)).font(.caption).foregroundStyle(Theme.ink2).padding(.leading, 6)
                        Text(FilterText.distance(app.prefs.filters.distance)).font(.caption).foregroundStyle(Theme.ink2)
                    }
                }
            }
            .padding(.horizontal, 18).padding(.top, 8).padding(.bottom, 10)

            if mapMode {
                PlacesMap(list: list, selected: $selected, radiusKm: app.prefs.filters.distance)
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 10) {
                        let featured = base.filter { !Logic.lowConfidence($0) && !Logic.noRating($0) }
                            .sorted { Logic.trustScore($0) > Logic.trustScore($1) }.prefix(6)
                        if q.isEmpty && featured.count > 2 {
                            SectionHead(title: "附近評價最高", sub: "依可信分數")
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(Array(featured)) { p in
                                        NavigationLink(value: p.id) {
                                            PlacePhoto(place: p, height: 150).frame(width: 220)
                                                .overlay(alignment: .topTrailing) { ScoreBadge(place: p).padding(8) }
                                                .overlay(alignment: .bottomLeading) {
                                                    VStack(alignment: .leading, spacing: 1) {
                                                        Text(p.name).font(.subheadline.bold()).lineLimit(1)
                                                        Text("\(p.cuisineInfo.name) · \(Logic.fmtDist(app.dist(p)))").font(.caption2)
                                                    }
                                                    .foregroundStyle(.white).shadow(color: .black.opacity(0.6), radius: 4).padding(10)
                                                }
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                            SectionHead(title: "全部餐廳").padding(.top, 6)
                        }
                        ForEach(list) { p in PlaceRow(place: p) }
                        if list.isEmpty { EmptyNote(art: "fortune", text: "沒有符合的店，試試放寬條件") }
                    }
                    .padding(.horizontal, 18).padding(.bottom, 20)
                }
                .refreshable { await app.refresh() }
            }
        }
        .background(Theme.beige)
        .toolbar(.hidden, for: .navigationBar)
        .sheet(isPresented: $filters) { FilterSheet(count: list.count).environmentObject(app) }
    }

    func searched(_ l: [Place]) -> [Place] {
        let k = q.trimmingCharacters(in: .whitespaces).lowercased()
        guard !k.isEmpty else { return l }
        return l.filter { $0.name.lowercased().contains(k) || $0.cuisineInfo.name.contains(k) || $0.addr.contains(k) || $0.gcat.contains(k) }
    }
}

/** 地圖：分數顏色標記，點了下方出現店家卡 */
struct PlacesMap: View {
    @EnvironmentObject var app: AppModel
    let list: [Place]
    @Binding var selected: String?
    var radiusKm: Double
    @State private var camera: MapCameraPosition = .automatic

    var body: some View {
        Map(position: $camera, selection: $selected) {
            UserAnnotation()
            if !app.inCity {
                Annotation(app.area?.name ?? app.city.centerName, coordinate: app.here) {
                    Image(systemName: "figure.stand").padding(6).background(Theme.indigo, in: Circle()).foregroundStyle(.white)
                }
            }
            if radiusKm < 99 {
                MapCircle(center: app.here, radius: radiusKm * 1000)
                    .foregroundStyle(Theme.indigo.opacity(0.06)).stroke(Theme.indigo.opacity(0.4), lineWidth: 1)
            }
            ForEach(list) { p in
                Marker(p.name, systemImage: "fork.knife", coordinate: CLLocationCoordinate2D(latitude: p.lat, longitude: p.lng))
                    .tint(Theme.scoreColor(p))
                    .tag(p.id)
            }
        }
        .mapControls { MapUserLocationButton(); MapCompass() }
        .onAppear { recenter() }
        .onChange(of: radiusKm) { _, _ in recenter() }
        .onChange(of: app.prefs.region) { _, _ in recenter() }
        .overlay(alignment: .bottom) {
            VStack(spacing: 8) {
                HStack(spacing: 10) {
                    legend(Theme.green, "4.3+"); legend(Theme.indigo, "3.9+"); legend(Theme.ink3, "其他"); legend(Theme.amber, "評論少")
                }
                .font(.caption2).padding(.horizontal, 10).padding(.vertical, 6).background(.thinMaterial, in: Capsule())
                if let id = selected, let p = app.place(id) { PlaceRow(place: p) }
            }
            .padding(12)
        }
    }

    func legend(_ c: Color, _ t: String) -> some View {
        HStack(spacing: 3) { Circle().fill(c).frame(width: 8, height: 8); Text(t) }
    }

    func recenter() {
        if app.area != nil, !list.isEmpty {
            // 選了區域：框住該區的店
            let lats = list.map(\.lat), lngs = list.map(\.lng)
            let c = CLLocationCoordinate2D(latitude: (lats.min()! + lats.max()!) / 2, longitude: (lngs.min()! + lngs.max()!) / 2)
            camera = .region(MKCoordinateRegion(center: c, span: MKCoordinateSpan(latitudeDelta: (lats.max()! - lats.min()!) * 1.4 + 0.004, longitudeDelta: (lngs.max()! - lngs.min()!) * 1.4 + 0.004)))
            return
        }
        let r = min(max(radiusKm, 0.5), 8) * 2400
        camera = .region(MKCoordinateRegion(center: app.here, latitudinalMeters: r, longitudinalMeters: r))
    }
}

/** 店家頁的小地圖 */
struct MiniMap: View {
    let place: Place
    var body: some View {
        let c = CLLocationCoordinate2D(latitude: place.lat, longitude: place.lng)
        Map(initialPosition: .region(MKCoordinateRegion(center: c, latitudinalMeters: 600, longitudinalMeters: 600)), interactionModes: []) {
            Marker(place.name, systemImage: "fork.knife", coordinate: c).tint(Theme.indigo)
        }
        .frame(height: 170)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}
