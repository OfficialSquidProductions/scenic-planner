import Foundation
@main struct StorageCheck {
 static func main() throws {
    let root = FileManager.default.temporaryDirectory.appendingPathComponent("Scenic-iPad-Storage-\(UUID())")
    defer { try? FileManager.default.removeItem(at: root) }
    let store = IPadWorkspaceStore(root: root)
    let first = #"{"version":2,"activeProject":"p","projects":[{"version":1,"projectId":"p","name":"First","active":"s","scenes":[{"id":"s","title":"Scene","objects":[]}]}]}"#
    let second = first.replacingOccurrences(of: "First", with: "Second")
    let empty = try store.read(); precondition(empty.0 == nil)
    try store.write(first); let loadedFirst = try store.read(); precondition(loadedFirst.0 == first)
    try store.write(second); let loadedSecond = try store.read(); precondition(loadedSecond.0 == second)
    try Data("broken".utf8).write(to: store.current)
    let recovered = try store.read(); precondition(recovered.0 == first && recovered.1)
    try store.write(second); let previous = try String(contentsOf: store.previous, encoding: .utf8); precondition(previous == first)
    for bad in ["invalid",first.replacingOccurrences(of: "\"activeProject\":\"p\"",with:"\"activeProject\":\"missing\""),first.replacingOccurrences(of:"\"objects\":[]",with:"\"objects\":false")] {
        do { try store.write(bad); fatalError("Invalid input accepted") } catch {}
    }
    try Data("broken".utf8).write(to: store.previous); try Data("broken".utf8).write(to: store.current)
    do { _ = try store.read(); fatalError("Both corrupt files accepted") } catch {}
    let preserved = try String(contentsOf: store.current, encoding:.utf8); precondition(preserved == "broken")
    let diagnostics = IPadDiagnostics(root: root)
    precondition(diagnostics.get().id == nil)
    try diagnostics.record("Synthetic WebKit stop", interrupted: true)
    let report = diagnostics.get(); precondition(report.needsPrompt && report.log.contains("Synthetic WebKit stop"))
    try diagnostics.dismiss("unrelated"); precondition(diagnostics.get().needsPrompt)
    try diagnostics.dismiss(report.id); precondition(!diagnostics.get().needsPrompt)
    try diagnostics.record(String(repeating: "x",count:30000)); precondition(diagnostics.get().log.count <= 16000)
    print("PASS: first launch, atomic save, current reload, previous-save recovery, backup preservation, invalid schema/active ID rejection, corrupt-file preservation")
    print("PASS: durable editor diagnostics, interrupted-process prompt, matching-ID dismissal and bounded log size")
 }
}
