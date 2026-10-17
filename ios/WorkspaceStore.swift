import Foundation

/// Each iPad installation owns its workspace. Portable .scenic files are imported as copies.
struct IPadWorkspaceStore {
    let root: URL
    var current: URL { root.appendingPathComponent("workspace.json") }
    var previous: URL { root.appendingPathComponent("workspace.previous.json") }
    func valid(_ data: Data) -> Bool {
        guard data.count <= 80 * 1024 * 1024,
              let value = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return false }
        func project(_ p: [String: Any]) -> Bool {
            guard p["version"] as? Int == 1, p["name"] is String,
                  let scenes = p["scenes"] as? [[String: Any]], !scenes.isEmpty else { return false }
            return scenes.allSatisfy { $0["id"] is String && $0["title"] is String && $0["objects"] is [Any] }
        }
        if value["version"] as? Int == 1 { return project(value) }
        guard value["version"] as? Int == 2, let projects = value["projects"] as? [[String: Any]],
              !projects.isEmpty, projects.count <= 100, let active = value["activeProject"] as? String,
              projects.allSatisfy(project), projects.contains(where: { $0["projectId"] as? String == active }) else { return false }
        return true
    }
    func read() throws -> (String?, Bool) {
        let fm = FileManager.default
        if !fm.fileExists(atPath: current.path) && !fm.fileExists(atPath: previous.path) { return (nil, false) }
        for (url, recovered) in [(current, false), (previous, true)] {
            if let data = try? Data(contentsOf: url), valid(data), let text = String(data: data, encoding: .utf8) { return (text, recovered) }
        }
        throw failure("Your workspace could not be read. Existing files have been preserved. Open a .scenic backup to recover it.")
    }
    func write(_ text: String) throws {
        let data = Data(text.utf8)
        guard valid(data) else { throw failure("Workspace is invalid or larger than 80 MB. Export a backup and reduce embedded image sizes.") }
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        if let old = try? Data(contentsOf: current), valid(old), old != data { try protectedWrite(old, to: previous) }
        try protectedWrite(data, to: current)
    }
    private func protectedWrite(_ data: Data, to url: URL) throws {
        try data.write(to: url, options: .atomic)
        #if os(iOS)
        try FileManager.default.setAttributes([.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: url.path)
        #endif
    }
    private func failure(_ text: String) -> NSError { NSError(domain: "Scenic", code: 1, userInfo: [NSLocalizedDescriptionKey: text]) }
}
