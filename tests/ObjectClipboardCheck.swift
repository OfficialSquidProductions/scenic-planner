import AppKit
import WebKit

final class ObjectClipboardCheck: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate {
    let args = CommandLine.arguments
    let board = NSPasteboard(name: .init("org.squidproductions.scenic.clipboard-qa." + UUID().uuidString))
    var web: WKWebView!
    var window: NSWindow!
    var started = false
    var saved: String?
    var copies = 0, pastes = 0
    var sceneWindow = true
    lazy var clipboard = ScenicObjectClipboard(webView: { [weak self] in self?.web }, pasteboard: board, isSceneWindow: { [weak self] in self?.sceneWindow ?? false }, normalAction: { [weak self] action in
        if action == #selector(NSText.copy(_:)) { self?.copies += 1 }
        if action == #selector(NSText.paste(_:)) { self?.pastes += 1 }
    })
    func applicationDidFinishLaunching(_ notification: Notification) {
        let config = WKWebViewConfiguration(); config.userContentController.add(self, name: "scenic")
        web = WKWebView(frame: NSRect(x: 0,y: 0,width: 1440,height: 940), configuration: config); web.navigationDelegate = self
        window = NSWindow(contentRect: web.frame, styleMask: [.titled], backing: .buffered, defer: false); window.contentView = web
        let root = URL(fileURLWithPath: args[1]); web.loadFileURL(root.appendingPathComponent("index.html"), allowingReadAccessTo: root)
        DispatchQueue.main.asyncAfter(deadline: .now()+60) { if !self.started { self.finish(["passed":false,"error":"WebKit did not finish loading"]) } }
    }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let data=message.body as? [String:Any],let id=data["id"] as? String,let action=data["action"] as? String else{return}
        var result: Any = true
        switch action {
        case "readProject": result=["project":NSNull(),"recovered":false]
        case "saveProject": saved=data["project"] as? String
        case "getCrashReport": result=["needsPrompt":false,"log":""]
        case "qaCopy": clipboard.copy(nil)
        case "qaPaste": clipboard.paste(nil)
        case "qaClipboardState": result=["text":board.string(forType:.string) ?? "","copies":copies,"pastes":pastes]
        case "qaSetClipboard": board.clearContents();board.setString(data["text"] as? String ?? "",forType:.string)
        case "qaSceneWindow": sceneWindow=data["enabled"] as? Bool ?? true
        case "qaSaved": result=saved as Any? ?? NSNull()
        default: break
        }
        guard let json=try? JSONSerialization.data(withJSONObject:[id,result,NSNull()]),let text=String(data:json,encoding:.utf8) else{return}
        web.evaluateJavaScript("ScenicDesktop.receive(...\(text))",completionHandler:nil)
    }
    func webView(_ webView:WKWebView,didFinish navigation:WKNavigation!){poll()}
    func poll(){
        web.evaluateJavaScript("window.scenicLoaded===true"){value,error in
            guard !self.started else{return}
            if value as? Bool != true {DispatchQueue.main.asyncAfter(deadline:.now()+0.1){self.poll()};return}
            self.started=true
            do{
                let script=try String(contentsOfFile:self.args[2],encoding:.utf8),fixture=try String(contentsOfFile:self.args[4],encoding:.utf8)
                self.web.callAsyncJavaScript(script,arguments:["clipboardFixture":fixture],in:nil,in:.page){result in
                    switch result{
                    case .success(let value):self.finish(value as? [String:Any] ?? ["passed":false,"error":"No test result"])
                    case .failure(let error):self.finish(["passed":false,"error":error.localizedDescription,"details":String(describing:(error as NSError).userInfo)])
                    }
                }
            }catch{self.finish(["passed":false,"error":error.localizedDescription])}
        }
    }
    func finish(_ value:[String:Any]){
        if let data=try? JSONSerialization.data(withJSONObject:value,options:[.prettyPrinted,.sortedKeys]){try? data.write(to:URL(fileURLWithPath:args[3]),options:.atomic)}
        board.releaseGlobally();NSApp.terminate(nil)
    }
}
@main enum ClipboardTestMain {
    static func main(){let app=NSApplication.shared,delegate=ObjectClipboardCheck();app.delegate=delegate;app.setActivationPolicy(.accessory);app.run()}
}
