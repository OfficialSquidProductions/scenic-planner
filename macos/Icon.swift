import AppKit
let directory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let logo = NSImage(contentsOfFile: CommandLine.arguments[2])!
try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
for (name, size) in [("icon_16x16",16),("icon_16x16@2x",32),("icon_32x32",32),("icon_32x32@2x",64),("icon_128x128",128),("icon_128x128@2x",256),("icon_256x256",256),("icon_256x256@2x",512),("icon_512x512",512),("icon_512x512@2x",1024)] {
 let bitmap = NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:size,pixelsHigh:size,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
 NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep:bitmap)
 NSGraphicsContext.current!.cgContext.scaleBy(x:CGFloat(size)/1024,y:CGFloat(size)/1024)
 let frame=NSRect(x:40,y:40,width:944,height:944)
 let mask=NSBezierPath(roundedRect:frame,xRadius:205,yRadius:205)
 mask.addClip()
 NSColor.white.setFill();mask.fill()
 // Match Production Desk's logo scale within the shared 944-point tile.
 let logoFrame=NSRect(x:85,y:85,width:854,height:854)
 logo.draw(in:logoFrame,from:.zero,operation:.sourceOver,fraction:1)
 NSGraphicsContext.restoreGraphicsState()
 try bitmap.representation(using:.png,properties:[:])!.write(to:directory.appendingPathComponent(name+".png"))
}
