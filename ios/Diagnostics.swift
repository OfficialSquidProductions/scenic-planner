import Foundation

struct IPadEditorReport: Codable {
    var id: String?
    var needsPrompt: Bool
    var log: String
}

/// iPadOS owns crash diagnostics; this log retains only Scenic's own editor errors.
struct IPadDiagnostics {
    let root: URL
    var file: URL { root.appendingPathComponent("editor-report.json") }
    func get() -> IPadEditorReport {
        if let data = try? Data(contentsOf: file), let report = try? JSONDecoder().decode(IPadEditorReport.self, from: data) { return report }
        return IPadEditorReport(id: nil, needsPrompt: false, log: "No editor error has been recorded. Describe what happened below.")
    }
    private func write(_ report: IPadEditorReport) throws {
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        try JSONEncoder().encode(report).write(to: file, options: .atomic)
    }
    func record(_ text: String, interrupted: Bool = false) throws {
        var report = get()
        report.id = UUID().uuidString; report.needsPrompt = report.needsPrompt || interrupted
        report.log = String((report.log + "\n\nScenic iPad \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "development") · \(Date().ISO8601Format())\n" + String(text.prefix(4000))).suffix(16000))
        try write(report)
    }
    func dismiss(_ id: String?) throws {
        var report = get()
        if id != nil && report.id == id { report.needsPrompt = false; try write(report) }
    }
}
