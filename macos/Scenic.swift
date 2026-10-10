import AppKit
import WebKit
import UniformTypeIdentifiers

struct WorkspaceStore {
    let root: URL
    var current: URL { root.appendingPathComponent("workspace.json") }
    var previous: URL { root.appendingPathComponent("workspace.previous.json") }
    func valid(_ data: Data) -> Bool {
        guard data.count <= 80 * 1024 * 1024,
              let p = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return false }
        func projectValid(_ project: [String: Any]) -> Bool {
            guard project["version"] as? Int == 1, project["name"] is String,
                  let scenes = project["scenes"] as? [[String: Any]], !scenes.isEmpty else { return false }
            return true
        }
        if p["version"] as? Int == 1 { return projectValid(p) }
        guard p["version"] as? Int == 2, let projects = p["projects"] as? [[String: Any]],
              !projects.isEmpty, projects.count <= 100, let active = p["activeProject"] as? String,
              projects.allSatisfy(projectValid),
              projects.contains(where: { $0["projectId"] as? String == active }) else { return false }
        return true
    }
    func read() throws -> (String?, Bool) {
        let fm = FileManager.default
        if !fm.fileExists(atPath: current.path) && !fm.fileExists(atPath: previous.path) { return (nil, false) }
        if let d = try? Data(contentsOf: current), valid(d), let s = String(data: d, encoding: .utf8) { return (s, false) }
        if let d = try? Data(contentsOf: previous), valid(d), let s = String(data: d, encoding: .utf8) { return (s, true) }
        throw NSError(domain: "Scenic", code: 1, userInfo: [NSLocalizedDescriptionKey: "Your saved workspace could not be read. Open a .scenic backup to recover it. Your existing files have been preserved."])
    }
    func write(_ text: String) throws {
        let data = Data(text.utf8)
        guard valid(data) else { throw NSError(domain: "Scenic", code: 2, userInfo: [NSLocalizedDescriptionKey: "Workspace is invalid or larger than 80 MB."]) }
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        if let old = try? Data(contentsOf: current), valid(old), old != data { try old.write(to: previous, options: .atomic) }
        try data.write(to: current, options: .atomic)
    }
}

final class ScenicApp: NSObject, NSApplicationDelegate, NSWindowDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var web: WKWebView!
    let queue = DispatchQueue(label: "org.squidproductions.scenic.storage")
    let store = WorkspaceStore(root: FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Scenic", isDirectory: true))
    var webRoot: URL!
    var allowClose = false
    var flushing = false
    var pendingOpen: URL?
    let updates = ScenicUpdates()

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.applicationIconImage = NSImage(contentsOf: Bundle.main.resourceURL!.appendingPathComponent("ScenicBlue.icns"))
        makeMenu()
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.userContentController.add(self, name: "scenic")
        web = WKWebView(frame: .zero, configuration: config)
        web.uiDelegate = self
        web.navigationDelegate = self
        web.allowsBackForwardNavigationGestures = false
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1440, height: 940), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Scenic · Squid Productions"
        window.minSize = NSSize(width: 1024, height: 700)
        window.isReleasedWhenClosed = false
        window.setFrameAutosaveName("ScenicMainWindow")
        window.delegate = self
        window.contentView = web
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        webRoot = Bundle.main.resourceURL!.appendingPathComponent("web", isDirectory: true)
        web.loadFileURL(webRoot.appendingPathComponent("index.html"), allowingReadAccessTo: webRoot)
        updates.window = window
        updates.saveWorkspace = { [weak self] completion in self?.flush(completion) }
        updates.start()
    }
    func makeMenu() {
        let main = NSMenu()
        func submenu(_ title: String) -> NSMenu {
            let item = NSMenuItem(); let menu = NSMenu(title: title); item.submenu = menu; main.addItem(item); return menu
        }
        func add(_ menu: NSMenu, _ title: String, _ action: Selector, _ key: String = "", _ mods: NSEvent.ModifierFlags = [.command]) {
            let item = menu.addItem(withTitle: title, action: action, keyEquivalent: key)
            item.keyEquivalentModifierMask = mods
            if action != #selector(NSApplication.terminate(_:)) && action != #selector(NSApplication.hide(_:)) { item.target = self }
        }
        let app = submenu("Scenic")
        add(app, "About Scenic", #selector(about))
        updates.addMenuItems(to: app)
        add(app, "Show Project Data Folder", #selector(showData))
        app.addItem(.separator()); add(app, "Hide Scenic", #selector(NSApplication.hide(_:)), "h")
        app.addItem(.separator()); add(app, "Quit Scenic", #selector(NSApplication.terminate(_:)), "q")
        let file = submenu("File")
        add(file, "New Scene", #selector(newScene), "n")
        add(file, "Open Project…", #selector(openProject), "o")
        add(file, "Save", #selector(saveNow), "s")
        add(file, "Save Project As…", #selector(saveAs), "s", [.command, .shift])
        file.addItem(.separator()); add(file, "Import Image…", #selector(importImage), "i", [.command, .shift])
        add(file, "Export Map…", #selector(exportMap), "e")
        file.addItem(.separator()); add(file, "Close Window", #selector(closeWindow), "w")
        let edit = submenu("Edit")
        add(edit, "Undo", #selector(undo), "z"); add(edit, "Redo", #selector(redo), "z", [.command, .shift])
        edit.addItem(.separator())
        for (name, action, key) in [("Cut", #selector(NSText.cut(_:)), "x"), ("Copy", #selector(NSText.copy(_:)), "c"), ("Paste", #selector(NSText.paste(_:)), "v"), ("Select All", #selector(NSText.selectAll(_:)), "a")] {
            edit.addItem(withTitle: name, action: action, keyEquivalent: key)
        }
        add(edit, "Duplicate Object", #selector(duplicate), "d")
        let view = submenu("View")
        add(view, "Fit Scene", #selector(fit), "0")
        add(view, "Toggle Light / Dark Mode", #selector(theme))
        add(view, "Scene Map", #selector(map)); add(view, "Shot List", #selector(shots))
        let help = submenu("Help"); add(help, "Scenic Quick Guide", #selector(guide), "/")
        NSApp.mainMenu = main
    }
    func click(_ id: String) { web.evaluateJavaScript("document.getElementById('\(id)').click()", completionHandler: nil) }
    @objc func newScene() { click("add-scene") }
    @objc func openProject() { click("open-project") }
    @objc func saveAs() { click("save-project") }
    @objc func importImage() { click("import-image") }
    @objc func exportMap() { click("export") }
    @objc func duplicate() { web.evaluateJavaScript("duplicate()", completionHandler: nil) }
    @objc func fit() { click("fit") }
    @objc func theme() { click("theme") }
    @objc func map() { click("map-tab") }
    @objc func shots() { click("shots-tab") }
    @objc func guide() { click("help") }
    @objc func closeWindow() { window.performClose(nil) }
    @objc func undo() { web.evaluateJavaScript("(['INPUT','TEXTAREA'].includes(document.activeElement.tagName) ? document.execCommand('undo') : undo())", completionHandler: nil) }
    @objc func redo() { web.evaluateJavaScript("(['INPUT','TEXTAREA'].includes(document.activeElement.tagName) ? document.execCommand('redo') : redo())", completionHandler: nil) }
    @objc func saveNow() { flush { _ in } }
    @objc func showData() {
        do { try FileManager.default.createDirectory(at: store.root, withIntermediateDirectories: true); NSWorkspace.shared.open(store.root) }
        catch { showError(error.localizedDescription) }
    }
    @objc func about() {
        NSApp.orderFrontStandardAboutPanel(options: [.applicationName: "Scenic", .applicationVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "", .version: Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "", .credits: NSAttributedString(string: "A Squid Production™ Software\nTop-down scene, shot, and lighting design.\nWorks entirely on your Mac.")])
    }
    func showError(_ text: String) {
        let alert = NSAlert(); alert.messageText = "Scenic"; alert.informativeText = text; alert.alertStyle = .warning; alert.addButton(withTitle: "OK"); alert.runModal()
    }
    func reply(_ id: String, result: Any = NSNull(), error: String? = nil) {
        let args: [Any] = [id, result, error as Any? ?? NSNull()]
        guard let data = try? JSONSerialization.data(withJSONObject: args, options: [.fragmentsAllowed]), let json = String(data: data, encoding: .utf8) else { return }
        web.evaluateJavaScript("window.ScenicDesktop.receive(...\(json))", completionHandler: nil)
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, let url = message.frameInfo.request.url,
              url.isFileURL, url.standardizedFileURL.path.hasPrefix(webRoot.standardizedFileURL.path + "/"),
              let b = message.body as? [String: Any], let id = b["id"] as? String, let action = b["action"] as? String else { return }
        switch action {
        case "readProject":
            queue.async { [self] in
                do { let (text, recovered) = try store.read(); DispatchQueue.main.async { self.reply(id, result: ["project": text as Any? ?? NSNull(), "recovered": recovered]) } }
                catch { DispatchQueue.main.async { self.reply(id, error: error.localizedDescription) } }
            }
        case "saveProject":
            guard let text = b["project"] as? String else { reply(id, error: "Missing workspace"); return }
            queue.async { [self] in
                do { try store.write(text); DispatchQueue.main.async { self.reply(id, result: true) } }
                catch { DispatchQueue.main.async { self.reply(id, error: error.localizedDescription) } }
            }
        case "exportFile":
            guard let filename = b["filename"] as? String, let encoded = b["base64"] as? String,
                  encoded.count < 120 * 1024 * 1024, let data = Data(base64Encoded: encoded) else { reply(id, error: "Invalid or oversized export"); return }
            let panel = NSSavePanel()
            panel.canCreateDirectories = true
            let ext = URL(fileURLWithPath: filename).pathExtension
            if ["png", "csv", "json"].contains(ext), let type = UTType(filenameExtension: ext) { panel.allowedContentTypes = [type] }
            panel.nameFieldStringValue = URL(fileURLWithPath: filename).lastPathComponent
            panel.beginSheetModal(for: window) { [self] response in
                guard response == .OK, let destination = panel.url else { reply(id, result: false); return }
                queue.async {
                    do { try data.write(to: destination, options: .atomic); DispatchQueue.main.async { self.reply(id, result: destination.lastPathComponent) } }
                    catch { DispatchQueue.main.async { self.reply(id, error: error.localizedDescription) } }
                }
            }
        default: reply(id, error: "Unsupported request")
        }
    }
    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel(); panel.canChooseDirectories = false; panel.allowsMultipleSelection = false
        panel.beginSheetModal(for: window) { completionHandler($0 == .OK ? panel.urls : nil) }
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let u = navigationAction.request.url, u.isFileURL, u.standardizedFileURL.path.hasPrefix(webRoot.standardizedFileURL.path + "/") { decisionHandler(.allow) }
        else { decisionHandler(.cancel) }
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { showError("The bundled editor could not open: " + error.localizedDescription) }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        showError("The editor stopped unexpectedly. Scenic will reload the last autosaved workspace."); web.reload()
    }
    func flush(_ completion: @escaping (Bool) -> Void) {
        if flushing { completion(false); return }
        flushing = true
        web.callAsyncJavaScript("await window.scenicFlush(); return true;", arguments: [:], in: nil, in: .page) { [self] result in
            flushing = false
            switch result {
            case .success: completion(true)
            case .failure(let error): showError("Your workspace could not be saved. Keep Scenic open and use Save Project As to make a backup.\n\n" + error.localizedDescription); completion(false)
            }
        }
    }
    func windowShouldClose(_ sender: NSWindow) -> Bool {
        if allowClose { return true }
        flush { [self] saved in if saved { allowClose = true; window.close() } }
        return false
    }
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        if allowClose { return .terminateNow }
        flush { saved in
            if saved { sender.reply(toApplicationShouldTerminate: true); return }
            let alert = NSAlert(); alert.messageText = "Quit without saving?"; alert.informativeText = "Your latest edits could not be autosaved. You can keep Scenic open and use Save Project As to export a backup."; alert.addButton(withTitle: "Keep Working"); alert.addButton(withTitle: "Quit Without Saving")
            sender.reply(toApplicationShouldTerminate: alert.runModal() == .alertSecondButtonReturn)
        }
        return .terminateLater
    }
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        allowClose = false; window.makeKeyAndOrderFront(nil); return true
    }
}

@main
struct ScenicMain {
static func main() {
if CommandLine.arguments.contains("--storage-test") {
    let root = FileManager.default.temporaryDirectory.appendingPathComponent("scenic-test-\(UUID().uuidString)")
    let store = WorkspaceStore(root: root)
    defer { try? FileManager.default.removeItem(at: root) }
    let first = "{\"version\":1,\"name\":\"First\",\"scenes\":[{}]}"
    let second = "{\"version\":1,\"name\":\"Second\",\"scenes\":[{}]}"
    do {
        let empty = try store.read(); precondition(empty.0 == nil)
        try store.write(first); let loadedFirst = try store.read(); precondition(loadedFirst.0 == first)
        try store.write(second); let loadedSecond = try store.read(); precondition(loadedSecond.0 == second)
        try Data("broken".utf8).write(to: store.current)
        let recovered = try store.read(); precondition(recovered.0 == first && recovered.1)
        try store.write(second); let backup = try String(contentsOf: store.previous, encoding: .utf8); precondition(backup == first)
        do { try store.write("invalid"); fatalError("Invalid data accepted") } catch {}
        let workspace = "{\"version\":2,\"activeProject\":\"p1\",\"projects\":[{\"version\":1,\"projectId\":\"p1\",\"name\":\"First\",\"scenes\":[{}]},{\"version\":1,\"projectId\":\"p2\",\"name\":\"Second\",\"scenes\":[{}]}]}"
        try store.write(workspace); let loadedWorkspace = try store.read(); precondition(loadedWorkspace.0 == workspace)
        print("Native storage verified: first launch, atomic save, reload, backup recovery, invalid-data protection.")
        exit(0)
    } catch { fputs("Storage verification failed: \(error)\n", stderr); exit(1) }
}
let app = NSApplication.shared
let delegate = ScenicApp()
app.setActivationPolicy(.regular)
app.delegate = delegate
app.run()

}
}
