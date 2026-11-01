import UIKit
import WebKit

/// Route scene-item commands through the validated editor copy format. Text
/// editing keeps WebKit's normal responder behavior.
final class ScenicClipboardWebView: WKWebView {
    var objectPasteboard: UIPasteboard = .general
    private var operations: [(@escaping () -> Void) -> Void] = []
    private var running = false
    #if DEBUG
    private(set) var normalCopies = 0, normalPastes = 0
    #endif
    override var keyCommands: [UIKeyCommand]? {
        let copy = UIKeyCommand(title: "Copy", action: #selector(copy(_:)), input: "c", modifierFlags: .command)
        let paste = UIKeyCommand(title: "Paste", action: #selector(paste(_:)), input: "v", modifierFlags: .command)
        copy.wantsPriorityOverSystemBehavior = true; paste.wantsPriorityOverSystemBehavior = true
        return [copy, paste] + (super.keyCommands ?? [])
    }
    override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
        if action == #selector(copy(_:)) || action == #selector(paste(_:)) { return true }
        return super.canPerformAction(action, withSender: sender)
    }
    private func enqueue(_ action: @escaping (@escaping () -> Void) -> Void) {
        operations.append(action); advance()
    }
    private func advance() {
        guard !running, !operations.isEmpty else { return }
        running = true
        operations.removeFirst()() { [weak self] in self?.running = false; self?.advance() }
    }
    private func normalCopy(_ sender: Any?) {
        #if DEBUG
        normalCopies += 1
        #endif
        super.copy(sender)
    }
    private func normalPaste(_ sender: Any?) {
        #if DEBUG
        normalPastes += 1
        #endif
        super.paste(sender)
    }
    override func copy(_ sender: Any?) {
        enqueue { [weak self] done in
            guard let self else { done(); return }
            self.callAsyncJavaScript("return window.ScenicObjectClipboard?.copy() ?? null", arguments: [:], in: nil, in: .page) { result in
                if case .success(let value) = result, let text = value as? String,
                   text.hasPrefix("SCENIC OBJECTS 1\n"), text.utf8.count <= 60 * 1024 * 1024 {
                    self.objectPasteboard.string = text
                } else { self.normalCopy(sender) }
                done()
            }
        }
    }
    override func paste(_ sender: Any?) {
        enqueue { [weak self] done in
            guard let self else { done(); return }
            let text = self.objectPasteboard.string ?? ""
            guard text.utf8.count <= 60 * 1024 * 1024 else { self.normalPaste(sender); done(); return }
            self.callAsyncJavaScript("return window.ScenicObjectClipboard?.paste(text) ?? false", arguments: ["text":text], in: nil, in: .page) { result in
                if case .success(let value) = result, value as? Bool == true {} else { self.normalPaste(sender) }
                done()
            }
        }
    }
}
