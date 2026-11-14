#!/bin/bash
# Builds the FFmpeg and ffprobe that YouGlish Downloader bundles on Apple silicon, from pinned source.
#
#     scripts/ffmpeg-macos/build.sh <work-dir>
#
# Every component is cloned at the exact commit below, built as a static library, and archived with git archive
# (scripts/ffmpeg-macos/sources.txt lists the archives' SHA-256). Output: <work-dir>/out/{ffmpeg,ffprobe} and
# <work-dir>/sources/*.tar.gz. Needs Xcode command line tools, Homebrew: nasm pkg-config cmake meson ninja.
set -euo pipefail
WORK="${1:?usage: build.sh <work-dir>}"
export PATH="/opt/homebrew/bin:$PATH"
export MACOSX_DEPLOYMENT_TARGET=11.0
JOBS="$(sysctl -n hw.ncpu)"
PREFIX="$WORK/prefix"
SRC="$WORK/src"
mkdir -p "$SRC" "$PREFIX" "$WORK/sources" "$WORK/out"

# name, repository, pinned commit
PINS=(
  "x264 https://code.videolan.org/videolan/x264.git 0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee"
  "x265 https://bitbucket.org/multicoreware/x265_git.git e444744c03978c1fb4e037168967020cf2648427"
  "aom https://aomedia.googlesource.com/aom b141d9c45db236335351c8a4b2a14b3ade27c937"
  "libvpx https://chromium.googlesource.com/webm/libvpx 6df3ec34557879fff673706f4a1d9fbd0f3a6f0e"
  "ffmpeg https://git.ffmpeg.org/ffmpeg.git 946fcce07b6dcd0331c8cc609192aeff5e1924f8"
)
for pin in "${PINS[@]}"; do
  read -r name url commit <<<"$pin"
  if [ ! -d "$SRC/$name/.git" ]; then
    git clone -q "$url" "$SRC/$name"
  fi
  git -C "$SRC/$name" checkout -q "$commit"
  # Archive the exact commit (no .git, no build output): this is what the source offer ships.
  git -C "$SRC/$name" archive --format=tar.gz --prefix="$name-$commit/" -o "$WORK/sources/$name-$commit.tar.gz" "$commit"
done

export PKG_CONFIG_PATH="$PREFIX/lib/pkgconfig"

# x264 (GPLv2): static, no command-line tool.
cd "$SRC/x264"
./configure --prefix="$PREFIX" --enable-static --enable-pic --disable-cli --disable-opencl >/dev/null
make -j"$JOBS" >/dev/null && make install >/dev/null

# x265 (GPLv2): static, no command-line tool, 8/10/12-bit off to keep it smaller (the app uses 8-bit encodes).
cmake -S "$SRC/x265/source" -B "$WORK/build-x265" -G Ninja -DCMAKE_INSTALL_PREFIX="$PREFIX" \
  -DENABLE_SHARED=OFF -DENABLE_CLI=OFF -DCMAKE_POSITION_INDEPENDENT_CODE=ON -DHIGH_BIT_DEPTH=OFF >/dev/null
cmake --build "$WORK/build-x265" -j"$JOBS" >/dev/null && cmake --install "$WORK/build-x265" >/dev/null

# libaom (BSD-2): static AV1 encoder, no examples, tools or tests.
cmake -S "$SRC/aom" -B "$WORK/build-aom" -G Ninja -DCMAKE_INSTALL_PREFIX="$PREFIX" \
  -DBUILD_SHARED_LIBS=0 -DENABLE_EXAMPLES=0 -DENABLE_TESTS=0 -DENABLE_TOOLS=0 -DENABLE_DOCS=0 \
  -DCMAKE_POSITION_INDEPENDENT_CODE=ON >/dev/null
cmake --build "$WORK/build-aom" -j"$JOBS" >/dev/null && cmake --install "$WORK/build-aom" >/dev/null

# libvpx (BSD-3): static VP8/VP9 codec, no examples, tools or docs.
(cd "$WORK" && rm -rf build-vpx && mkdir build-vpx && cd build-vpx && \
  "$SRC/libvpx/configure" --prefix="$PREFIX" --enable-static --disable-shared --enable-pic \
    --disable-examples --disable-tools --disable-docs --disable-unit-tests >/dev/null && \
  make -j"$JOBS" >/dev/null && make install >/dev/null)

# FFmpeg 9.0.2 (LGPLv2.1+, GPLv2+ with the GPL encoders below, so version 3 applies): ffmpeg and ffprobe only.
(cd "$WORK" && rm -rf build-ffmpeg && mkdir build-ffmpeg && cd build-ffmpeg && \
  "$SRC/ffmpeg/configure" --prefix="$PREFIX" --pkg-config-flags=--static \
    --enable-gpl --enable-version3 --enable-static --disable-shared \
    --disable-doc --disable-debug --disable-ffplay \
    --enable-securetransport \
    --enable-libx264 --enable-libx265 --enable-libaom --enable-libvpx \
    --extra-ldflags="-L$PREFIX/lib" --extra-cflags="-I$PREFIX/include" >/dev/null && \
  make -j"$JOBS" ffmpeg ffprobe >/dev/null && \
  cp ffmpeg ffprobe "$WORK/out/")

echo "Built: $WORK/out/ffmpeg and $WORK/out/ffprobe"
