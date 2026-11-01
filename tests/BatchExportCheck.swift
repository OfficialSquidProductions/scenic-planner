import AppKit
import WebKit
import ImageIO
import UniformTypeIdentifiers

final class BatchExportCheck: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    let args=CommandLine.arguments
    var web:WKWebView!
    var window:NSWindow!
    var batch:ScenicPNGExport?
    var started=false
    var outputs:[URL]=[]
    var root:URL {URL(fileURLWithPath:args[3])}
    func applicationDidFinishLaunching(_ notification:Notification) {
        try? FileManager.default.createDirectory(at:root,withIntermediateDirectories:true)
        let config=WKWebViewConfiguration();config.userContentController.add(self,name:"scenic")
        web=WKWebView(frame:NSRect(x:0,y:0,width:1440,height:940),configuration:config);web.navigationDelegate=self
        window=NSWindow(contentRect:web.frame,styleMask:[.titled],backing:.buffered,defer:false);window.contentView=web
        let resources=URL(fileURLWithPath:args[1]);web.loadFileURL(resources.appendingPathComponent("index.html"),allowingReadAccessTo:resources)
        DispatchQueue.main.asyncAfter(deadline:.now()+60){self.finish(["passed":false,"error":"Renderer export timed out"]) }
    }
    func userContentController(_ userContentController:WKUserContentController,didReceive message:WKScriptMessage) {
        guard let p=message.body as? [String:Any],let id=p["id"] as? String,let action=p["action"] as? String else{return}
        var value:Any=true,error:String?
        do {switch action {
        case "readProject":value=["project":NSNull(),"recovered":false]
        case "getCrashReport":value=["needsPrompt":false,"log":""]
        case "beginScenePNGExport":let b=try ScenicPNGExport(name:p["name"] as! String,count:p["count"] as! Int,parent:root);batch=b;value=b.token
        case "appendScenePNGExport":guard let b=batch,p["token"] as? String==b.token else{throw ScenicPNGExport.failure("Stale token")};try b.append(index:p["index"] as! Int,filename:p["filename"] as! String,data:Data(base64Encoded:p["base64"] as! String)!)
        case "finishScenePNGExport":guard let b=batch,p["token"] as? String==b.token else{throw ScenicPNGExport.failure("Stale token")};let folder=try b.finish(in:root);outputs.append(folder);value=folder.lastPathComponent;batch=nil
        case "cancelScenePNGExport":batch?.cancel();batch=nil;value=false
        case "exportFile":let url=root.appendingPathComponent(p["filename"] as! String);try Data(base64Encoded:p["base64"] as! String)!.write(to:url,options:.atomic);outputs.append(url);value=url.lastPathComponent
        default:break
        }}catch let e {error=e.localizedDescription}
        let reply:[Any]=[id,value,error as Any? ?? NSNull()];let data=try! JSONSerialization.data(withJSONObject:reply);web.evaluateJavaScript("ScenicDesktop.receive(...\(String(data:data,encoding:.utf8)!))",completionHandler:nil)
    }
    func webView(_ webView:WKWebView,didFinish navigation:WKNavigation!){poll()}
    func poll(){web.evaluateJavaScript("window.scenicLoaded===true"){value,error in
        guard !self.started else{return};guard value as? Bool == true else{DispatchQueue.main.asyncAfter(deadline:.now()+0.1){self.poll()};return};self.started=true
        do {let script=try String(contentsOfFile:self.args[2],encoding:.utf8),fixture=try String(contentsOfFile:self.args[4],encoding:.utf8);self.web.callAsyncJavaScript(script,arguments:["fixture":fixture],in:nil,in:.page){result in
            switch result{case .success(let value):var proof=value as? [String:Any] ?? ["passed":false];do{proof["outputChecks"]=try self.verifyOutputs()}catch{proof["passed"]=false;proof["outputError"]=error.localizedDescription};self.finish(proof);case .failure(let error):self.finish(["passed":false,"error":error.localizedDescription,"details":String(describing:(error as NSError).userInfo)])}
        }}catch{self.finish(["passed":false,"error":error.localizedDescription])}
    }}
    func verifyOutputs() throws -> [String] {
        guard let pdf=outputs.first(where:{$0.pathExtension=="pdf"}),let document=CGPDFDocument(pdf as CFURL),document.numberOfPages==2 else {throw ScenicPNGExport.failure("PDF should contain exactly two ordered scene pages")}
        var checks=["Multipage PDF parses natively and contains two scene pages"]
        for n in 1...2 {
            guard let page=document.page(at:n),let context=CGContext(data:nil,width:1800,height:1250,bitsPerComponent:8,bytesPerRow:0,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipLast.rawValue) else{throw ScenicPNGExport.failure("Cannot render PDF page")}
            context.drawPDFPage(page);guard let image=context.makeImage() else{throw ScenicPNGExport.failure("No rendered page")}
            let file=root.appendingPathComponent("PDF-page-\(n).png"),dest=CGImageDestinationCreateWithURL(file as CFURL,UTType.png.identifier as CFString,1,nil)!;CGImageDestinationAddImage(dest,image,nil);guard CGImageDestinationFinalize(dest) else{throw ScenicPNGExport.failure("Cannot save rendered PDF evidence")}
            checks.append("PDF page \(n) rasterized at 1800×1250 for visual verification")
        }
        for folder in outputs.filter({$0.pathExtension.isEmpty}) {
            let files=try FileManager.default.contentsOfDirectory(at:folder,includingPropertiesForKeys:nil).sorted{$0.lastPathComponent<$1.lastPathComponent};guard files.count==2 else{throw ScenicPNGExport.failure("PNG batch count mismatch")}
            for file in files {guard let source=CGImageSourceCreateWithURL(file as CFURL,nil),let image=CGImageSourceCreateImageAtIndex(source,0,nil),image.width==1800,image.height==1250 else{throw ScenicPNGExport.failure("PNG output is not a complete rendered scene")}}
        };checks.append("Both repeated native PNG exports contain two distinct ordered full-size scene files")
        let maps=outputs.filter{$0.pathExtension=="png"}
        guard maps.count==2 else {throw ScenicPNGExport.failure("Expected normal and interrupted single-map PNG evidence")}
        for file in maps {guard let source=CGImageSourceCreateWithURL(file as CFURL,nil),let image=CGImageSourceCreateImageAtIndex(source,0,nil),image.width==1800,image.height==1250 else {throw ScenicPNGExport.failure("Single-map export is not a complete rendered PNG")}}
        checks.append("Normal and interrupted single-map exports decode natively as full-size PNG images")
        return checks
    }
    func finish(_ proof:[String:Any]){if let data=try? JSONSerialization.data(withJSONObject:proof,options:[.prettyPrinted,.sortedKeys]){try? data.write(to:root.appendingPathComponent("result.json"),options:.atomic)};NSApp.terminate(nil)}
}
@main struct Runner { static func main() {let app=NSApplication.shared;let delegate=BatchExportCheck();app.delegate=delegate;app.setActivationPolicy(.accessory);app.run()} }
