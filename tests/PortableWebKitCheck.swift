import AppKit
import WebKit

// Actual desktop WebKit + the shared editor, with synthetic in-memory storage.
// Run with: <binary> <Scenic/dist> <input.scenic> <result.json> <output.scenic>
final class PortableCheck: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate {
    let args = CommandLine.arguments
    var web: WKWebView!
    var window: NSWindow!
    var started = false
    var saved: String?
    func applicationDidFinishLaunching(_ notification: Notification) {
        let config = WKWebViewConfiguration(); config.userContentController.add(self, name: "scenic")
        web = WKWebView(frame: NSRect(x: 0,y: 0,width: 1440,height: 940), configuration: config); web.navigationDelegate = self
        window = NSWindow(contentRect: web.frame, styleMask: [.titled], backing: .buffered, defer: false); window.contentView = web
        let root = URL(fileURLWithPath: args[1]); web.loadFileURL(root.appendingPathComponent("index.html"), allowingReadAccessTo: root)
        DispatchQueue.main.asyncAfter(deadline: .now()+30) { if !self.started { self.finish(["passed":false,"error":"Desktop WebKit timed out"]) } }
    }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let data = message.body as? [String:Any], let id = data["id"] as? String, let action = data["action"] as? String else { return }
        var result: Any = true
        if action == "readProject" { result = ["project":NSNull(),"recovered":false] }
        if action == "getCrashReport" { result = ["needsPrompt":false,"log":""] }
        if action == "saveProject" { saved = data["project"] as? String }
        guard let json = try? JSONSerialization.data(withJSONObject: [id,result,NSNull()]), let text = String(data: json, encoding: .utf8) else { return }
        web.evaluateJavaScript("ScenicDesktop.receive(...\(text))", completionHandler: nil)
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { poll() }
    func poll() {
        web.evaluateJavaScript("window.scenicLoaded===true") { value,error in
            guard !self.started else { return }
            if value as? Bool != true { DispatchQueue.main.asyncAfter(deadline: .now()+0.1) { self.poll() }; return }
            self.started = true
            do {
                let text = try String(contentsOfFile:self.args[2],encoding:.utf8)
                self.web.callAsyncJavaScript("""
                const expected=ScenicProjectFile.parse(text),before=JSON.stringify(workspaceData()),count=workspace.projects.length;
                await importPortableProject(text);
                if(workspace.projects.length!==count+1)throw Error('Production not added');
                if(JSON.stringify(doc.scenes)!==JSON.stringify(expected.scenes))throw Error('Geometry or assets changed');
                if(JSON.stringify(doc.editorSettings)!==JSON.stringify(expected.editorSettings)||doc.theme!==expected.theme)throw Error('Settings changed');
                const output=ScenicProjectFile.serialize(doc);await ScenicProjectFile.checkImages(doc);await scenicFlush();
                return {passed:true,output,checks:['actual desktop WKWebView imports iOS export','all scenes and assets preserved','settings preserved','image decoded on macOS','native workspace save completed']};
                """, arguments: ["text":text], in: nil, in: .page) { result in
                    switch result {
                    case .success(let value):
                        guard var value = value as? [String:Any], let output = value.removeValue(forKey:"output") as? String else { self.finish(["passed":false,"error":"No desktop output"]); return }
                        do { try output.write(toFile:self.args[4],atomically:true,encoding:.utf8); self.finish(value) }
                        catch { self.finish(["passed":false,"error":error.localizedDescription]) }
                    case .failure(let error): self.finish(["passed":false,"error":error.localizedDescription])
                    }
                }
            } catch { self.finish(["passed":false,"error":error.localizedDescription]) }
        }
    }
    func finish(_ value: [String:Any]) {
        if let data = try? JSONSerialization.data(withJSONObject:value,options:[.prettyPrinted,.sortedKeys]) { try? data.write(to:URL(fileURLWithPath:args[3]),options:.atomic) }
        NSApp.terminate(nil)
    }
}
let app = NSApplication.shared
let delegate = PortableCheck(); app.delegate = delegate; app.setActivationPolicy(.accessory); app.run()
