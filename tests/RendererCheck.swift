import AppKit
import WebKit

// Actual desktop WebKit + the shared editor, with synthetic in-memory storage.
// Run with: <binary> <Scenic/dist> <test-script.js> <result.json>
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
        if action == "capturePalette" {
            web.takeSnapshot(with:nil) { image,error in
                if let tiff=image?.tiffRepresentation,let bitmap=NSBitmapImageRep(data:tiff),let png=bitmap.representation(using:.png,properties:[:]) {
                    let path=URL(fileURLWithPath:self.args[3]).deletingLastPathComponent().appendingPathComponent("screenshots/desktop-drag-feedback.png")
                    try? png.write(to:path)
                }
                self.reply(id,error == nil)
            }
            return
        }
        reply(id,result)
    }
    func reply(_ id: String,_ result: Any) {
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
                let script = try String(contentsOfFile:self.args[2],encoding:.utf8)
                self.web.callAsyncJavaScript(script, arguments: [:], in: nil, in: .page) { result in
                    switch result {
                    case .success(let value): self.finish(value as? [String:Any] ?? ["passed":false,"error":"No result"])
                    case .failure(let error): self.finish(["passed":false,"error":error.localizedDescription,"details":String(describing:(error as NSError).userInfo)])
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
