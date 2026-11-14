<!-- languages:start -->
<div align="center">

<details>
<summary><b>🌐 Language · Idioma · Langue · Sprache · Язык · 语言 · 言語 · 언어 · भाषा · لغة</b></summary>
<br>

<table>
  <tr>
    <td align="center"><a href="../../README.md">English</a></td>
    <td align="center"><a href="README.ar.md">العربية</a></td>
    <td align="center"><a href="README.bn.md">বাংলা</a></td>
    <td align="center"><a href="README.zh-Hans.md">简体中文</a></td>
    <td align="center"><a href="README.fil.md">Filipino</a></td>
  </tr>
  <tr>
    <td align="center"><a href="README.fr.md">Français</a></td>
    <td align="center"><a href="README.de.md">Deutsch</a></td>
    <td align="center"><a href="README.hi.md">हिन्दी</a></td>
    <td align="center"><a href="README.id.md">Bahasa Indonesia</a></td>
    <td align="center"><a href="README.it.md">Italiano</a></td>
  </tr>
  <tr>
    <td align="center"><a href="README.ja.md">日本語</a></td>
    <td align="center"><a href="README.ko.md">한국어</a></td>
    <td align="center"><a href="README.fa.md">فارسی</a></td>
    <td align="center"><a href="README.pt-BR.md">Português (Brasil)</a></td>
    <td align="center"><a href="README.ru.md">Русский</a></td>
  </tr>
  <tr>
    <td align="center"><a href="README.es.md">Español</a></td>
    <td align="center"><a href="README.te.md">తెలుగు</a></td>
    <td align="center"><a href="README.th.md">ไทย</a></td>
    <td align="center"><a href="README.tr.md">Türkçe</a></td>
    <td align="center"><b>Tiếng Việt</b></td>
  </tr>
</table>

</details>

</div>
<!-- languages:end -->

# YouGlish Downloader

### 🎧 Nghe. Cắt. Giữ lại khoảnh khắc.

**Tìm bất kỳ từ hay cụm từ nào trong lời nói thực tế, rồi lưu đúng đoạn clip đó.** YouGlish Downloader kết hợp tìm kiếm phát âm của YouGlish với công cụ cắt clip trên máy tính: tìm một cụm từ bằng ngôn ngữ và giọng bạn chọn, nghe người ta thực sự nói nó thế nào trong ngữ cảnh, và chỉ tải về khoảnh khắc bạn cần.

- 🎓 **Người học ngoại ngữ:** nghe những người thật nói câu đó trong các cuộc trò chuyện thật, không chỉ bản ghi trong sách giáo khoa.
- 👩‍🏫 **Giáo viên:** tạo các clip mẫu có thể phát ngay, phù hợp với bài học của bạn.
- 🔎 **Bất kỳ ai đang tìm một cụm từ:** tìm nơi cụm từ đó được nói trên YouTube bằng ngôn ngữ bạn chọn, và chỉ giữ lại khoảnh khắc đó.

Chỉ tải về nội dung mà bạn sở hữu hoặc được phép tải về.

![Ứng dụng YouGlish Downloader: tìm cụm từ, cắt clip và thêm vào hàng đợi tải về](../images/app-preview.webp)

Phiên bản máy tính của TubeCutter để tìm thủ công các ví dụ về lời nói bằng tiện ích YouGlish chính thức. Dự án này có mã định danh ứng dụng và tùy chọn riêng.

## Tải về

- **Windows:** [Tải về bản phát hành mới nhất](https://github.com/MolecularDust/Youglish-Downloader/releases/latest). Chọn cài đặt thông thường hoặc bản sao portable.
- **macOS (Apple silicon):** [Tải về bản phát hành macOS](https://github.com/MolecularDust/Youglish-Downloader/releases/tag/v0.3.0-macos).

## Thiết lập truy cập YouTube

1. Mở ứng dụng và nhấp **Account & Settings**.
2. Trong **YouGlish playback account**, nhấp **1. Sign in to Google ↗**, rồi **2. Connect YouTube ↗**, và chọn kênh của bạn nếu được hỏi. Đóng cửa sổ tài khoản khi xong. **Check playback ↗** phát một video mẫu để xác nhận mọi thứ hoạt động.
3. Trong **Subtitle and download authentication**, chọn **App’s YouTube session** cho **Download authentication**.

Bạn đã sẵn sàng dùng YouGlish Downloader.

Để dùng một trình duyệt bạn đã đăng nhập sẵn, hãy chọn nó trong **Download authentication**. Trên Windows, hãy đóng trình duyệt đó trước khi tìm: các trình duyệt dựa trên Chromium khóa tệp cookie khi đang chạy, vì vậy phiên riêng của ứng dụng là lựa chọn đáng tin cậy hơn ở đó. Chỉ dùng tài khoản của chính bạn. Không nhập hoặc chia sẻ cookie của người khác.

Bạn cũng có thể giữ **Anonymous**, nhưng kiểm tra chống bot của YouTube nghiêm ngặt hơn với truy cập ẩn danh và một số video sẽ không tải được.

## Sử dụng

Mở `src-tauri/target/debug/bundle/macos/YouGlish Downloader.app` sau khi biên dịch, hoặc chạy `npm run desktop` để phát triển.

1. Nhập cụm từ tìm kiếm, ngôn ngữ và giọng tùy chọn, rồi tìm kiếm. Mặc định là tiếng Anh với mọi giọng.
2. Duyệt và nghe trong YouGlish. Phụ đề của mẫu đã chọn sẽ điền vào File Name và vẫn giữ nguyên trong khi phát.
3. Sửa File Name thành một cụm từ trong phụ đề của video. Nhấp **Look Up** hoặc nhấn Enter. Sửa hoặc rời khỏi ô không bắt đầu tra cứu. Nút hiển thị vòng quay cho đến khi khớp thành công hoặc thất bại. Văn bản này cũng là tên tệp đầu ra (bộ chứa sẽ thêm phần mở rộng).
4. Phụ đề được cung cấp được ưu tiên. Chỉ phụ đề tự động gốc chưa dịch được dùng làm phương án thay thế. Việc khớp bỏ qua chữ hoa/thường, dấu câu và kiểu dấu nháy đơn; nó bao phủ các cue liền kề và loại bỏ văn bản cuộn trùng lặp.
5. Khi chọn video, In/Out trước tiên được đặt về 0 và toàn bộ thời lượng video. Một kết quả khớp đặt In/Out theo biên của đoạn phụ đề chứa nó, không có phần đệm. Nhiều kết quả khớp thì phải chọn một lần xuất hiện. Không có kết quả khớp thì thời gian hiện có không đổi. Đây là biên của đoạn phụ đề, không phải căn chỉnh âm thanh ở cấp từ.
6. Dùng mũi tên nhỏ để thay đổi một trong hai biên hoặc độ dài đúng một giây. **Reset** khôi phục toàn bộ video và xóa đầu vào không hợp lệ cùng lỗi xác thực. Biên không hợp lệ bị từ chối. Bạn cũng có thể gõ trực tiếp thời gian, gõ Length (thời lượng clip có đệm hiển thị trong ô; Out sẽ tự điều chỉnh theo), kéo thanh thời gian, hoặc dùng **Preview selection**.
7. **Preview selection** tạm thời thay vùng tiện ích bằng trình phát YouTube nhúng để định vị chính xác. **Back to YouGlish results** quay lại duyệt. **Set In** và **Set Out** cần bản xem trước này vì YouGlish không cung cấp vị trí phát tuyệt đối có tài liệu.
8. Cài đặt tải về ban đầu được thu gọn. Độ phân giải mặc định là cao nhất có sẵn đến 1080p. Khi tải về, yêu cầu 1080p cũng cho phép độ phân giải nguồn thấp hơn có sẵn. Các độ phân giải khác bạn chọn vẫn chính xác.
9. Chọn thư mục đích và thêm phần đã chọn vào hàng đợi tải về tuần tự kế thừa. Giữ nguyên **Precise Cut**, tạm dừng/tiếp tục/hủy/thử lại, nhúng phụ đề và hiển thị trong Finder.

**Account & Settings** mặc định là ẩn danh. Các trình duyệt được hỗ trợ đã cài đặt được nhận diện ở vị trí ứng dụng thông thường của macOS. Chọn một trình duyệt cho phép yt-dlp đọc kho cookie cục bộ của nó để lấy phụ đề và tải về; cookie không được đưa vào YouGlish hay lưu trong cài đặt. Tiện ích dùng phiên WebView riêng. Tùy chọn ứng dụng và danh tính hàng đợi tách biệt với TubeCutter.

## Ngôn ngữ

Giao diện ứng dụng có sẵn bằng tiếng Anh và 19 ngôn ngữ khác: tiếng Ả Rập, Bengal, Trung (giản thể), Philippines, Pháp, Đức, Hindi, Indonesia, Ý, Nhật, Hàn, Ba Tư, Bồ Đào Nha (Brazil), Nga, Tây Ban Nha, Telugu, Thái, Thổ Nhĩ Kỳ và Việt. Mặc định theo ngôn ngữ của hệ thống. Để chọn ngôn ngữ khác, mở **Account & Settings → Language**; lựa chọn có hiệu lực ngay và được ghi nhớ. Tiếng Ả Rập và Ba Tư được sắp xếp từ phải sang trái.

Bản dịch nằm trong `src/locales/<code>.json`, và văn bản tiếng Anh đóng vai trò khóa. Để thêm hoặc sửa một bản dịch, xem [ghi chú bản địa hóa](../LOCALIZATION.md).

## Phát triển

Ghi chú xây dựng chỉ có bằng tiếng Anh: xem [README tiếng Anh](../../README.md#development).
