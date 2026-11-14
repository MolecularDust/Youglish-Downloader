#!/bin/bash
# Makes the installer disk image for YouGlish Downloader:
#
#     tools/installer/make_installer.sh [path/to/YouGlish Downloader.app]
#
# Output: src-tauri/target/release/bundle/installer/YouGlish-Downloader-Installer.dmg
#
# The app is signed ad hoc and not notarized (that takes a paid Apple Developer ID), so macOS blocks an app that was
# downloaded. An app put in place by Installer is not marked "downloaded from the internet", so the way round is an
# installer package that puts the app in /Applications and opens it. The package itself is unsigned and is blocked
# once; the disk image around it shows how to let it through: its window has the steps, the package, and a blue tile
# that opens the Privacy & Security page of System Settings, where "Open Anyway" is.
#
# The window's picture comes from tools/installer/render_dmg_background.swift and its text from
# tools/installer/pkg/text/en.json (the d_* keys; the installer's own pages come from the same file). Laying out
# the window goes through Finder, so the first run asks to let Terminal (or whatever runs this) control Finder, and a
# Finder window opens for a few seconds.
set -euo pipefail
cd "$(dirname "$0")/../.."

APP="${1:-src-tauri/target/release/bundle/macos/YouGlish Downloader.app}"
[ -d "$APP" ] || { echo "No app at $APP. Build it first (npm run package)." >&2; exit 1; }
codesign --verify --deep --strict "$APP" || { echo "The app's signature is not valid." >&2; exit 1; }
VERSION="$(python3 -c 'import json; print(json.load(open("package.json"))["version"])')"
HERE=tools/installer
OUT=src-tauri/target/release/bundle/installer
VOLUME="Install YouGlish Downloader"
PKG="$VOLUME.pkg"
SHORTCUT="Open System Settings"

if [ -e "/Volumes/$VOLUME" ]; then
    echo "Eject the disk named \"$VOLUME\" first (Finder sidebar), then run this again." >&2
    exit 1
fi

WORK="$(mktemp -d)"
MOUNT=""
cleanup() {
    [ -n "$MOUNT" ] && hdiutil detach "$MOUNT" -quiet -force 2>/dev/null || true
    rm -rf "$WORK"
}
trap cleanup EXIT

# --- The installer package -------------------------------------------------------------------------------------------
mkdir "$WORK/root"
# ditto keeps the app's signature and attributes intact (cp -R can break the signature).
ditto "$APP" "$WORK/root/YouGlish Downloader.app"
# Not relocatable: otherwise Installer would update a copy of the app it finds somewhere else (a build folder, say)
# instead of the one in /Applications.
pkgbuild --analyze --root "$WORK/root" "$WORK/components.plist" >/dev/null
python3 - "$WORK/components.plist" <<'PY'
import plistlib, sys
p = sys.argv[1]
components = plistlib.load(open(p, "rb"))
for c in components:
    c["BundleIsRelocatable"] = False
    c["BundleOverwriteAction"] = "upgrade"
plistlib.dump(components, open(p, "wb"))
PY
pkgbuild --root "$WORK/root" --component-plist "$WORK/components.plist" --install-location /Applications \
         --identifier local.mike.YouGlishDownloader --version "$VERSION" --ownership recommended \
         --scripts "$HERE/pkg/scripts" "$WORK/YouGlish-Downloader-component.pkg" >/dev/null
mkdir "$WORK/resources"
python3 "$HERE/pkg/make_pages.py" "$WORK/resources"
sed "s/@VERSION@/$VERSION/" "$HERE/pkg/distribution.xml" > "$WORK/distribution.xml"
productbuild --distribution "$WORK/distribution.xml" --resources "$WORK/resources" \
             --package-path "$WORK" "$WORK/YouGlish-Downloader.pkg" >/dev/null

# --- The disk image around it ----------------------------------------------------------------------------------------
swiftc -O "$HERE/render_dmg_background.swift" -o "$WORK/render_bg" 2>/dev/null
swiftc -O "$HERE/render_dmg_icons.swift" -o "$WORK/render_icons" 2>/dev/null
ICON_SIZE=112
# The installer gets the classic brown box with the yellow cube, which people know from other installers.
BOX=/System/Library/CoreServices/Installer.app/Contents/Resources/package.icns
JSON="$HERE/pkg/text/en.json"
text() { python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))[sys.argv[2]])' "$1" "$2"; }
TILE="$(text "$JSON" d_tile)"

# The window picture, sharp on Retina screens: one TIFF holding the 1x and 2x images. Its layout says where the two
# icons go and how tall the window is.
mkdir -p "$WORK/stage/.background"
"$WORK/render_bg" "$WORK/bg.png" 1 "$JSON" "$WORK/layout.sh" 0
"$WORK/render_bg" "$WORK/bg@2x.png" 2 "$JSON" "$WORK/layout.sh" 0
tiffutil -cathidpicheck "$WORK/bg.png" "$WORK/bg@2x.png" -out "$WORK/stage/.background/steps.tiff" 2>/dev/null
# shellcheck disable=SC1091
. "$WORK/layout.sh"
cp "$WORK/YouGlish-Downloader.pkg" "$WORK/stage/$PKG"

# A writable image first, so Finder can save the window's look (its .DS_Store) on it; compressed afterwards. Room for
# the package and some slack.
SIZE_MB=$(( $(du -m "$WORK/stage/$PKG" | cut -f1) + 40 ))
hdiutil create -volname "$VOLUME" -srcfolder "$WORK/stage" -fs HFS+ -format UDRW -size "${SIZE_MB}m" "$WORK/rw.dmg" >/dev/null
MOUNT="$(hdiutil attach "$WORK/rw.dmg" -readwrite -noverify -noautoopen | awk -F'\t' '/\/Volumes\// {print $NF}')"

# The blue tile: a shortcut to the Privacy & Security page of System Settings (where Open Anyway is). It leads to a file
# macOS ships with, not to anything downloaded, so it opens without a block. A Finder alias rather than a symbolic
# link, so it can carry its own picture (render_dmg_icons.swift).
osascript - "$MOUNT" "$SHORTCUT" >/dev/null <<'OSA'
on run argv
    tell application "Finder" to make new alias file at (POSIX file (item 1 of argv) as alias) ¬
        to (POSIX file "/System/Library/PreferencePanes/Security.prefPane" as alias) with properties {name:(item 2 of argv)}
end run
OSA
"$WORK/render_icons" "$MOUNT/$SHORTCUT" "$ICON_SIZE" "$TILE"
if [ -f "$BOX" ]; then "$WORK/render_icons" "$MOUNT/$PKG" --from "$BOX"; fi

# The window is 660 points wide and H tall inside, like the picture (the title bar adds 28); icon positions are their
# centres, from the top left.
osascript - "$VOLUME" "$PKG" "$SHORTCUT" "$ICON_SIZE" "$((80 + H + 28))" "$PKG_X" "$PKG_Y" "$TILE_X" "$TILE_Y" <<'OSA'
on run argv
    tell application "Finder"
        tell disk (item 1 of argv)
            open
            set current view of container window to icon view
            set toolbar visible of container window to false
            set statusbar visible of container window to false
            set bounds of container window to {200, 80, 860, (item 5 of argv) as integer}
            set opts to the icon view options of container window
            set arrangement of opts to not arranged
            set icon size of opts to (item 4 of argv) as integer
            set text size of opts to 13
            set background picture of opts to file ".background:steps.tiff"
            set position of item (item 2 of argv) of container window to {(item 6 of argv) as integer, (item 7 of argv) as integer}
            set position of item (item 3 of argv) of container window to {(item 8 of argv) as integer, (item 9 of argv) as integer}
            update without registering applications
            delay 1
            close
        end tell
    end tell
end run
OSA

# Finder writes .DS_Store a moment after the window closes.
for _ in 1 2 3 4 5 6 7 8 9 10; do [ -f "$MOUNT/.DS_Store" ] && break; sleep 0.5; done
[ -f "$MOUNT/.DS_Store" ] || { echo "Finder didn't save the window layout." >&2; exit 1; }
rm -rf "$MOUNT/.fseventsd"
sync
hdiutil detach "$MOUNT" -quiet
MOUNT=""

mkdir -p "$OUT"
DMG="$OUT/YouGlish-Downloader-Installer.dmg"
rm -f "$DMG"
hdiutil convert "$WORK/rw.dmg" -format UDZO -imagekey zlib-level=9 -o "$DMG" >/dev/null 2>&1
echo "Ready to share: $(pwd)/$DMG ($(du -h "$DMG" | cut -f1))"
