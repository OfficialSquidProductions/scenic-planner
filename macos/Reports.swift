import Foundation

struct ScenicSession: Codable {
    var started: Date
    var version: String
    var errors: [String]
}
struct ScenicCrashReport: Codable {
    var id: String?
    var needsPrompt: Bool
    var log: String
}
final class ScenicReports {
    let root: URL
    let version: String
    var session: ScenicSession?
    var sessionURL: URL { root.appendingPathComponent("session.json") }
    var reportURL: URL { root.appendingPathComponent("crash-report.json") }
    init(root: URL, version: String) { self.root = root; self.version = version }
    func read<T: Decodable>(_ url: URL) -> T? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }
    func write<T: Encodable>(_ value: T, to url: URL) throws {
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        try JSONEncoder().encode(value).write(to: url, options: .atomic)
    }
    func begin() throws {
        if let previous: ScenicSession = read(sessionURL) {
            // A matching OS report may arrive after the app has exited.
            try capture("Scenic did not shut down normally (a crash, force quit, or power loss).", previous: previous, includeSystemReport: true)
        }
        session = ScenicSession(started: Date(), version: version, errors: [])
        try write(session!, to: sessionURL)
    }
    func log(_ message: String) throws {
        guard var current = session else { return }
        current.errors.append(String(message.prefix(4000)))
        current.errors = Array(current.errors.suffix(12)); session = current
        try write(current, to: sessionURL)
    }
    func capture(_ reason: String, previous: ScenicSession? = nil, includeSystemReport: Bool = false) throws {
        let current = previous ?? session
        var log = "Scenic crash report\nVersion: \(current?.version ?? version)\nSystem: \(ProcessInfo.processInfo.operatingSystemVersionString)\nSession started: \(current?.started.ISO8601Format() ?? "unknown")\nRecorded: \(Date().ISO8601Format())\n\(reason)\n\nRecent editor errors:\n\(current?.errors.joined(separator: "\n\n").nonEmpty ?? "No JavaScript errors recorded.")"
        if includeSystemReport, let started = current?.started {
            let directory = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Logs/DiagnosticReports")
            let files = (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: [.contentModificationDateKey])) ?? []
            let matching = files.filter { url in
                guard url.lastPathComponent.hasPrefix("Scenic-"), ["ips", "crash"].contains(url.pathExtension),
                      let date = try? url.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate else { return false }
                return date >= started
            }.sorted { $0.lastPathComponent > $1.lastPathComponent }
            if let file = matching.first, let handle = try? FileHandle(forReadingFrom: file) {
                defer { try? handle.close() }
                if let data = try? handle.read(upToCount: 128 * 1024), let text = String(data: data, encoding: .utf8) {
                    log += "\n\nmacOS diagnostic report (up to 128 KB):\n" + text
                }
            }
        }
        try write(ScenicCrashReport(id: UUID().uuidString, needsPrompt: true, log: log), to: reportURL)
    }
    func get() -> ScenicCrashReport {
        read(reportURL) ?? ScenicCrashReport(id: nil, needsPrompt: false, log: "Scenic \(version)\nSystem: \(ProcessInfo.processInfo.operatingSystemVersionString)\nNo crash has been recorded.\n\(session?.errors.joined(separator: "\n\n") ?? "")")
    }
    func dismiss(_ id: String?) throws {
        var report = get()
        if report.id != nil && report.id == id { report.needsPrompt = false; try write(report, to: reportURL) }
    }
    func end() { try? FileManager.default.removeItem(at: sessionURL) }
}
private extension String {
    var nonEmpty: String? { isEmpty ? nil : self }
}
