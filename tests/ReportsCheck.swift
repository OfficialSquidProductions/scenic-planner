import Foundation

@main struct ReportsCheck {
    static func main() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("scenic-reports-\(UUID().uuidString)")
        defer { try? FileManager.default.removeItem(at: root) }
        var reports = ScenicReports(root: root, version: "first-version")
        try reports.begin(); precondition(!reports.get().needsPrompt)
        reports.end()
        reports = ScenicReports(root: root, version: "first-version")
        try reports.begin(); precondition(!reports.get().needsPrompt)
        try reports.log("Synthetic error: editor.js:12")
        reports = ScenicReports(root: root, version: "next-version")
        try reports.begin()
        let report = reports.get()
        precondition(report.needsPrompt && report.log.contains("first-version") && report.log.contains("Synthetic error"))
        try reports.dismiss("stale-id"); precondition(reports.get().needsPrompt)
        try reports.dismiss(report.id); precondition(!reports.get().needsPrompt)
        reports.end(); try reports.begin(); precondition(!reports.get().needsPrompt)
        for _ in 0..<20 { try reports.log(String(repeating: "x", count: 6000)) }
        precondition(reports.session?.errors.count == 12 && reports.session?.errors.first?.count == 4000)
        try reports.capture("WebKit editor process stopped unexpectedly")
        precondition(reports.get().needsPrompt && reports.get().log.contains("WebKit editor process"))
        reports.end()
        print("Mac crash report lifecycle, clean quit, unexpected exit, version retention, bounded diagnostics, dismiss and renderer crash passed.")
    }
}
