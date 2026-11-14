; Setup wrapper offering a regular per-user install or a portable copy.
; Built by scripts/package-windows-installer.mjs, which passes PAYLOAD, OUTFILE, ICON and VERSION.
Unicode true
!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "nsDialogs.nsh"

!ifndef PAYLOAD
  !error "Pass /DPAYLOAD=<folder> to makensis"
!endif
!ifndef OUTFILE
  !error "Pass /DOUTFILE=<installer path> to makensis"
!endif
!ifndef ICON
  !error "Pass /DICON=<icon.ico> to makensis"
!endif
!ifndef VERSION
  !define VERSION "0.1.0"
!endif

!define APPNAME "YouGlish Downloader"
!define EXE "YouGlish Downloader.exe"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"

Name "${APPNAME} ${VERSION}"
OutFile "${OUTFILE}"
Icon "${ICON}"
UninstallIcon "${ICON}"
InstallDir "$LOCALAPPDATA\Programs\${APPNAME}"
RequestExecutionLevel user
SetCompressor /SOLID lzma

!define MUI_ICON "${ICON}"
!define MUI_UNICON "${ICON}"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"

Var Mode
Var RadioInstall
Var RadioPortable

!insertmacro MUI_PAGE_WELCOME
Page custom ModePage ModePageLeave
!define MUI_PAGE_CUSTOMFUNCTION_PRE DirectoryPre
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; English first: NSIS uses it when the computer's language has no match.
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Arabic"
!insertmacro MUI_LANGUAGE "Farsi"
!insertmacro MUI_LANGUAGE "German"
!insertmacro MUI_LANGUAGE "Spanish"
!insertmacro MUI_LANGUAGE "French"
!insertmacro MUI_LANGUAGE "Hindi"
!insertmacro MUI_LANGUAGE "Indonesian"
!insertmacro MUI_LANGUAGE "Italian"
!insertmacro MUI_LANGUAGE "Japanese"
!insertmacro MUI_LANGUAGE "Korean"
!insertmacro MUI_LANGUAGE "PortugueseBR"
!insertmacro MUI_LANGUAGE "Russian"
!insertmacro MUI_LANGUAGE "Thai"
!insertmacro MUI_LANGUAGE "Turkish"
!insertmacro MUI_LANGUAGE "Vietnamese"
!insertmacro MUI_LANGUAGE "SimpChinese"

; Setup-page text. Bengali, Filipino and Telugu have no NSIS language file, so those computers see English.
LangString SETUP_MODE_TEXT ${LANG_ENGLISH} "Choose how to set up YouGlish Downloader on this computer."
LangString SETUP_MODE_TEXT ${LANG_ARABIC} "اختر طريقة إعداد YouGlish Downloader على هذا الكمبيوتر."
LangString SETUP_MODE_TEXT ${LANG_FARSI} "نحوه راه‌اندازی YouGlish Downloader روی این رایانه را انتخاب کنید."
LangString SETUP_MODE_TEXT ${LANG_GERMAN} "Wählen Sie, wie YouGlish Downloader auf diesem Computer eingerichtet wird."
LangString SETUP_MODE_TEXT ${LANG_SPANISH} "Elija cómo instalar YouGlish Downloader en este equipo."
LangString SETUP_MODE_TEXT ${LANG_FRENCH} "Choisissez comment installer YouGlish Downloader sur cet ordinateur."
LangString SETUP_MODE_TEXT ${LANG_HINDI} "इस कंप्यूटर पर YouGlish Downloader सेट करने का तरीका चुनें।"
LangString SETUP_MODE_TEXT ${LANG_INDONESIAN} "Pilih cara menyiapkan YouGlish Downloader di komputer ini."
LangString SETUP_MODE_TEXT ${LANG_ITALIAN} "Scegli come configurare YouGlish Downloader su questo computer."
LangString SETUP_MODE_TEXT ${LANG_JAPANESE} "このコンピューターへの YouGlish Downloader のセットアップ方法を選んでください。"
LangString SETUP_MODE_TEXT ${LANG_KOREAN} "이 컴퓨터에 YouGlish Downloader를 설정할 방법을 선택하세요."
LangString SETUP_MODE_TEXT ${LANG_PORTUGUESEBR} "Escolha como configurar o YouGlish Downloader neste computador."
LangString SETUP_MODE_TEXT ${LANG_RUSSIAN} "Выберите способ установки YouGlish Downloader на этом компьютере."
LangString SETUP_MODE_TEXT ${LANG_THAI} "เลือกวิธีตั้งค่า YouGlish Downloader บนคอมพิวเตอร์เครื่องนี้"
LangString SETUP_MODE_TEXT ${LANG_TURKISH} "YouGlish Downloader'ı bu bilgisayara nasıl kuracağınızı seçin."
LangString SETUP_MODE_TEXT ${LANG_VIETNAMESE} "Chọn cách thiết lập YouGlish Downloader trên máy tính này."
LangString SETUP_MODE_TEXT ${LANG_SIMPCHINESE} "选择在此计算机上设置 YouGlish Downloader 的方式。"

LangString SETUP_INSTALL_TEXT ${LANG_ENGLISH} "Install normally: Start menu shortcut and an entry in Apps & features. No administrator rights needed."
LangString SETUP_INSTALL_TEXT ${LANG_ARABIC} "التثبيت العادي: اختصار في قائمة ابدأ وإدخال في التطبيقات والميزات. لا تحتاج إلى صلاحيات المسؤول."
LangString SETUP_INSTALL_TEXT ${LANG_FARSI} "نصب معمولی: میان‌بر در منوی Start و ثبت در Apps & features. نیازی به دسترسی مدیر نیست."
LangString SETUP_INSTALL_TEXT ${LANG_GERMAN} "Normal installieren: Startmenü-Verknüpfung und Eintrag unter Apps und Features. Keine Administratorrechte nötig."
LangString SETUP_INSTALL_TEXT ${LANG_SPANISH} "Instalar normalmente: acceso directo en el menú Inicio y entrada en Aplicaciones y características. No se necesitan derechos de administrador."
LangString SETUP_INSTALL_TEXT ${LANG_FRENCH} "Installation normale : raccourci dans le menu Démarrer et entrée dans Applications et fonctionnalités. Droits d’administrateur non requis."
LangString SETUP_INSTALL_TEXT ${LANG_HINDI} "सामान्य इंस्टॉल: स्टार्ट मेन्यू शॉर्टकट और ऐप्स और सुविधाएँ में एंट्री। व्यवस्थापक अधिकारों की ज़रूरत नहीं है।"
LangString SETUP_INSTALL_TEXT ${LANG_INDONESIAN} "Instal normal: pintasan di menu Start dan entri di Aplikasi & fitur. Tidak perlu hak administrator."
LangString SETUP_INSTALL_TEXT ${LANG_ITALIAN} "Installazione normale: collegamento nel menu Start e voce in App e funzionalità. Non servono privilegi di amministratore."
LangString SETUP_INSTALL_TEXT ${LANG_JAPANESE} "通常インストール: スタート メニューのショートカットと「アプリと機能」への登録を行います。管理者権限は不要です。"
LangString SETUP_INSTALL_TEXT ${LANG_KOREAN} "일반 설치: 시작 메뉴 바로 가기와 앱 및 기능에 항목을 추가합니다. 관리자 권한은 필요하지 않습니다."
LangString SETUP_INSTALL_TEXT ${LANG_PORTUGUESEBR} "Instalar normalmente: atalho no menu Iniciar e entrada em Aplicativos e recursos. Não são necessários direitos de administrador."
LangString SETUP_INSTALL_TEXT ${LANG_RUSSIAN} "Обычная установка: ярлык в меню «Пуск» и запись в «Приложения и возможности». Права администратора не нужны."
LangString SETUP_INSTALL_TEXT ${LANG_THAI} "ติดตั้งแบบปกติ: สร้างทางลัดในเมนู Start และรายการใน Apps & features ไม่ต้องใช้สิทธิ์ผู้ดูแลระบบ"
LangString SETUP_INSTALL_TEXT ${LANG_TURKISH} "Normal kurulum: Başlat menüsü kısayolu ve Uygulamalar ve özellikler içinde kayıt. Yönetici hakları gerekmez."
LangString SETUP_INSTALL_TEXT ${LANG_VIETNAMESE} "Cài đặt thông thường: có lối tắt trong menu Start và mục trong Apps & features. Không cần quyền quản trị viên."
LangString SETUP_INSTALL_TEXT ${LANG_SIMPCHINESE} "正常安装：在“开始”菜单中创建快捷方式，并在“应用和功能”中添加条目。无需管理员权限。"

LangString SETUP_PORTABLE_TEXT ${LANG_ENGLISH} "Portable: copy the program into a folder you choose. Nothing is added to the Start menu or the registry."
LangString SETUP_PORTABLE_TEXT ${LANG_ARABIC} "محمول: انسخ البرنامج إلى مجلد تختاره. لا يُضاف شيء إلى قائمة ابدأ أو السجل."
LangString SETUP_PORTABLE_TEXT ${LANG_FARSI} "قابل حمل: برنامه را در پوشه دلخواه کپی می‌کند. چیزی به منوی Start یا رجیستری اضافه نمی‌شود."
LangString SETUP_PORTABLE_TEXT ${LANG_GERMAN} "Portabel: Das Programm wird in einen Ordner Ihrer Wahl kopiert. Nichts wird zum Startmenü oder zur Registrierung hinzugefügt."
LangString SETUP_PORTABLE_TEXT ${LANG_SPANISH} "Portátil: copia el programa en una carpeta que elijas. No se añade nada al menú Inicio ni al registro."
LangString SETUP_PORTABLE_TEXT ${LANG_FRENCH} "Portable : copie le programme dans un dossier de votre choix. Rien n’est ajouté au menu Démarrer ni au registre."
LangString SETUP_PORTABLE_TEXT ${LANG_HINDI} "पोर्टेबल: प्रोग्राम को आपके चुने हुए फ़ोल्डर में कॉपी करें। स्टार्ट मेन्यू या रजिस्ट्री में कुछ नहीं जोड़ा जाता।"
LangString SETUP_PORTABLE_TEXT ${LANG_INDONESIAN} "Portabel: salin program ke folder pilihan Anda. Tidak ada yang ditambahkan ke menu Start atau registri."
LangString SETUP_PORTABLE_TEXT ${LANG_ITALIAN} "Portatile: copia il programma in una cartella a scelta. Nulla viene aggiunto al menu Start o al registro."
LangString SETUP_PORTABLE_TEXT ${LANG_JAPANESE} "ポータブル: プログラムを選んだフォルダーにコピーします。スタート メニューやレジストリには何も追加されません。"
LangString SETUP_PORTABLE_TEXT ${LANG_KOREAN} "휴대용: 선택한 폴더에 프로그램을 복사합니다. 시작 메뉴나 레지스트리에는 아무것도 추가되지 않습니다."
LangString SETUP_PORTABLE_TEXT ${LANG_PORTUGUESEBR} "Portátil: copia o programa para uma pasta escolhida por você. Nada é adicionado ao menu Iniciar nem ao registro."
LangString SETUP_PORTABLE_TEXT ${LANG_RUSSIAN} "Portable: программа копируется в выбранную вами папку. Ничего не добавляется в меню «Пуск» и реестр."
LangString SETUP_PORTABLE_TEXT ${LANG_THAI} "แบบพกพา: คัดลอกโปรแกรมไปยังโฟลเดอร์ที่คุณเลือก จะไม่มีการเพิ่มอะไรลงในเมนู Start หรือรีจิสทรี"
LangString SETUP_PORTABLE_TEXT ${LANG_TURKISH} "Taşınabilir: programı seçtiğiniz bir klasöre kopyalar. Başlat menüsüne veya kayıt defterine hiçbir şey eklenmez."
LangString SETUP_PORTABLE_TEXT ${LANG_VIETNAMESE} "Bản portable: sao chép chương trình vào thư mục bạn chọn. Không thêm gì vào menu Start hay registry."
LangString SETUP_PORTABLE_TEXT ${LANG_SIMPCHINESE} "便携版：将程序复制到您选择的文件夹。不会在“开始”菜单或注册表中添加任何内容。"

Function .onInit
  StrCpy $Mode "install"
  ; Silent switch for scripted installs: /S /PORTABLE=1 [/D=<folder>]
  ${GetParameters} $0
  ClearErrors
  ${GetOptions} $0 "/PORTABLE=" $1
  ${IfNot} ${Errors}
    StrCpy $Mode "portable"
    ; Keep a /D= folder if one was given; otherwise use the portable default.
    ${If} $INSTDIR == "$LOCALAPPDATA\Programs\${APPNAME}"
      StrCpy $INSTDIR "$DOCUMENTS\${APPNAME} Portable"
    ${EndIf}
  ${EndIf}
FunctionEnd

Function ModePage
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "$(SETUP_MODE_TEXT)"
  Pop $0

  ${NSD_CreateRadioButton} 0 26u 100% 26u "$(SETUP_INSTALL_TEXT)"
  Pop $RadioInstall

  ${NSD_CreateRadioButton} 0 62u 100% 26u "$(SETUP_PORTABLE_TEXT)"
  Pop $RadioPortable

  ${If} $Mode == "portable"
    ${NSD_Check} $RadioPortable
  ${Else}
    ${NSD_Check} $RadioInstall
  ${EndIf}

  nsDialogs::Show
FunctionEnd

Function ModePageLeave
  ${NSD_GetState} $RadioPortable $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $Mode "portable"
    StrCpy $INSTDIR "$DOCUMENTS\${APPNAME} Portable"
  ${Else}
    StrCpy $Mode "install"
    StrCpy $INSTDIR "$LOCALAPPDATA\Programs\${APPNAME}"
  ${EndIf}
FunctionEnd

; The folder page only applies to portable copies; a regular install uses the fixed location.
Function DirectoryPre
  ${If} $Mode == "install"
    Abort
  ${EndIf}
FunctionEnd

; A running copy locks its program files, so they can't be replaced. Ask the user to close it first.
Function WaitForAppClosed
retry:
  ; nsExec returns 0 when tasklist finds the running program.
  nsExec::Exec 'cmd /c tasklist /FI "IMAGENAME eq ${EXE}" /NH | find /I "${EXE}" >nul'
  Pop $0
  ${If} $0 != 0
    Return
  ${EndIf}
  IfSilent fail
  MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "${APPNAME} is running. Close it, then click Retry to continue installing." IDRETRY retry
fail:
  Abort "${APPNAME} is still running. Close it and run this setup again."
FunctionEnd

Section "Install"
  Call WaitForAppClosed
  SetOutPath "$INSTDIR"
  SetOverwrite on
  File /r "${PAYLOAD}\*.*"

  ${If} $Mode == "install"
    WriteUninstaller "$INSTDIR\uninstall.exe"
    CreateShortCut "$SMPROGRAMS\${APPNAME}.lnk" "$INSTDIR\${EXE}"
    WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "${APPNAME}"
    WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "${VERSION}"
    WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
    WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\${EXE}"
    WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
    WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
    WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1
  ${Else}
    ; Portable copies keep settings, WebView2 data and caches beside the program.
    FileOpen $0 "$INSTDIR\portable.marker" w
    FileWrite $0 "YouGlish portable data mode v1$\r$\n"
    FileClose $0
  ${EndIf}
SectionEnd

Section "Uninstall"
  Delete "$SMPROGRAMS\${APPNAME}.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${UNINSTALL_KEY}"
SectionEnd
