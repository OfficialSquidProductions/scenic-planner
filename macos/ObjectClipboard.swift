import AppKit
import WebKit

/// Keep scene clipboard commands in the native Edit menu, while preserving the
/// responder chain for text editing. Tests supply a private named pasteboard.
final class ScenicObjectClipboard: NSObject {
    private let webView: () -> WKWebView?
    private let isSceneWindow: () -> Bool
    private let pasteboard: NSPasteboard
    private let normalAction: (Selector) -> Void
    private var operations: [(@escaping () -> Void) -> Void] = []
    private var running = false
    init(webView: @escaping () -> WKWebView?, pasteboard: NSPasteboard = .general, isSceneWindow: @escaping () -> Bool = { true },
         normalAction: @escaping (Selector) -> Void = { NSApp.sendAction($0, to: nil, from: nil) }) {
        self.webView = webView; self.pasteboard = pasteboard; self.isSceneWindow = isSceneWindow; self.normalAction = normalAction
    }
    private func enqueue(_ action: @escaping (@escaping () -> Void) -> Void) {
        operations.append(action); advance()
    }
    private func advance() {
        guard !running, !operations.isEmpty else { return }
        running = true
        let action = operations.removeFirst()
        action { [weak self] in self?.running = false; self?.advance() }
    }
    @objc func copy(_ sender: Any?) {
        enqueue { [weak self] done in
            guard let self, let web = self.webView() else { done(); return }
            guard self.isSceneWindow() else { self.normalAction(#selector(NSText.copy(_:))); done(); return }
            web.callAsyncJavaScript("return window.ScenicObjectClipboard?.copy() ?? null", arguments: [:], in: nil, in: .page) { result in
                if case .success(let value) = result, let text = value as? String, (text.hasPrefix("SCENIC OBJECTS 1\n") || text.hasPrefix("SCENIC OBJECTS 2\n")), text.utf8.count <= 60 * 1024 * 1024 {
                    self.pasteboard.clearContents(); self.pasteboard.setString(text, forType: .string)
                } else { self.normalAction(#selector(NSText.copy(_:))) }
                done()
            }
        }
    }
    @objc func paste(_ sender: Any?) {
        enqueue { [weak self] done in
            guard let self, let web = self.webView() else { done(); return }
            guard self.isSceneWindow() else { self.normalAction(#selector(NSText.paste(_:))); done(); return }
            let text = self.pasteboard.string(forType: .string) ?? ""
            guard text.utf8.count <= 60 * 1024 * 1024 else { self.normalAction(#selector(NSText.paste(_:))); done(); return }
            web.callAsyncJavaScript("return window.ScenicObjectClipboard?.paste(text) ?? false", arguments: ["text": text], in: nil, in: .page) { result in
                if case .success(let value) = result, value as? Bool == true {} else { self.normalAction(#selector(NSText.paste(_:))) }
                done()
            }
        }
    }
}
