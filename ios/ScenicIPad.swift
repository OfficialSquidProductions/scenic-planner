import UIKit
import WebKit
import UniformTypeIdentifiers
import MessageUI

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, configurationForConnecting session: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Scenic", sessionRole: session.role)
        config.delegateClass = ScenicSceneDelegate.self
        return config
    }
}

final class ScenicSceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    var editor: ScenicViewController?
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let controller = ScenicViewController(); editor = controller
        let window = UIWindow(windowScene: scene); window.rootViewController = controller
        self.window = window; window.makeKeyAndVisible()
        if let url = options.urlContexts.first?.url { controller.openProject(url) }
    }
    func scene(_ scene: UIScene, openURLContexts contexts: Set<UIOpenURLContext>) {
        if let url = contexts.first?.url { editor?.openProject(url) }
    }
    func sceneWillResignActive(_ scene: UIScene) { editor?.flush() }
    func sceneDidEnterBackground(_ scene: UIScene) { editor?.flush() }
}

final class ScenicViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate, UIDocumentPickerDelegate, MFMailComposeViewControllerDelegate, UIAdaptivePresentationControllerDelegate {
    private(set) var web: WKWebView!
    private let queue = DispatchQueue(label: "org.squidproductions.scenic.ipad.storage")
    private let store = IPadWorkspaceStore(root: FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Scenic"))
    private var root: URL { Bundle.main.resourceURL!.appendingPathComponent("web") }
    private var browser: WKWebView?
    private var sceneSnapshot: [String: Any]?
    private var pngExport: ScenicPNGExport?
    private var pendingPicker: (id: String, kind: String, file: URL?)?
    private var pendingOpen: URL?
    private var backgroundTask: UIBackgroundTaskIdentifier = .invalid
    private var diagnostics: IPadDiagnostics { IPadDiagnostics(root: store.root) }
    private var errorLog: String { diagnostics.get().log }
    private var ready = false
    private var smokeStarted = false

    override var keyCommands: [UIKeyCommand]? {
        guard presentedViewController == nil else { return super.keyCommands }
        let copy = UIKeyCommand(title: "Copy", action: #selector(copySceneItems(_:)), input: "c", modifierFlags: .command)
        let paste = UIKeyCommand(title: "Paste", action: #selector(pasteSceneItems(_:)), input: "v", modifierFlags: .command)
        copy.wantsPriorityOverSystemBehavior = true; paste.wantsPriorityOverSystemBehavior = true
        return [copy, paste] + (super.keyCommands ?? [])
    }
    @objc private func copySceneItems(_ sender: Any?) { web.copy(sender) }
    @objc private func pasteSceneItems(_ sender: Any?) { web.paste(sender) }
    override func viewDidLoad() {
        super.viewDidLoad(); view.backgroundColor = .systemBackground
        web = makeWeb(); web.translatesAutoresizingMaskIntoConstraints = false
        web.scrollView.isScrollEnabled = false; web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        #if DEBUG
        web.isInspectable = ProcessInfo.processInfo.arguments.contains("--smoke-test")
        #endif
        view.addSubview(web)
        NSLayoutConstraint.activate([
            web.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            web.bottomAnchor.constraint(equalTo: UIDevice.current.userInterfaceIdiom == .phone ? view.keyboardLayoutGuide.topAnchor : view.safeAreaLayoutGuide.bottomAnchor)
        ])
        web.loadFileURL(root.appendingPathComponent("index.html"), allowingReadAccessTo: root)
    }
    private func makeWeb() -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.userContentController.add(self, name: "scenic")
        let platform = UIDevice.current.userInterfaceIdiom == .pad ? "iPad" : "iOS"
        config.userContentController.addUserScript(WKUserScript(source: "window.SquidPlatform='\(platform)';", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController.addUserScript(WKUserScript(source: "window.ScenicIPad={addSelection:false,isPhone:\(UIDevice.current.userInterfaceIdiom == .phone ? "true" : "false")};", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let result = ScenicClipboardWebView(frame: .zero, configuration: config)
        result.navigationDelegate = self; result.uiDelegate = self
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--clipboard-smoke-test") || ProcessInfo.processInfo.arguments.contains("--verify-clipboard-persistence") || ProcessInfo.processInfo.arguments.contains("--clipboard-ui-test") {
            result.objectPasteboard = UIPasteboard(name: UIPasteboard.Name("org.squidproductions.scenic.clipboard.qa"), create: true)!
        }
        #endif
        return result
    }
    private func reply(_ id: String, result: Any = NSNull(), error: String? = nil, target: WKWebView? = nil) {
        let args: [Any] = [id, result, error as Any? ?? NSNull()]
        guard let data = try? JSONSerialization.data(withJSONObject: args), let text = String(data: data, encoding: .utf8) else { return }
        (target ?? web).evaluateJavaScript("window.ScenicDesktop.receive(...\(text))", completionHandler: nil)
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, let url = message.frameInfo.request.url,
              url.isFileURL, url.standardizedFileURL.path.hasPrefix(root.standardizedFileURL.path + "/"),
              let data = message.body as? [String: Any], let id = data["id"] as? String, let action = data["action"] as? String else { return }
        if let browser, message.webView === browser {
            guard url.lastPathComponent == "scene-browser.html" else { return }
            if action == "sceneBrowserReady" { reply(id, result: sceneSnapshot as Any? ?? NSNull(), target: browser); return }
            if ["exportAllScenes", "sceneExportStatus", "cancelAllSceneExport"].contains(action) {
                guard let production = data["productionId"] as? String ?? sceneSnapshot?["productionId"] as? String else { reply(id,error:"Invalid production",target:browser);return }
                let method=action == "exportAllScenes" ? "exportAll" : action == "sceneExportStatus" ? "exportStatus" : "cancelExport"
                web.callAsyncJavaScript("return await window.ScenicSceneBrowser[action](production,format)",arguments:["action":method,"production":production,"format":data["format"] as? String ?? ""],in:nil,in:.page) { [weak self] result in
                    switch result {case .success(let value):self?.reply(id,result:value,target:browser);case .failure(let error):self?.reply(id,error:error.localizedDescription,target:browser)}
                };return
            }
            guard ["scenePreview", "selectScene", "duplicateScene"].contains(action), let production = data["productionId"] as? String, let scene = data["sceneId"] as? String else { reply(id, error: "Unsupported scene-browser request", target: browser); return }
            web.callAsyncJavaScript("return await window.ScenicSceneBrowser[action](production,scene)", arguments: ["action": action == "scenePreview" ? "preview" : action == "selectScene" ? "select" : "duplicate", "production": production, "scene": scene], in: nil, in: .page) { [weak self] result in
                switch result {
                case .success(let value): self?.reply(id, result: value, target: browser)
                case .failure(let error): self?.reply(id, error: error.localizedDescription, target: browser)
                }
            }
            return
        }
        guard message.webView === web, url.lastPathComponent == "index.html" else { return }

        switch action {
        case "beginScenePNGExport", "appendScenePNGExport", "finishScenePNGExport", "cancelScenePNGExport":
            handleScenePNGExport(action,id:id,payload:data)
        case "copySceneObjects": web.copy(nil); reply(id, result: true)
        case "pasteSceneObjects": web.paste(nil); reply(id, result: true)
        #if DEBUG
        case "clipboardTestState", "clipboardTestSet":
            guard ProcessInfo.processInfo.arguments.contains("--clipboard-smoke-test") || ProcessInfo.processInfo.arguments.contains("--verify-clipboard-persistence"), let editor = web as? ScenicClipboardWebView else { reply(id, error: "Unavailable test action"); return }
            if action == "clipboardTestSet" { editor.objectPasteboard.string = data["text"] as? String; reply(id, result: true) }
            else { reply(id, result: ["text": editor.objectPasteboard.string ?? "", "normalCopies":editor.normalCopies,"normalPastes":editor.normalPastes,"keyCommands":(editor.keyCommands ?? []).map { ["input":$0.input ?? "", "command":$0.modifierFlags.contains(.command)] }]) }
        #endif
        case "readProject":
            queue.async { [self] in
                do {
                    let (text, recovered) = try store.read()
                    DispatchQueue.main.async { self.reply(id, result: ["project": text as Any? ?? NSNull(), "recovered": recovered]) }
                } catch { DispatchQueue.main.async { self.reply(id, error: error.localizedDescription) } }
            }
        case "saveProject":
            guard let text = data["project"] as? String else { reply(id, error: "Missing workspace"); return }
            queue.async { [self] in
                do { try store.write(text); DispatchQueue.main.async { self.reply(id, result: true) } }
                catch { DispatchQueue.main.async { self.reply(id, error: error.localizedDescription) } }
            }
        case "importFile":
            guard let kind = data["kind"] as? String, ["project", "image", "shots"].contains(kind), pendingPicker == nil, presentedViewController == nil else { reply(id, error: "Finish the open Files dialog first."); return }
            let types: [UTType] = kind == "image" ? [.png,.jpeg,.webP] : kind == "shots" ? [.commaSeparatedText,.plainText] : [UTType(exportedAs: "org.squidproductions.scenic.project"),.json,.data]
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: types, asCopy: true)
            if UIDevice.current.userInterfaceIdiom == .phone { picker.modalPresentationStyle = .fullScreen }
            picker.allowsMultipleSelection = false; picker.delegate = self
            pendingPicker = (id,kind,nil); present(picker, animated: true)
        case "exportFile", "shareFile":
            guard let name = data["filename"] as? String, name == URL(fileURLWithPath: name).lastPathComponent,
                  let encoded = data["base64"] as? String, encoded.count <= 112 * 1024 * 1024,
                  let content = Data(base64Encoded: encoded), pendingPicker == nil, let presenter = sceneExportPresenter else { reply(id, error: "Finish the current dialog before saving or sharing."); return }
            do {
                let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                let file = directory.appendingPathComponent(name); try content.write(to: file, options: .atomic)
                if action == "shareFile" {
                    let activity = UIActivityViewController(activityItems: [file], applicationActivities: nil)
                    pendingPicker = (id,"share",file)
                    activity.popoverPresentationController?.sourceView = web
                    var anchor = CGRect(x: web.bounds.maxX - 60, y: 24, width: 1, height: 1)
                    if let rect = data["anchor"] as? [String: Double], let x = rect["x"], let y = rect["y"], let width = rect["width"], let height = rect["height"], [x,y,width,height].allSatisfy({ $0.isFinite }), width > 0, height > 0 {
                        let candidate = CGRect(x: x,y: y,width: width,height: height).intersection(web.bounds)
                        if !candidate.isNull && !candidate.isEmpty { anchor = candidate }
                    }
                    activity.popoverPresentationController?.sourceRect = anchor
                    activity.completionWithItemsHandler = { [weak self] _, completed, _, error in
                        guard let self else { return }
                        self.pendingPicker = nil
                        try? FileManager.default.removeItem(at: directory)
                        self.reply(id, result: completed, error: error?.localizedDescription)
                    }
                    presenter.present(activity, animated: true)
                    return
                }
                #if DEBUG
                if ProcessInfo.processInfo.arguments.contains("--smoke-test") || ProcessInfo.processInfo.arguments.contains("--portable-smoke-test") {
                    let evidence = store.root.appendingPathComponent("Smoke-" + name)
                    try content.write(to: evidence, options: .atomic); reply(id, result: evidence.lastPathComponent); return
                }
                #endif
                let picker = UIDocumentPickerViewController(forExporting: [file], asCopy: true)
                if UIDevice.current.userInterfaceIdiom == .phone { picker.modalPresentationStyle = .fullScreen }
                picker.delegate = self; pendingPicker = (id,"export",file)
                // Export can be requested from a web dialog; UIKit still presents from this controller.
                presenter.present(picker, animated: true)
            } catch { reply(id, error: error.localizedDescription) }
        case "openSceneBrowser", "updateSceneBrowser":
            do { try updateSceneBrowser(data["snapshot"], show: action == "openSceneBrowser"); reply(id, result: true) }
            catch { reply(id, error: error.localizedDescription) }
        case "showChangelog":
            web.evaluateJavaScript("document.getElementById('settings').close();document.getElementById('changelog').showModal()", completionHandler: nil); reply(id, result: true)
        case "reportBug":
            composeMail(body: "", attachment: nil); reply(id, result: true)
        case "getCrashReport":
            let report = diagnostics.get(); reply(id, result: ["id": report.id as Any? ?? NSNull(), "needsPrompt": report.needsPrompt, "log": report.log])
        case "dismissCrashReport":
            do { try diagnostics.dismiss(data["id"] as? String); reply(id, result: true) } catch { reply(id, error: error.localizedDescription) }
        case "logError":
            if let text = data["message"] as? String { try? diagnostics.record(text) }
            reply(id, result: true)
        case "sendCrashReport":
            guard let description = data["description"] as? String, !description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, description.utf16.count <= 600 else { reply(id, error: "Describe what happened in 600 characters or fewer."); return }
            guard MFMailComposeViewController.canSendMail() else { reply(id, error: "Set up Mail, or save the crash log and attach it to your own email."); return }
            composeMail(body: description, attachment: Data(errorLog.utf8)); reply(id, result: ["attachmentRequired": false])
        default: reply(id, error: "Unsupported request")
        }
    }
    private var sceneExportPresenter: UIViewController? {
        guard let presented = presentedViewController else { return self }
        guard let browser, let navigation = presented as? UINavigationController,
              navigation.viewControllers.first?.view === browser, navigation.presentedViewController == nil else { return nil }
        return navigation
    }
    private func handleScenePNGExport(_ action:String,id:String,payload:[String:Any]) {
        if action == "beginScenePNGExport" {
            guard pngExport == nil,pendingPicker == nil,sceneExportPresenter != nil,let name=payload["name"] as? String,let count=payload["count"] as? Int else {reply(id,error:"Finish the current dialog or export first.");return}
            do {let batch=try ScenicPNGExport(name:name,count:count);pngExport=batch;reply(id,result:batch.token)}catch{reply(id,error:error.localizedDescription)};return
        }
        guard let batch=pngExport,payload["token"] as? String == batch.token else {reply(id,error:"This scene export is no longer active.");return}
        if action == "appendScenePNGExport" {
            guard let index=payload["index"] as? Int,let name=payload["filename"] as? String,let encoded=payload["base64"] as? String,encoded.utf8.count<=32*1024*1024,let content=Data(base64Encoded:encoded) else {reply(id,error:"Invalid scene image.");return}
            queue.async {do {try batch.append(index:index,filename:name,data:content);DispatchQueue.main.async{self.reply(id,result:true)}}catch{DispatchQueue.main.async{self.reply(id,error:error.localizedDescription)}}};return
        }
        if action == "cancelScenePNGExport" {queue.async {batch.cancel();DispatchQueue.main.async{self.pngExport=nil;self.reply(id,result:false)}};return}
        guard pendingPicker == nil,let presenter=sceneExportPresenter else {reply(id,error:"Finish the current Files dialog first.");return}
        queue.async {
            do {let folder=try batch.prepareFilesExport();DispatchQueue.main.async {
                self.pngExport=nil;let picker=UIDocumentPickerViewController(forExporting:[folder],asCopy:true)
                if UIDevice.current.userInterfaceIdiom == .phone {picker.modalPresentationStyle = .fullScreen}
                picker.delegate=self;self.pendingPicker=(id,"export",folder);presenter.present(picker,animated:true)
            }}catch{DispatchQueue.main.async{self.reply(id,error:error.localizedDescription)}}
        }
    }
    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { finishPicker(nil) }
    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) { finishPicker(urls.first) }
    private func finishPicker(_ url: URL?) {
        guard let pending = pendingPicker else { return }; pendingPicker = nil
        defer { if let file = pending.file { try? FileManager.default.removeItem(at: file.deletingLastPathComponent()) } }
        guard let url else { reply(pending.id, result: false); return }
        if pending.kind == "export" { reply(pending.id, result: url.lastPathComponent); return }
        do { reply(pending.id, result: try filePayload(url)) }
        catch { reply(pending.id, error: error.localizedDescription) }
    }
    private func filePayload(_ url: URL) throws -> [String: Any] {
        let scoped = url.startAccessingSecurityScopedResource(); defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        let values = try url.resourceValues(forKeys: [.fileSizeKey,.isRegularFileKey,.isSymbolicLinkKey])
        guard values.isRegularFile == true, values.isSymbolicLink != true, (values.fileSize ?? 0) <= 60 * 1024 * 1024 else { throw NSError(domain: "Scenic", code: 2, userInfo: [NSLocalizedDescriptionKey: "Choose a regular file of 60 MB or less."]) }
        let data = try Data(contentsOf: url)
        guard data.count <= 60 * 1024 * 1024 else { throw NSError(domain: "Scenic", code: 2) }
        let ext = url.pathExtension.lowercased()
        let type = ["png":"image/png","jpg":"image/jpeg","jpeg":"image/jpeg","webp":"image/webp","csv":"text/csv"][ext] ?? "application/json"
        return ["name":url.lastPathComponent,"type":type,"base64":data.base64EncodedString()]
    }
    func openProject(_ url: URL) { pendingOpen = url; if ready { receivePendingProject() } }
    private func receivePendingProject() {
        guard let url = pendingOpen else { return }; pendingOpen = nil
        do {
            let payload = try filePayload(url)
            web.callAsyncJavaScript("return await window.ScenicIPad.receiveFile(item,'project')", arguments: ["item":payload], in: nil, in: .page, completionHandler: nil)
        } catch { showError(error.localizedDescription) }
    }
    private func updateSceneBrowser(_ value: Any?, show: Bool) throws {
        guard let snapshot = value as? [String: Any], snapshot["productionId"] is String, snapshot["active"] is String,
              let scenes = snapshot["scenes"] as? [[String: Any]],
              scenes.allSatisfy({$0["id"] is String && $0["title"] is String && $0["number"] is Int}),
              let data = try? JSONSerialization.data(withJSONObject: snapshot), data.count <= 2 * 1024 * 1024,
              let json = String(data: data, encoding: .utf8) else { throw NSError(domain: "Scenic", code: 3) }
        sceneSnapshot = snapshot
        if show && browser == nil {
            let controller = UIViewController(); controller.title = "Scenes"
            let browser = makeWeb(); self.browser = browser; controller.view = browser
            controller.navigationItem.rightBarButtonItem = UIBarButtonItem(systemItem: .done, primaryAction: UIAction { [weak self] _ in self?.dismissBrowser() })
            let nav = UINavigationController(rootViewController: controller); nav.modalPresentationStyle = .pageSheet
            nav.presentationController?.delegate = self
            present(nav, animated: true)
            browser.loadFileURL(root.appendingPathComponent("scene-browser.html"), allowingReadAccessTo: root)
        }
        browser?.evaluateJavaScript("window.ScenicSceneBrowserWindow?.render(\(json))", completionHandler: nil)
    }
    private func dismissBrowser() { dismiss(animated: true); browser = nil; sceneSnapshot = nil; web.evaluateJavaScript("window.ScenicSceneBrowser.closed()", completionHandler: nil) }
    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) { browser = nil; sceneSnapshot = nil; web.evaluateJavaScript("window.ScenicSceneBrowser.closed()", completionHandler: nil) }
    private func composeMail(body: String, attachment: Data?) {
        guard MFMailComposeViewController.canSendMail() else {
            if let url = URL(string: "mailto:alexanderhosier@squidproductions.org?subject=Scenic%20iOS%20feedback") { UIApplication.shared.open(url) }
            return
        }
        let mail = MFMailComposeViewController(); mail.mailComposeDelegate = self
        mail.setToRecipients(["alexanderhosier@squidproductions.org"]); mail.setSubject("Scenic iOS beta feedback"); mail.setMessageBody(body, isHTML: false)
        if let attachment { mail.addAttachmentData(attachment, mimeType: "text/plain", fileName: "Scenic-crash-report.txt") }
        present(mail, animated: true)
    }
    func mailComposeController(_ controller: MFMailComposeViewController, didFinishWith result: MFMailComposeResult, error: Error?) { controller.dismiss(animated: true) }
    func flush() {
        guard ready, backgroundTask == .invalid else { return }
        backgroundTask = UIApplication.shared.beginBackgroundTask(withName: "Save Scenic workspace") { [weak self] in self?.endBackgroundTask() }
        web.callAsyncJavaScript("if(window.scenicReady)await window.scenicFlush();return true", arguments: [:], in: nil, in: .page) { [weak self] _ in self?.endBackgroundTask() }
    }
    private func endBackgroundTask() { if backgroundTask != .invalid { UIApplication.shared.endBackgroundTask(backgroundTask); backgroundTask = .invalid } }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url, url.isFileURL, url.standardizedFileURL.path.hasPrefix(root.standardizedFileURL.path + "/") else { decisionHandler(.cancel); return }
        decisionHandler(.allow)
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard webView === web else { return }
        waitForEditor()
    }
    private func waitForEditor() {
        web.evaluateJavaScript("window.scenicLoaded===true") { [weak self] value, _ in
            guard let self else { return }
            if value as? Bool == true {
                self.ready = true; self.receivePendingProject(); self.runSmokeIfRequested()
            } else { DispatchQueue.main.asyncAfter(deadline: .now()+0.2) { [weak self] in self?.waitForEditor() } }
        }
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        try? diagnostics.record("WebKit stopped unexpectedly. The last autosaved workspace was restored.", interrupted: true)
        ready = false; webView.reload()
    }
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: "Scenic", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() }); present(alert, animated: true)
    }
    private func showError(_ message: String) {
        let alert = UIAlertController(title: "Scenic", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default)); present(alert, animated: true)
    }
    private func runSmokeIfRequested() {
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        let sceneTools = args.contains("--scene-tools-smoke-test") || args.contains("--verify-scene-tools-persistence")
        let clipboard = args.contains("--clipboard-smoke-test") || args.contains("--verify-clipboard-persistence") || args.contains("--clipboard-ui-test")
        let numbered = args.contains("--numbered-shots-smoke-test") || args.contains("--verify-numbered-persistence")
        guard !smokeStarted, sceneTools || clipboard || numbered || args.contains("--smoke-test") || args.contains("--verify-persistence") || args.contains("--portable-smoke-test") || args.contains("--palette-smoke-test") else { return }
        smokeStarted = true
        guard let url = Bundle.main.url(forResource: sceneTools ? "scene-tools-smoke" : clipboard ? "clipboard-smoke" : numbered ? "numbered-smoke" : args.contains("--palette-smoke-test") ? "palette-smoke" : args.contains("--portable-smoke-test") ? "portable-smoke" : "smoke", withExtension: "js"), let script = try? String(contentsOf: url, encoding: .utf8) else { return }
        let fixture = (try? String(contentsOf: Bundle.main.url(forResource: "desktop-fixture", withExtension: "scenic")!, encoding: .utf8)) ?? ""
        web.callAsyncJavaScript(script, arguments: ["verifyOnly":args.contains("--verify-persistence") || args.contains("--verify-numbered-persistence") || args.contains("--verify-clipboard-persistence") || args.contains("--verify-scene-tools-persistence"),"uiOnly":args.contains("--clipboard-ui-test"),"fixture":fixture,"clipboardFixture":(try? String(contentsOf: Bundle.main.url(forResource: "bathroom-clipboard", withExtension: "json")!, encoding: .utf8)) ?? ""], in: nil, in: .page) { [weak self] result in
            guard let self else { return }
            let output: [String: Any]
            switch result {
            case .success(let value): output = ["passed":true,"result":value,"editorErrors":self.errorLog]
            case .failure(let error): output = ["passed":false,"error":error.localizedDescription,"details":String(describing: (error as NSError).userInfo),"editorErrors":self.errorLog]
            }
            let file = self.store.root.appendingPathComponent(sceneTools ? (args.contains("--verify-scene-tools-persistence") ? "scene-tools-persistence-results.json" : "scene-tools-results.json") : clipboard ? (args.contains("--verify-clipboard-persistence") ? "clipboard-persistence-results.json" : "clipboard-results.json") : numbered ? (args.contains("--verify-numbered-persistence") ? "numbered-persistence-results.json" : "numbered-results.json") : args.contains("--palette-smoke-test") ? "palette-results.json" : args.contains("--portable-smoke-test") ? "portable-results.json" : args.contains("--verify-persistence") ? "persistence-results.json" : "smoke-results.json")
            if let data = try? JSONSerialization.data(withJSONObject: output, options: [.prettyPrinted,.sortedKeys]) { try? data.write(to: file, options: .atomic) }
        }
        #endif
    }
}
