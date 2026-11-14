// Pictures for the installer disk image's items:
//   render_dmg_icons <file> <size> [text]  the Privacy & Security shortcut's blue tile, with its words (\n for a
//                                          line break; made smaller until they fit)
//   render_dmg_icons <file> --from <icns>  an existing icon, e.g. the classic package box for the installer
//
// A Finder window can't hold a real button, only file icons, and Finder highlights an icon's whole square when it is
// clicked. So the button is a square blue tile filling its icon, the same size as the installer's icon: the highlight
// then hugs it like a pressed button.
import AppKit

let args = CommandLine.arguments
if args.count == 4, args[2] == "--from" {
    guard let icon = NSImage(contentsOfFile: args[3]), NSWorkspace.shared.setIcon(icon, forFile: args[1]) else {
        print("could not set the icon from \(args[3])")
        exit(1)
    }
    exit(0)
}
guard args.count == 3 || args.count == 4, let size = Double(args[2]) else {
    print("usage: render_dmg_icons <file> <size> [text] | render_dmg_icons <file> --from <icns>")
    exit(1)
}
let S = CGFloat(size)

let tile = NSImage(size: NSSize(width: S, height: S), flipped: false) { _ in
    let r = NSRect(x: 0, y: 0, width: S, height: S).insetBy(dx: S * 0.04, dy: S * 0.04)
    NSColor(srgbRed: 0x2a / 255.0, green: 0x6d / 255.0, blue: 0xf4 / 255.0, alpha: 1).setFill()
    NSBezierPath(roundedRect: r, xRadius: S * 0.19, yRadius: S * 0.19).fill()

    let para = NSMutableParagraphStyle()
    para.alignment = .center
    para.lineSpacing = 1
    let words = args.count == 4 ? args[3] : "Open Privacy\n& Security"
    func title(_ points: CGFloat) -> NSAttributedString {
        NSAttributedString(string: words, attributes: [
            .font: NSFont.systemFont(ofSize: points, weight: .semibold), .foregroundColor: NSColor.white, .paragraphStyle: para])
    }
    // Smaller until it fits the tile: some languages need longer words or three lines.
    var points = S * 0.118
    func box(_ p: CGFloat) -> NSRect {
        title(p).boundingRect(with: NSSize(width: r.width * 0.88, height: S * 2), options: [.usesLineFragmentOrigin])
    }
    // Each of its lines (\n) on one line, and not taller than the space under the padlock.
    func widest(_ p: CGFloat) -> CGFloat {
        words.components(separatedBy: "\n").map {
            NSAttributedString(string: $0, attributes: [.font: NSFont.systemFont(ofSize: p, weight: .semibold)]).size().width
        }.max() ?? 0
    }
    while points > S * 0.07, widest(points) > r.width * 0.88 || box(points).height > S * 0.42 {
        points -= 0.5
    }
    let text = title(points)
    let th = box(points).height

    // An open padlock above the words.
    let config = NSImage.SymbolConfiguration(pointSize: S * 0.2, weight: .semibold)
    let lock = NSImage(systemSymbolName: "lock.open.fill", accessibilityDescription: nil)?.withSymbolConfiguration(config)
    let gap = S * 0.06
    let lockSize = lock?.size ?? .zero
    let total = lockSize.height + gap + th
    let top = r.midY + total / 2
    if let lock {
        let white = NSImage(size: lockSize, flipped: false) { rect in
            lock.draw(in: rect)
            NSColor.white.set()
            rect.fill(using: .sourceAtop)
            return true
        }
        white.draw(in: NSRect(x: r.midX - lockSize.width / 2, y: top - lockSize.height, width: lockSize.width, height: lockSize.height))
    }
    text.draw(with: NSRect(x: r.midX - r.width * 0.44, y: top - lockSize.height - gap - th, width: r.width * 0.88, height: th),
              options: [.usesLineFragmentOrigin])
    return true
}

guard NSWorkspace.shared.setIcon(tile, forFile: args[1]) else {
    print("could not set the icon")
    exit(1)
}
