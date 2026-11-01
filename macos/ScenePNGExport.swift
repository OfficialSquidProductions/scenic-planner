import Foundation
import ImageIO

/// A bounded, ordered PNG batch. Only its fresh staging directory is ever
/// removed; destination folders are never merged or overwritten.
final class ScenicPNGExport {
    let token = UUID().uuidString
    let count: Int
    let name: String
    let staging: URL
    private(set) var completed = 0
    private var total = 0
    private var names = Set<String>()
    init(name: String, count: Int, parent: URL? = nil) throws {
        guard (1...100).contains(count), !name.isEmpty, name.utf8.count <= 140,
              name != ".", name != "..", name.range(of: #"^[a-zA-Z0-9 _-]+$"#, options: .regularExpression) != nil else { throw Self.failure("Invalid scene export.") }
        self.count = count; self.name = name + " - scenes"
        staging = (parent ?? FileManager.default.temporaryDirectory).appendingPathComponent(".Scenic-export-" + token)
        try FileManager.default.createDirectory(at: staging, withIntermediateDirectories: false)
    }
    static func failure(_ text: String) -> NSError { NSError(domain: "Scenic.Export", code: 1, userInfo: [NSLocalizedDescriptionKey:text]) }
    func append(index: Int, filename: String, data: Data) throws {
        guard index == completed, completed < count, filename.utf8.count <= 180,
              filename.range(of: #"^[0-9]{3} - [a-zA-Z0-9 _-]+\.png$"#, options: .regularExpression) != nil,
              !names.contains(filename.lowercased()), data.count <= 24 * 1024 * 1024,
              total + data.count <= 80 * 1024 * 1024,
              data.starts(with: [137,80,78,71,13,10,26,10]),
              let source = CGImageSourceCreateWithData(data as CFData,nil),
              let image = CGImageSourceCreateImageAtIndex(source,0,nil), image.width == 1800, image.height == 1250 else { throw Self.failure("Invalid, oversized or out-of-order scene image.") }
        try data.write(to: staging.appendingPathComponent(filename), options: .withoutOverwriting)
        names.insert(filename.lowercased()); completed += 1; total += data.count
    }
    func finish(in parent: URL) throws -> URL {
        guard completed == count else { throw Self.failure("Some scenes have not finished exporting.") }
        for i in 1...10000 {
            let destination = parent.appendingPathComponent(name + (i == 1 ? "" : " (\(i))"))
            if FileManager.default.fileExists(atPath: destination.path) { continue }
            do { try FileManager.default.moveItem(at: staging, to: destination); return destination }
            catch {
                if FileManager.default.fileExists(atPath: destination.path) { continue }
                throw error
            }
        }
        throw Self.failure("Choose another folder; too many exports already use this name.")
    }
    /// iOS exports the completed folder with the standard Files picker. Its fresh
    /// wrapper makes cancellation cleanup safe and leaves existing files alone.
    func prepareFilesExport() throws -> URL {
        guard completed == count else { throw Self.failure("Some scenes have not finished exporting.") }
        let wrapper = FileManager.default.temporaryDirectory.appendingPathComponent("Scenic-Files-" + token)
        try FileManager.default.createDirectory(at: wrapper, withIntermediateDirectories: false)
        let folder = wrapper.appendingPathComponent(name)
        do { try FileManager.default.moveItem(at: staging, to: folder); return folder }
        catch { try? FileManager.default.removeItem(at: wrapper); throw error }
    }
    func cancel() { try? FileManager.default.removeItem(at: staging) }
}
