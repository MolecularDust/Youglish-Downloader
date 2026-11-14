// Draws the installer disk image's window background: the steps to get past the "can't be opened" block.
//
//     render_dmg_background <out.png> <scale> <text.json> <layout-out> <rtl 0|1>
//
// The text comes from tools/installer/pkg/text/<code>.json (the d_* keys). Translations take more or fewer lines, so the layout
// is measured: the picture's height and where Finder must put the installer (under step 1) and the blue tile (under
// step 3) go to <layout-out> as shell assignments (H, PKG_X, PKG_Y, TILE_X, TILE_Y) for make_installer.sh. Finder
// draws an icon's picture 16 points below the position it is given, and its click highlight a little above that.
// The bottom 70 points stay empty: a Finder with its tab bar and status bar showing has 52 less room. Right to left
// (Arabic, Persian) mirrors everything.
import AppKit

let args = CommandLine.arguments
guard args.count == 6, let scale = Int(args[2]),
      let data = FileManager.default.contents(atPath: args[3]),
      let t = try? JSONSerialization.jsonObject(with: data) as? [String: String] else {
    print("usage: render_dmg_background <out.png> <scale> <text.json> <layout-out> <rtl 0|1>")
    exit(1)
}
let rtl = args[5] == "1"
let W: CGFloat = 660

func rgb(_ hex: UInt32, _ alpha: CGFloat = 1) -> NSColor {
    NSColor(srgbRed: CGFloat(hex >> 16 & 0xff) / 255, green: CGFloat(hex >> 8 & 0xff) / 255,
            blue: CGFloat(hex & 0xff) / 255, alpha: alpha)
}
let ink = rgb(0x1d1d1f), soft = rgb(0x5f6368), accent = rgb(0x2a6df4)

/// Text with **bold** parts.
func styled(_ s: String, size: CGFloat, color: NSColor, weight: NSFont.Weight, align: NSTextAlignment) -> NSAttributedString {
    let para = NSMutableParagraphStyle()
    para.alignment = align
    para.lineSpacing = 2
    para.baseWritingDirection = rtl ? .rightToLeft : .leftToRight
    let out = NSMutableAttributedString()
    for (i, part) in s.components(separatedBy: "**").enumerated() {
        out.append(NSAttributedString(string: part, attributes: [
            .font: NSFont.systemFont(ofSize: size, weight: i % 2 == 1 ? .semibold : weight),
            .foregroundColor: color, .paragraphStyle: para]))
    }
    return out
}

func height(_ s: NSAttributedString, width: CGFloat) -> CGFloat {
    ceil(s.boundingRect(with: NSSize(width: width, height: 1000), options: [.usesLineFragmentOrigin, .usesFontLeading]).height)
}

/// A text box in top-left coordinates.
struct Line {
    let text: NSAttributedString
    let x: CGFloat, y: CGFloat, width: CGFloat
    var h: CGFloat { height(text, width: width) }
}

/// `x` is given for left to right and mirrored for right to left.
func line(_ key: String, x: CGFloat, y: CGFloat, width: CGFloat, size: CGFloat, color: NSColor = ink,
          weight: NSFont.Weight = .regular, center: Bool = false) -> Line {
    Line(text: styled(t[key] ?? key, size: size, color: color, weight: weight,
                      align: center ? .center : (rtl ? .right : .left)),
         x: rtl ? W - x - width : x, y: y, width: width)
}

// Layout, top to bottom.
let title = line("d_title", x: 30, y: 22, width: 600, size: 24, weight: .bold)
let subtitle = line("d_subtitle", x: 30, y: 56, width: 600, size: 13, color: soft)
let cardTop = subtitle.y + subtitle.h + 24
var y = cardTop + 18
var steps: [(n: Int, line: Line)] = []
var iconY: [CGFloat] = []
// Finder prints an icon's name under it and wraps a long one onto a second line (past about 180 points), which
// needs room before the next step.
func nameLines(_ name: String) -> CGFloat {
    let w = NSAttributedString(string: name, attributes: [.font: NSFont.systemFont(ofSize: 13)]).size().width
    return w > 180 ? 2 : 1
}
let iconNames = [(t["d_pkg"] ?? "Install YouGlish Downloader") + ".pkg", t["d_tile_name"] ?? "Open System Settings"]
for (n, key) in ["d_step1", "d_step2", "d_step3", "d_step4"].enumerated() {
    let l = line(key, x: 78, y: y, width: 530, size: 13)
    steps.append((n + 1, l))
    y += l.h
    if n == 0 || n == 2 {
        // An icon under steps 1 and 3, clear of Finder's click highlight; its name ends about 98 below its position.
        iconY.append(y + 68)
        y += 68 + 98 + (nameLines(iconNames[n / 2]) - 1) * 17
    } else {
        y += 26
    }
}
let cardBottom = y - 26 + 18
let footnote = line("d_footnote", x: 30, y: cardBottom + 18, width: 600, size: 12, color: soft, center: true)
let H = ceil(footnote.y + footnote.h + 70)
let iconX = rtl ? W - 140 : 140

try "H=\(Int(H))\nPKG_X=\(Int(iconX))\nPKG_Y=\(Int(iconY[0]))\nTILE_X=\(Int(iconX))\nTILE_Y=\(Int(iconY[1]))\n"
    .write(toFile: args[4], atomically: true, encoding: .utf8)

// Drawing.
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(W) * scale, pixelsHigh: Int(H) * scale,
                           bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                           colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
rep.size = NSSize(width: W, height: H)   // so the 2x image carries 144 dpi and Finder draws it at point size
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
// Draw in top-left coordinates, like Finder's icon positions.
let flip = NSAffineTransform()
flip.translateX(by: 0, yBy: H)
flip.scaleX(by: 1, yBy: -1)
flip.concat()

func draw(_ l: Line) {
    NSGraphicsContext.saveGraphicsState()
    let tr = NSAffineTransform()
    tr.translateX(by: l.x, yBy: l.y + l.h)
    tr.scaleX(by: 1, yBy: -1)
    tr.concat()
    l.text.draw(with: NSRect(x: 0, y: 0, width: l.width, height: l.h), options: [.usesLineFragmentOrigin, .usesFontLeading])
    NSGraphicsContext.restoreGraphicsState()
}

func badge(_ n: Int, centerY: CGFloat) {
    let cx = rtl ? W - 56 : 56
    accent.setFill()
    NSBezierPath(ovalIn: NSRect(x: cx - 13, y: centerY - 13, width: 26, height: 26)).fill()
    draw(Line(text: styled("\(n)", size: 14, color: .white, weight: .bold, align: .center), x: cx - 13, y: centerY - 9, width: 26))
}

func card(_ r: NSRect) {
    let path = NSBezierPath(roundedRect: r, xRadius: 14, yRadius: 14)
    NSGraphicsContext.saveGraphicsState()
    let shadow = NSShadow()
    shadow.shadowColor = rgb(0x000000, 0.10)
    shadow.shadowBlurRadius = 8
    shadow.shadowOffset = NSSize(width: 0, height: -2)
    shadow.set()
    NSColor.white.setFill()
    path.fill()
    NSGraphicsContext.restoreGraphicsState()
    rgb(0x000000, 0.08).setStroke()
    path.lineWidth = 1
    path.stroke()
}

NSGradient(starting: rgb(0xf7f8fb), ending: rgb(0xe8ecf3))!.draw(in: NSRect(x: 0, y: 0, width: W, height: H), angle: 90)
draw(title)
draw(subtitle)
card(NSRect(x: 30, y: cardTop, width: 600, height: cardBottom - cardTop))
for step in steps {
    badge(step.n, centerY: step.line.y + 8)
    draw(step.line)
}
draw(footnote)

NSGraphicsContext.restoreGraphicsState()
try rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[1]))
