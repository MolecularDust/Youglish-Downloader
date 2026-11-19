import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  safeFileName,
  fileNameNeedsFix,
  timestamp,
  preciseTimestamp,
  parseTimestamp,
  validSection,
  paddedSection,
  stepPaddedLength,
  jobProgress,
  endFromPaddedLength,
  codecFamily,
  updateQueue,
  clearQueueRows,
  isTrimmed,
  timelineTime,
  acceptPlayerTime,
  type SeekTarget,
  type Video,
  type Settings,
  type Job,
} from "./domain";
import {
  findSubtitleMatches,
  matchContext,
  type Cue,
  cleanWidgetCaption,
  defaultHeight,
  type Match,
  type CaptionTrack,
} from "./subtitles";
import "./style.css";
import appIcon from "./assets/app-icon.png";
import {
  LANGUAGES,
  getLanguageChoice,
  initLanguage,
  languageName,
  setLanguageChoice,
  t,
  tb,
  useLanguage,
} from "./i18n";
const languageCodes: Record<string, string> = {
  english: "en",
  french: "fr",
  german: "de",
  spanish: "es",
  italian: "it",
  portuguese: "pt",
  russian: "ru",
  turkish: "tr",
  dutch: "nl",
  arabic: "ar",
  chinese: "zh",
  japanese: "ja",
  korean: "ko",
  greek: "el",
  hebrew: "he",
  hindi: "hi",
  indonesian: "id",
  polish: "pl",
  romanian: "ro",
  swedish: "sv",
  thai: "th",
  ukrainian: "uk",
  vietnamese: "vi",
};
const accents: Record<string, string[][]> = {
  arabic: [
    ["sa", "Saudi Arabia"],
    ["eg", "Egypt"],
    ["dz", "Algeria"],
    ["ma", "Morocco"],
    ["tn", "Tunisia"],
    ["lb", "Lebanon"],
    ["sy", "Syria"],
    ["jo", "Jordan"],
    ["iq", "Iraq"],
    ["qa", "Qatar"],
    ["ae", "UAE"],
    ["kw", "Kuwait"],
    ["bh", "Bahrain"],
    ["om", "Oman"],
    ["af", "Afghanistan"],
    ["ps", "Palestine"],
    ["il", "Israel"],
    ["ly", "Libya"],
  ],
  english: [
    ["us", "US"],
    ["uk", "UK"],
    ["aus", "Australia"],
    ["ca", "Canada"],
    ["ie", "Ireland"],
    ["sco", "Scotland"],
    ["nz", "New Zealand"],
  ],
  french: [
    ["fr", "France"],
    ["qc", "Quebec"],
    ["be", "Belgium"],
    ["ch", "Switzerland"],
  ],
  spanish: [
    ["es", "Spain"],
    ["la", "Latin America"],
  ],
  portuguese: [
    ["pt", "Portugal"],
    ["br", "Brazil"],
  ],
  dutch: [
    ["nl", "Netherlands"],
    ["be", "Belgium"],
  ],
  chinese: [
    ["cn", "China"],
    ["tw", "Taiwan"],
    ["sg", "Singapore"],
    ["hk", "Hong Kong"],
    ["sh", "Shanghai"],
    ["mo", "Macao"],
    ["mn", "Mongolia"],
  ],
};
const defaults: Settings = {
  destination: "",
  browser: "",
  cookiesFile: "",
  appearance: "system",
};
function App() {
  useLanguage();
  const [settings, setSettings] = useState<Settings>(defaults),
    [showSettings, setShowSettings] = useState(false),
    [browsers, setBrowsers] = useState<string[]>([]),
    [phrase, setPhrase] = useState(""),
    [language, setLanguage] = useState("english"),
    [accent, setAccent] = useState(""),
    [search, setSearch] = useState<{
      phrase: string;
      language: string;
      accent: string;
      run: number;
    } | null>(null),
    [candidate, setCandidate] = useState(""),
    [matches, setMatches] = useState<Match[]>([]),
    [matchChosen, setMatchChosen] = useState(false),
    [pickerOpen, setPickerOpen] = useState(false),
    [matchStatus, setMatchStatus] = useState(""),
    [fileName, setFileName] = useState(""),
    [fileNameEditing, setFileNameEditing] = useState(false),
    [fileNameEdited, setFileNameEdited] = useState(false),
    [video, setVideo] = useState<Video | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [nameFix, setNameFix] = useState<{
      original: string;
      proposed: string;
    } | null>(null),
    [playerError, setPlayerError] = useState(""),
    [origin, setOrigin] = useState(""),
    [ready, setReady] = useState(false),
    [previewActive, setPreviewActive] = useState(false),
    [previewMode, setPreviewMode] = useState(false),
    [widgetHeight, setWidgetHeight] = useState(660),
    [lengthValid, setLengthValid] = useState(true),
    [inValid, setInValid] = useState(true),
    [outValid, setOutValid] = useState(true),
    [resetVersion, setResetVersion] = useState(0),
    [metadataLoading, setMetadataLoading] = useState(false),
    [metadataStatus, setMetadataStatus] = useState(""),
    [start, setStart] = useState(0),
    [end, setEnd] = useState(0),
    [time, setTime] = useState(0),
    [padding, setPadding] = useState(2),
    [paddingEditing, setPaddingEditing] = useState(false),
    [precise, setPrecise] = useState(false),
    [container, setContainer] = useState("mp4"),
    [resolution, setResolution] = useState("1080"),
    [codec, setCodec] = useState("auto"),
    [audio, setAudio] = useState("best"),
    [mode, setMode] = useState("video"),
    [subtitle, setSubtitle] = useState(""),
    [jobs, setJobs] = useState<Job[]>([]);
  const captionCues = useRef<Cue[]>([]),
    candidateRef = useRef(""),
    dirtyName = useRef(false),
    captureCaption = useRef(false),
    matchRequest = useRef(0);
  const selectionGeneration = useRef(0);
  const captionCache = useRef(
    new Map<string, { video: Video; track: CaptionTrack }>(),
  );
  const inflightCaptions = useRef(
    new Map<string, Promise<{ video: Video; track: CaptionTrack }>>(),
  );
  const fetchCaptionTrack = (id: string, code: string, key: string) => {
    const existing = inflightCaptions.current.get(key);
    if (existing) return existing;
    const url = `https://www.youtube.com/watch?v=${id}`;
    const p = invoke<{ video: Video; track: CaptionTrack }>("caption_track", {
      url,
      language: code,
    })
      .then((res) => {
        captionCache.current.set(key, res);
        return res;
      })
      .finally(() => {
        inflightCaptions.current.delete(key);
      });
    inflightCaptions.current.set(key, p);
    return p;
  };
  const iframe = useRef<HTMLIFrameElement>(null),
    clearedJobIds = useRef(new Set<string>()),
    scrub = useRef<{ id: number; kind: "in" | "out" | "playhead" } | null>(
      null,
    ),
    seekTarget = useRef<SeekTarget | null>(null),
    previewing = useRef<false | "seeking" | "playing">(false),
    token = useRef(crypto.randomUUID()),
    timeline = useRef<HTMLDivElement>(null);
  const send = (action: string, value?: number) =>
    iframe.current?.contentWindow?.postMessage(
      { token: token.current, action, value },
      origin,
    );
  const stopPreview = () => {
    send("pause");
    previewing.current = false;
    setPreviewActive(false);
  };
  const act = async (fn: () => Promise<unknown>) => {
    try {
      setError("");
      setNameFix(null);
      await fn();
    } catch (e) {
      setError(String(e));
    }
  };
  useEffect(() => {
    if (!isTauri()) {
      setOrigin(window.location.origin);
      setMatchStatus(
        t(
          "Browser preview: open the desktop app for subtitle matching and downloads.",
        ),
      );
      return;
    }
    let dispose: (() => void) | undefined;
    let disposed = false;
    invoke<string[]>("installed_browsers")
      .then(setBrowsers)
      .catch(() => setBrowsers([]));
    invoke<Settings>("get_settings")
      .then(setSettings)
      .catch((e) => setError(String(e)));
    invoke<string>("player_origin")
      .then(setOrigin)
      .catch((e) => setError(String(e)));
    invoke<Job[]>("jobs")
      .then((loaded) => setJobs(clearQueueRows(loaded, clearedJobIds.current)))
      .catch((e) => setError(String(e)));
    listen<Job>("job", (e) =>
      setJobs((old) => updateQueue(old, e.payload, clearedJobIds.current)),
    )
      .then((fn) => {
        if (disposed) fn();
        else dispose = fn;
      })
      .catch((e) => setError(String(e)));
    return () => {
      disposed = true;
      dispose?.();
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = settings.appearance;
  }, [settings.appearance]);
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (
        e.source !== iframe.current?.contentWindow ||
        e.origin !== origin ||
        e.data?.token !== token.current
      )
        return;
      const { type, value } = e.data;
      if (
        type === "height" &&
        typeof value === "number" &&
        Number.isFinite(value) &&
        value > 0
      ) {
        setWidgetHeight(Math.ceil(value));
        return;
      }
      if (
        type === "video" &&
        typeof value === "string" &&
        /^[\w-]{11}$/.test(value)
      ) {
        candidateRef.current = value;
        setPickerOpen(false);
        matchRequest.current++;
        dirtyName.current = false;
        captureCaption.current = true;
        setCandidate(value);
        setPlayerError("");
        setPreviewMode(false);
        setVideo(null);
        setMatches([]);
        setFileName("");
        setFileNameEdited(false);
        setMatchStatus(
          t("Choose your example, then click Look Up to load its timings."),
        );
        setStart(0);
        setEnd(0);
        setTime(0);
        setBusy(false);
        setInValid(true);
        setOutValid(true);
        setLengthValid(true);
        setResetVersion((n) => n + 1);
        setPadding(2);
        setMetadataLoading(false);
        setMetadataStatus("");
        if (isTauri()) {
          const code = languageCodes[search?.language ?? language];
          const cacheKey = [
            value,
            code,
            settings.browser,
            settings.cookiesFile,
          ].join("|");
          if (!captionCache.current.has(cacheKey)) {
            void fetchCaptionTrack(value, code, cacheKey).catch(() => {});
          }
        }
      }
      if (
        type === "caption" &&
        typeof value === "string" &&
        !dirtyName.current
      ) {
        if (captureCaption.current) {
          const caption = cleanWidgetCaption(value);
          if (caption) {
            setFileName(caption);
            captureCaption.current = false;
          }
        }
        setFileNameEdited(true);
      }
      if (type === "fetch" && value === 0)
        setMatchStatus(t("No YouGlish results found."));
      if (type === "fetch" && value === -1) {
        candidateRef.current = "";
        matchRequest.current++;
        setCandidate("");
        setVideo(null);
        setMatches([]);
        selectionGeneration.current++;
        setMetadataLoading(false);
        setMetadataStatus("");
        setBusy(false);
        setStart(0);
        setEnd(0);
        setMatchStatus(t("Searching YouGlish…"));
      }
      if (type === "preview") setPreviewMode(!!value);
      if (type === "widget-error")
        setPlayerError(
          value === 1
            ? t(
                "YouTube could not play this sample. Check the message in the player for details, or try the next result. The downloader’s cookies setting does not sign in this player.",
              )
            : value === 2
              ? t(
                  "YouGlish reports that this browser is unsupported. Try the YouGlish website in your browser.",
                )
              : value === 3
                ? t(
                    "YouGlish timed out. Check your connection and try searching again.",
                  )
                : t(
                    "YouGlish reported an error ({code}). Try another sample or search again.",
                    { code: String(value) },
                  ),
        );
      if (type === "time") {
        if (
          !acceptPlayerTime(
            value,
            seekTarget.current,
            scrub.current?.kind === "playhead",
            performance.now(),
          )
        )
          return;
        seekTarget.current = null;
        setTime(value);
        if (
          previewing.current === "seeking" &&
          value >= Math.max(0, start - padding) - 0.25 &&
          value < Math.min(video?.duration ?? end, end + padding)
        )
          previewing.current = "playing";
        if (
          previewing.current === "playing" &&
          value >= Math.min(video?.duration ?? end, end + padding)
        ) {
          send("pause");
          previewing.current = false;
          setPreviewActive(false);
        }
      }
      if (
        type === "state" &&
        (value === 0 || (value === 2 && previewing.current === "playing"))
      ) {
        previewing.current = false;
        setPreviewActive(false);
      }
      if (type === "state" && value === 1) setPlayerError("");
      if (type === "ready") setReady(true);
      if (type === "error") {
        setReady(false);
        previewing.current = false;
        setPreviewActive(false);
        setPlayerError(
          value === 153
            ? t(
                "YouTube rejected the player identity (error 153). Try reopening the app; this WebView may not send the required Referer.",
              )
            : [101, 150].includes(value)
              ? t(
                  "The owner does not allow this video to be embedded. Downloads may still be available.",
                )
              : t(
                  "YouTube player error {code}. Check video availability and network access.",
                  { code: String(value) },
                ),
        );
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [origin, start, end, padding, video]);
  const setIn = () => setStart(Math.max(0, Math.min(time, end - 0.01)));
  const setOut = () =>
    setEnd(Math.min(video?.duration ?? end, Math.max(time, start + 0.01)));
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          "input,textarea,select,[contenteditable]",
        ) ||
        showSettings ||
        !ready
      )
        return;
      if (e.code === "Space" && !(e.target as HTMLElement).closest("button")) {
        e.preventDefault();
        send("toggle");
      }
      if (previewMode && e.key.toLowerCase() === "i") setIn();
      if (previewMode && e.key.toLowerCase() === "o") setOut();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
  const save = async (next: Settings) => {
    await invoke("save_settings", { settings: next });
    setSettings(next);
  };
  const selectMatch = (m: Match, v = video) => {
    if (!v) return;
    setMatchChosen(true);
    setPickerOpen(false);
    setResetVersion((n) => n + 1);
    setInValid(true);
    setOutValid(true);
    setLengthValid(true);
    setStart(Math.max(0, m.start));
    setEnd(Math.min(v.duration, m.end));
    setTime(m.start);
    setMatchStatus(
      t("Matched subtitle segment boundaries. Adjust In/Out as needed."),
    );
  };
  const matchFilename = (phrase?: string, selectedId?: string) =>
    act(async () => {
      const text = (phrase ?? fileName).trim(),
        id = selectedId ?? candidateRef.current;
      if (!id || !text) return;
      if (!isTauri()) {
        setMatchStatus(
          t("Open the desktop app to retrieve and match subtitles."),
        );
        return;
      }
      const request = ++matchRequest.current;
      const code = languageCodes[search?.language ?? language];
      const cacheKey = [id, code, settings.browser, settings.cookiesFile].join(
        "|",
      );
      setBusy(true);
      setMetadataLoading(true);
      setMatchStatus(t("Retrieving subtitles…"));
      try {
        let cached = captionCache.current.get(cacheKey);
        if (!cached) {
          const { video: v, track } = await fetchCaptionTrack(
            id,
            code,
            cacheKey,
          );
          if (request === matchRequest.current && id === candidateRef.current) {
            setVideo(v);
            if (!video || video.id !== id) {
              setStart(0);
              setEnd(v.duration);
              setResetVersion((n) => n + 1);
            }
            setResolution(defaultHeight(v.formats.map((f) => f.height ?? 0)));
          }
          cached = { video: v, track };
        }
        if (request !== matchRequest.current || id !== candidateRef.current)
          return;
        const v = cached.video;
        if (!v.duration || !Number.isFinite(v.duration))
          throw Error("Choose a finished video with a finite duration.");
        captionCues.current = cached.track.cues;
        const found = findSubtitleMatches(cached.track.cues, text);
        setVideo(v);
        setResolution(defaultHeight(v.formats.map((f) => f.height ?? 0)));
        setMatches(found);
        setMatchChosen(false);
        setPickerOpen(false);
        if (found.length === 1) selectMatch(found[0], v);
        else if (found.length) {
          setMatchStatus(
            t("{count} matches — choose the occurrence you want.", {
              count: found.length,
            }),
          );
          setPickerOpen(true);
        } else
          setMatchStatus(
            t(
              "No subtitle match. Timings were not changed; edit the phrase or set In/Out manually.",
            ),
          );
        if (found.length === 1)
          setMatchStatus(
            t(
              "{kind} captions · {language}. Subtitle segment boundaries found; adjust In/Out as needed.",
              { kind: tb(cached.track.kind), language: cached.track.language },
            ),
          );
      } catch (e) {
        if (request === matchRequest.current) {
          setMatchStatus(
            t(
              "Subtitle matching failed. You can set In/Out manually, or edit the phrase and retry.",
            ),
          );
          throw e;
        }
      } finally {
        if (request === matchRequest.current) {
          setBusy(false);
          setMetadataLoading(false);
        }
      }
    });
  const formats =
    video?.formats.filter((f) => f.height && f.vcodec !== "none") ?? [];
  const heights = [...new Set(formats.map((f) => f.height!))].sort(
    (a, b) => b - a,
  );
  const available = formats.filter(
    (f) => !resolution || f.height === Number(resolution),
  );
  const codecs = new Set(available.map((f) => codecFamily(f.vcodec)));
  const compatible =
    container === "mkv" ||
    codec === "h264" ||
    codec === "hevc" ||
    codec === "av1" ||
    codec === "auto";
  const duration = video?.duration ?? 0;
  const timelineDuration = duration || 1;
  const [clipStart, clipEnd] = paddedSection(start, end, padding, duration);
  const section = !!video && isTrimmed(clipStart, clipEnd, video.duration);
  const selectionValid =
    !!video &&
    lengthValid &&
    inValid &&
    outValid &&
    (matches.length <= 1 || matchChosen) &&
    validSection(start, end, video.duration);
  const enqueue = () =>
    act(async () => {
      if (!video || !selectionValid)
        throw Error("Select a valid video section.");
      if (fileNameEdited && fileNameNeedsFix(fileName)) {
        setNameFix({ original: fileName, proposed: safeFileName(fileName) });
        setError(
          "This file name contains unsupported characters, is empty, or is too long. Review the suggested name below.",
        );
        return;
      }
      await invoke("enqueue", {
        request: {
          url: video.url,
          title: video.title,
          fileName: fileNameEdited ? fileName.trim() : null,
          destination: settings.destination,
          container,
          resolution: resolution ? Number(resolution) : null,
          codec,
          audio,
          mode,
          subtitle,
          section: section ? [clipStart, clipEnd] : null,
          precise: section && precise,
          duration: video.duration,
        },
      });
    });
  const seek = (value: number) => {
    if (!video || !ready || busy) return;
    const position = Math.max(0, Math.min(video.duration, value));
    if (previewing.current) stopPreview();
    seekTarget.current = { position, expires: performance.now() + 3000 };
    setTime(position);
    send("seek", position);
  };
  const moveTimelineControl = (
    clientX: number,
    kind: "in" | "out" | "playhead",
  ) => {
    if (!timeline.current || !video || busy) return;
    const bounds = timeline.current.getBoundingClientRect();
    const position = timelineTime(
      clientX,
      bounds.left,
      bounds.width,
      video.duration,
    );
    if (kind === "in") setStart(Math.min(position, end - 0.01));
    else if (kind === "out") setEnd(Math.max(position, start + 0.01));
    else seek(position);
  };
  return (
    <div className="app">
      <header>
        <div className="brand">
          <img className="app-icon" src={appIcon} alt="" />
          <div>
            <strong>YouGlish Downloader</strong>
            <small>{t("Find a voice. Keep the moment.")}</small>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)}>
          ◎ <span>{t("Account & Settings")}</span>
        </button>
      </header>
      <main>
        <div className="intro">
          <div>
            <p className="eyebrow">{t("YOUR NEXT SPEECH EXAMPLE")}</p>
            <h1>{t("Find something worth hearing.")}</h1>
          </div>
          <span className="badge">
            ●{" "}
            {settings.browser || settings.cookiesFile
              ? settings.browser === "app"
                ? t("App session")
                : t("Browser session")
              : t("Anonymous")}
          </span>
        </div>
        <section className="url-card">
          <label htmlFor="phrase">{t("Search phrase")}</label>
          <form
            className="search-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!phrase.trim()) return;
              candidateRef.current = "";
              matchRequest.current++;
              setCandidate("");
              setVideo(null);
              setMatches([]);
              setFileName("");
              setBusy(false);
              selectionGeneration.current++;
              setMetadataLoading(false);
              setMetadataStatus("");
              setSearch({
                phrase: phrase.trim(),
                language,
                accent,
                run: Date.now(),
              });
            }}
          >
            <input
              id="phrase"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={t("Enter a word or phrase")}
              required
            />
            <select
              aria-label={t("Language")}
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                setAccent("");
              }}
            >
              {Object.keys(languageCodes).map((l) => (
                <option key={l} value={l}>
                  {languageName(languageCodes[l]).replace(/^./, (c) =>
                    c.toUpperCase(),
                  )}
                </option>
              ))}
            </select>
            <select
              aria-label={t("Accent")}
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
            >
              <option value="">{t("All accents")}</option>
              {(accents[language] ?? []).map(([code, name]) => (
                <option key={code} value={code}>
                  {tb(name)}
                </option>
              ))}
            </select>
            <button className="primary" type="submit">
              {t("Search →")}
            </button>
          </form>
        </section>
        <section className="video-card">
          <div className="video-info">
            <div>
              <span className="eyebrow">YOUGLISH</span>
              <h2>
                {video?.title ?? t("Listen, watch, and choose your example.")}
              </h2>
              <p>
                {video
                  ? `${video.channel} · ${timestamp(video.duration)}`
                  : t(
                      "Browse YouGlish, choose an example, then click Look Up.",
                    )}
              </p>
            </div>
          </div>
          {metadataStatus && (
            <p className="metadata-status" role="status">
              {metadataLoading && (
                <span className="analyze-spinner" aria-hidden="true" />
              )}
              {metadataStatus}
            </p>
          )}
          <div className="youglish-player">
            {search && origin ? (
              <iframe
                ref={iframe}
                key={search.run}
                title={t("YouGlish pronunciation search")}
                style={{ height: widgetHeight }}
                src={`${origin}/youglish.html?token=${token.current}&query=${encodeURIComponent(search.phrase)}&lang=${encodeURIComponent(search.language)}&accent=${encodeURIComponent(search.accent)}&loading=${encodeURIComponent(t("Loading YouGlish…"))}&back=${encodeURIComponent(t("← Back to YouGlish results"))}`}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <div className="empty-player">
                <h3>{t("Your next example starts here")}</h3>
                <p>{t("Enter a phrase and search YouGlish.")}</p>
              </div>
            )}
          </div>
          {candidate && (
            <div className="external-video-actions">
              <button
                onClick={() =>
                  act(() =>
                    invoke("open_youtube", {
                      url: `https://www.youtube.com/watch?v=${candidate}`,
                    }),
                  )
                }
              >
                {t("Open in YouTube ↗")}
              </button>
              <button
                onClick={() =>
                  act(() =>
                    invoke("copy_youtube_link", {
                      url: `https://www.youtube.com/watch?v=${candidate}`,
                    }),
                  )
                }
              >
                {t("Copy link")}
              </button>
            </div>
          )}
          {playerError && <div className="notice error">{playerError}</div>}
          <div className="trim">
            <fieldset className="trim-details" disabled={!candidate}>
              <fieldset className="clip-controls" disabled={!video || busy}>
                <div className="timeline-labels">
                  <span>{timestamp(0)}</span>
                  <span>
                    {timestamp(time)} <small>{t("PLAYHEAD")}</small>
                  </span>
                  <span>{timestamp(duration)}</span>
                </div>
                <div
                  className="timeline"
                  ref={timeline}
                  onPointerDown={(e) => {
                    if (!video || busy || e.button !== 0 || !e.isPrimary)
                      return;
                    const control = (
                      e.target as HTMLElement
                    ).closest<HTMLElement>("[data-timeline-control]");
                    const kind = (control?.dataset.timelineControl ??
                      "playhead") as "in" | "out" | "playhead";
                    if (kind === "playhead" && !ready) return;
                    e.preventDefault();
                    (
                      control ??
                      e.currentTarget.querySelector<HTMLElement>(
                        ".playhead-handle",
                      )
                    )?.focus({ preventScroll: true });
                    e.currentTarget.setPointerCapture(e.pointerId);
                    scrub.current = { id: e.pointerId, kind };
                    if (!control) moveTimelineControl(e.clientX, kind);
                  }}
                  onPointerMove={(e) => {
                    if (scrub.current?.id === e.pointerId)
                      moveTimelineControl(e.clientX, scrub.current.kind);
                  }}
                  onPointerUp={(e) => {
                    if (scrub.current?.id !== e.pointerId) return;
                    const kind = scrub.current.kind;
                    scrub.current = null;
                    moveTimelineControl(e.clientX, kind);
                    if (e.currentTarget.hasPointerCapture(e.pointerId))
                      e.currentTarget.releasePointerCapture(e.pointerId);
                  }}
                  onPointerCancel={() => {
                    scrub.current = null;
                  }}
                  onLostPointerCapture={() => {
                    scrub.current = null;
                  }}
                >
                  <div
                    className="selection"
                    style={{
                      left: `${(clipStart / timelineDuration) * 100}%`,
                      width: `${((clipEnd - clipStart) / timelineDuration) * 100}%`,
                    }}
                  />
                  <div
                    className="playhead"
                    style={{ left: `${(time / timelineDuration) * 100}%` }}
                  >
                    <button
                      className="playhead-handle"
                      data-timeline-control="playhead"
                      aria-label={t("Playhead")}
                      role="slider"
                      aria-valuemin={0}
                      aria-valuemax={duration}
                      aria-valuenow={time}
                      aria-valuetext={preciseTimestamp(time)}
                      disabled={!ready || !video || metadataLoading}
                      title={t("Drag to seek")}
                      onKeyDown={(e) => {
                        if (
                          ["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                            e.key,
                          )
                        ) {
                          e.preventDefault();
                          const delta =
                            (e.key === "ArrowRight" ? 1 : -1) *
                            (e.shiftKey ? 1 : 0.1);
                          seek(
                            e.key === "Home"
                              ? 0
                              : e.key === "End"
                                ? duration
                                : time + delta,
                          );
                        }
                      }}
                    />
                  </div>
                  {(["in", "out"] as const).map((which) => (
                    <button
                      key={which}
                      className={`marker ${which}`}
                      disabled={!video || metadataLoading}
                      aria-label={
                        which === "in" ? t("In marker") : t("Out marker")
                      }
                      role="slider"
                      aria-valuemin={0}
                      aria-valuemax={duration}
                      aria-valuenow={which === "in" ? start : end}
                      style={{
                        left: `${((which === "in" ? start : end) / timelineDuration) * 100}%`,
                      }}
                      data-timeline-control={which}
                      onKeyDown={(e) => {
                        if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
                          e.preventDefault();
                          const delta =
                            (e.key === "ArrowRight" ? 1 : -1) *
                            (e.shiftKey ? 1 : 0.1);
                          if (which === "in")
                            setStart(
                              Math.max(0, Math.min(end - 0.01, start + delta)),
                            );
                          else
                            setEnd(
                              Math.min(
                                duration,
                                Math.max(start + 0.01, end + delta),
                              ),
                            );
                        }
                      }}
                    >
                      Ⅱ
                    </button>
                  ))}
                </div>
                <fieldset
                  className="trim-controls"
                  disabled={!video || metadataLoading}
                >
                  <div className="point">
                    <button disabled={!ready || !previewMode} onClick={setIn}>
                      {t("Set In")} <kbd>I</kbd>
                    </button>
                    <TimeInput
                      key={`in-${resetVersion}`}
                      label="In"
                      onValidity={setInValid}
                      value={start}
                      onChange={(n) => {
                        if (!validSection(n, end, duration))
                          throw Error("In must precede Out.");
                        setStart(n);
                      }}
                    />
                  </div>
                  <div className="point">
                    <button disabled={!ready || !previewMode} onClick={setOut}>
                      {t("Set Out")} <kbd>O</kbd>
                    </button>
                    <TimeInput
                      key={`out-${resetVersion}`}
                      label="Out"
                      onValidity={setOutValid}
                      value={end}
                      onChange={(n) => {
                        if (!validSection(start, n, duration))
                          throw Error("Out must follow In and fit the video.");
                        setEnd(n);
                      }}
                    />
                  </div>
                  <div className="time-input length-input padding-input">
                    <label className="length-label" htmlFor="padding">
                      {t("Padding")}
                      <br />
                      {t("(seconds)")}
                    </label>
                    <div className="number-stepper">
                      <input
                        id="padding"
                        aria-label={t("Padding in seconds")}
                        inputMode="numeric"
                        maxLength={2}
                        value={
                          paddingEditing
                            ? String(padding)
                            : String(padding).padStart(2, "0")
                        }
                        onFocus={(e) => {
                          setPaddingEditing(true);
                          e.target.select();
                        }}
                        onBlur={() => setPaddingEditing(false)}
                        onChange={(e) => {
                          if (/^\d{0,2}$/.test(e.target.value))
                            setPadding(Number(e.target.value));
                        }}
                      />
                      <StepperButtons
                        label="Padding"
                        onStep={(delta) =>
                          setPadding(Math.max(0, Math.min(99, padding + delta)))
                        }
                      />
                    </div>
                  </div>
                  <div className="time-input length-input calculated-length">
                    <span className="length-label">
                      {t("Length")}
                      <br />
                      {t("(seconds)")}
                    </span>
                    <div className="number-stepper">
                      <LengthInput
                        key={`length-${resetVersion}`}
                        value={Math.round((clipEnd - clipStart) * 1000) / 1000}
                        onValidity={setLengthValid}
                        onCommit={(length) => {
                          setEnd(
                            endFromPaddedLength(
                              start,
                              padding,
                              duration,
                              length,
                            ),
                          );
                          setInValid(true);
                          setOutValid(true);
                        }}
                      />
                      <StepperButtons
                        label="Length"
                        onStep={(delta) => {
                          setEnd(
                            stepPaddedLength(
                              start,
                              end,
                              padding,
                              duration,
                              delta,
                            ),
                          );
                          setResetVersion((n) => n + 1);
                          setInValid(true);
                          setOutValid(true);
                          setLengthValid(true);
                        }}
                      />
                    </div>
                  </div>
                  <button
                    className="preview-button"
                    disabled={!ready || (!previewActive && !selectionValid)}
                    onClick={() => {
                      if (previewing.current) {
                        stopPreview();
                        return;
                      }
                      seekTarget.current = {
                        position: clipStart,
                        expires: performance.now() + 3000,
                      };
                      setTime(clipStart);
                      send("seek", clipStart);
                      previewing.current = "seeking";
                      setPreviewActive(true);
                      send("play");
                    }}
                  >
                    {previewActive ? t("■ Stop") : t("▶ Preview selection")}
                  </button>
                  <button
                    className="reset-button"
                    type="button"
                    onClick={() => {
                      if (!video) return;
                      matchRequest.current++;
                      setBusy(false);
                      if (previewing.current) stopPreview();
                      setPadding(2);
                      setStart(0);
                      setEnd(duration);
                      setTime(0);
                      setInValid(true);
                      setOutValid(true);
                      setLengthValid(true);
                      setMatches([]);
                      setMatchChosen(false);
                      setResetVersion((n) => n + 1);
                      setMatchStatus(t("Full video selected."));
                    }}
                  >
                    {t("Reset")}
                  </button>
                </fieldset>
                {padding > 0 && (
                  <small className="padding-summary">
                    {t(
                      "With padding: {start} – {end}. Padding stops at the video boundaries.",
                      {
                        start: preciseTimestamp(clipStart),
                        end: preciseTimestamp(clipEnd),
                      },
                    )}
                  </small>
                )}
              </fieldset>
              <div
                className={`download-filename${fileNameEditing || fileNameEdited ? " is-editing" : ""}`}
              >
                <span>{t("File name")}</span>
                <div>
                  <input
                    aria-label={t("File name")}
                    value={fileName}
                    readOnly={busy}
                    onFocus={() => {
                      dirtyName.current = true;
                      setFileNameEditing(true);
                    }}
                    onChange={(e) => {
                      dirtyName.current = true;
                      matchRequest.current++;
                      setMatchChosen(false);
                      setFileName(e.target.value);
                      setMatches([]);
                      setFileNameEdited(true);
                    }}
                    onBlur={() => {
                      setFileNameEditing(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !busy) {
                        e.preventDefault();
                        matchFilename();
                      }
                    }}
                    placeholder={t(
                      "Choose a YouGlish sample, then enter a sentence from its subtitles",
                    )}
                  />
                  <span>.{container}</span>
                  <button
                    type="button"
                    className="lookup-button primary"
                    disabled={busy || !candidate || !fileName.trim()}
                    aria-busy={busy}
                    aria-label={busy ? t("Looking up subtitles") : t("Look Up")}
                    onClick={() => void matchFilename()}
                  >
                    {busy ? (
                      <>
                        <span className="analyze-spinner" aria-hidden="true" />
                        <span>{t("Looking up…")}</span>
                      </>
                    ) : (
                      t("Look Up")
                    )}
                  </button>
                </div>
                <small>
                  {t(
                    "Choose an example, then click Look Up (or press Enter) to load its timings. The same text names your file.",
                  )}
                </small>
              </div>
              <p className="match-status" role="status">
                {matchStatus}
              </p>
              {matches.length > 1 && (
                <div className="match-list">
                  {matches.map((m, i) => (
                    <button
                      key={`${m.start}-${i}`}
                      onClick={() => selectMatch(m)}
                    >
                      {preciseTimestamp(m.start)} – {preciseTimestamp(m.end)}
                    </button>
                  ))}
                </div>
              )}
              <div
                className={`check${!video || busy ? " disabled-control" : ""}`}
              >
                <input
                  type="checkbox"
                  disabled={!video || busy}
                  aria-label={t("Precise Cut")}
                  aria-describedby="precise-cut-description"
                  checked={precise}
                  onChange={(e) => setPrecise(e.target.checked)}
                />
                <span>{t("Precise Cut")}</span>
                <small id="precise-cut-description">
                  {precise
                    ? t(
                        "Re-encodes for accurate boundaries. Automatic uses H.264 / AAC.",
                      )
                    : t(
                        "Fast Cut preserves streams; boundaries may align to keyframes.",
                      )}
                </small>
              </div>
            </fieldset>
            {!video && (
              <small className="trim-hint">
                {t(
                  "Click Look Up when you have chosen your example. Padding extends both ends, stopping at the beginning and end of the video.",
                )}
              </small>
            )}
          </div>
        </section>
        <section className="settings-card">
          <details>
            <summary>
              {t("Download settings")}{" "}
              <small>
                {t("1080p preferred · lower resolution if unavailable")}
              </small>
            </summary>
            <div className="options">
              <Field label={t("Container")}>
                <select
                  value={container}
                  onChange={(e) => setContainer(e.target.value)}
                >
                  <option value="mp4">MP4</option>
                  <option value="mkv">MKV</option>
                </select>
              </Field>
              <Field label={t("Resolution")}>
                <select
                  disabled={mode === "audio"}
                  value={resolution}
                  onChange={(e) => {
                    setResolution(e.target.value);
                    setCodec("auto");
                  }}
                >
                  <option value="">{t("Best available")}</option>
                  {heights.map((h) => (
                    <option key={h} value={h}>
                      {h === 2160
                        ? `${t("4K")} · `
                        : h === 1440
                          ? `${t("2K")} · `
                          : ""}
                      {h}p
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("Video codec")}>
                <select
                  disabled={mode === "audio"}
                  value={codec}
                  onChange={(e) => setCodec(e.target.value)}
                >
                  <option value="auto">{t("Automatic")}</option>
                  {[
                    ["h264", "H.264"],
                    ["hevc", "H.265 / HEVC"],
                    ["av1", "AV1"],
                    ["vp9", "VP9"],
                  ].map(([v, l]) => (
                    <option key={v} value={v} disabled={!codecs.has(v)}>
                      {l}
                      {!codecs.has(v) ? ` · ${t("unavailable")}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("Audio")}>
                <select
                  value={audio}
                  disabled={mode === "audio"}
                  onChange={(e) => setAudio(e.target.value)}
                >
                  <option value="best">{t("Best available")}</option>
                  <option value="original">
                    {t("Original compatible stream")}
                  </option>
                  <option value="none">{t("No audio")}</option>
                </select>
              </Field>
              <Field label={t("Subtitles")}>
                <select
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                >
                  <option value="">{t("None")}</option>
                  {Object.keys(video?.subtitles ?? {}).map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("Download mode")}>
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="video">{t("Video + audio")}</option>
                  <option value="audio">{t("Audio only")}</option>
                </select>
              </Field>
            </div>
            <p className="format-note">
              ⓘ{" "}
              {precise && section
                ? t(
                    "Precise cut re-encodes. Resolution is retained and the output duration is checked.",
                  )
                : compatible
                  ? t(
                      "Original streams are preserved where the selected container supports them; separate tracks require merging.",
                    )
                  : t(
                      "This codec may not be supported in MP4. Choose MKV to preserve the original stream.",
                    )}{" "}
              {t("Unavailable combinations fail explicitly.")}
            </p>
          </details>
          <div className="destination">
            <svg
              className="folder-icon"
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z" />
              <path d="M3 9h18" />
            </svg>
            <div>
              <small>{t("SAVE TO")}</small>
              <p>{settings.destination || t("Choose a download folder")}</p>
            </div>
            <button
              onClick={() =>
                act(async () => {
                  const p = await invoke<string | null>("pick_folder");
                  if (p) await save({ ...settings, destination: p });
                })
              }
            >
              {t("Choose folder…")}
            </button>
          </div>
          <button
            className="primary add"
            disabled={
              !video || !settings.destination || !selectionValid || busy
            }
            onClick={enqueue}
          >
            {t("＋ Add to Download Queue")}{" "}
            <span>{section ? t("Selected section") : t("Entire video")}</span>
          </button>
          <p className="legal">
            {t("Download only content you own or have permission to download.")}
          </p>
        </section>
        <section className="queue">
          <div className="section-heading">
            <h2>
              {t("Download queue")} <span className="count">{jobs.length}</span>
            </h2>
            <button
              disabled={
                !jobs.some((j) =>
                  ["completed", "canceled", "failed"].includes(j.state),
                )
              }
              onClick={() =>
                act(async () => {
                  const cleared = await invoke<string[]>("clear_completed");
                  for (const id of cleared) clearedJobIds.current.add(id);
                  setJobs((current) =>
                    clearQueueRows(current, clearedJobIds.current),
                  );
                })
              }
            >
              {t("Clear Finished")}
            </button>
          </div>
          {!jobs.length ? (
            <div className="queue-empty">
              <span>⇣</span>
              <div>
                <strong>{t("A home for your downloads")}</strong>
                <p>{t("Add a video and we’ll take it from here.")}</p>
              </div>
            </div>
          ) : (
            jobs.map((j) => (
              <article className="job" key={j.id}>
                <div className="job-icon" aria-hidden="true">
                  {j.state === "completed" ? (
                    <span className="queue-checkmark">✓</span>
                  ) : ["canceled", "failed"].includes(j.state) ? (
                    <span className="queue-canceled">✕</span>
                  ) : (
                    <span
                      className={`queue-spinner${["downloading", "merging", "processing"].includes(j.state) ? " is-spinning" : ""}`}
                    />
                  )}
                </div>
                <div className="job-body">
                  <strong>{j.title}</strong>
                  <div className="job-status">
                    <span>{tb(jobProgress(j).label)}</span>
                    <span>
                      {[
                        jobProgress(j).percent === null
                          ? ""
                          : `${jobProgress(j).percent!.toFixed(1)}%`,
                        j.speed,
                        j.bytes,
                        j.eta ? `${j.eta} remaining` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <progress
                    value={jobProgress(j).percent ?? undefined}
                    max="100"
                  />
                  {j.message && <p>{tb(j.message)}</p>}
                </div>
                <div className="job-actions">
                  {j.state === "completed" ? (
                    <button
                      onClick={() => act(() => invoke("reveal", { id: j.id }))}
                    >
                      {t("Reveal file")}
                    </button>
                  ) : j.state === "failed" ? (
                    <button
                      onClick={() => act(() => invoke("retry", { id: j.id }))}
                    >
                      {t("Retry")}
                    </button>
                  ) : j.state === "canceled" ? null : (
                    <>
                      <button
                        disabled={["queued", "cooldown"].includes(j.state)}
                        onClick={() =>
                          act(() =>
                            invoke("control", {
                              id: j.id,
                              action: j.state === "paused" ? "resume" : "pause",
                            }),
                          )
                        }
                      >
                        {j.state === "paused" ? t("Resume") : t("Pause")}
                      </button>
                      <button
                        onClick={() =>
                          act(() =>
                            invoke("control", { id: j.id, action: "cancel" }),
                          )
                        }
                      >
                        {t("Cancel")}
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
        <footer>
          <span>YOUGLISH DOWNLOADER</span>
          <span>{t("Made for your personal library.")}</span>
        </footer>
      </main>
      {pickerOpen && matches.length > 1 && video && (
        <div className="modal-backdrop">
          <section
            className="modal match-picker"
            role="dialog"
            aria-modal="true"
            aria-label={t("Choose an occurrence")}
          >
            <h2>{t("Choose the occurrence")}</h2>
            <p>
              {t(
                "This phrase appears {count} times in the video. YouGlish does not tell the app which one you picked, so choose it here.",
                { count: matches.length },
              )}
            </p>
            <ul>
              {matches.map((m, i) => {
                const ctx = matchContext(captionCues.current, m);
                return (
                  <li key={`${m.start}-${i}`}>
                    <button onClick={() => selectMatch(m)}>
                      <strong>
                        {preciseTimestamp(m.start)} – {preciseTimestamp(m.end)}
                      </strong>
                      <span>
                        {ctx.before && `…${ctx.before} `}
                        <mark>{m.text}</mark>
                        {ctx.after && ` ${ctx.after}…`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="error-popup-actions">
              <button onClick={() => setPickerOpen(false)}>
                {t("Decide later")}
              </button>
            </div>
          </section>
        </div>
      )}
      {error && (
        <ErrorPopup
          message={error}
          nameFix={nameFix}
          onClose={() => {
            setError("");
            setNameFix(null);
          }}
          onFix={() => {
            if (nameFix) {
              setFileName(nameFix.proposed);
              setFileNameEdited(true);
              dirtyName.current = true;
            }
            setError("");
            setNameFix(null);
          }}
        />
      )}
      {showSettings && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={t("Account and Settings")}
          >
            <div className="section-heading">
              <h2>{t("Account & Settings")}</h2>
              <button onClick={() => setShowSettings(false)}>
                {t("Done")}
              </button>
            </div>
            <h3>{t("YouGlish playback account")}</h3>
            <p>
              {t(
                "Sign in inside the app. Passkeys and security keys may fail there, so use your password and phone confirmation. Sign in to Google first, then connect YouTube and select your channel if asked. Close the account window when finished and search again to reload the player.",
              )}
            </p>
            <div className="playback-test-actions">
              <button
                onClick={() => act(() => invoke("youtube_sign_in_window"))}
              >
                {t("1. Sign in to Google ↗")}
              </button>
              <button
                onClick={() => act(() => invoke("youtube_connect_window"))}
              >
                {t("2. Connect YouTube ↗")}
              </button>
              <button
                onClick={() => act(() => invoke("youtube_playback_test"))}
              >
                {t("Check playback ↗")}
              </button>
            </div>
            <p>
              {t(
                "Your login is kept in the app’s browser storage. On YouTube, an account avatar confirms sign-in; use its account menu to switch accounts or sign out. A successful check plays a sample video in that window.",
              )}
            </p>
            <h3>{t("Subtitle and download authentication")}</h3>
            <p>
              {t(
                "Use an existing browser session for videos you’re authorized to access. Anonymous is the default.",
              )}
            </p>
            <Field label={t("Download authentication")}>
              <select
                value={settings.browser || (settings.cookiesFile ? "file" : "")}
                onChange={(e) =>
                  act(async () => {
                    if (e.target.value === "file") {
                      const p = await invoke<string | null>("pick_cookies");
                      if (p)
                        await save({
                          ...settings,
                          browser: "",
                          cookiesFile: p,
                        });
                    } else
                      await save({
                        ...settings,
                        browser: e.target.value,
                        cookiesFile: "",
                      });
                  })
                }
              >
                <option value="">{t("Anonymous")}</option>
                <option value="app">{t("App’s YouTube session")}</option>
                {browsers.map((browser) => (
                  <option key={browser} value={browser}>
                    {
                      (
                        {
                          opera: "Opera",
                          chrome: "Chrome",
                          firefox: "Firefox",
                          safari: "Safari",
                          edge: "Edge",
                          brave: "Brave",
                          chromium: "Chromium",
                          vivaldi: "Vivaldi",
                        } as Record<string, string>
                      )[browser]
                    }
                  </option>
                ))}
                <option value="file">{t("Import Netscape cookies…")}</option>
              </select>
            </Field>
            <p className="notice">
              {t(
                "Selecting the app’s session uses only its YouTube cookies in a temporary file, removed when the operation finishes. Selecting another browser authorizes yt-dlp to read its cookies when you analyze or download. Your operating system may request browser cookie-store access. Cookies are never printed or copied into app settings, or injected into YouGlish. This setting controls subtitle retrieval and downloads; the widget uses its own WebView session.",
              )}
            </p>
            <Field label={t("Language")}>
              <select
                value={getLanguageChoice()}
                onChange={(e) => void setLanguageChoice(e.target.value)}
              >
                <option value="">{t("Same as system")}</option>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("Appearance")}>
              <select
                value={settings.appearance}
                onChange={(e) =>
                  act(() => save({ ...settings, appearance: e.target.value }))
                }
              >
                <option value="system">{t("System")}</option>
                <option value="light">{t("Light")}</option>
                <option value="dark">{t("Dark")}</option>
              </select>
            </Field>
          </section>
        </div>
      )}
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function StepperButtons({
  label,
  onStep,
}: {
  label: string;
  onStep: (delta: number) => void;
}) {
  return (
    <span className="stepper-buttons">
      <button
        type="button"
        aria-label={t("Increase {name} by one second", { name: tb(label) })}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onStep(1)}
      >
        ▴
      </button>
      <button
        type="button"
        aria-label={t("Decrease {name} by one second", { name: tb(label) })}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onStep(-1)}
      >
        ▾
      </button>
    </span>
  );
}
function LengthInput({
  value,
  onCommit,
  onValidity,
}: {
  value: number;
  onCommit: (length: number) => void;
  onValidity: (valid: boolean) => void;
}) {
  const [text, setText] = useState(String(value)),
    [invalid, setInvalid] = useState("");
  useEffect(() => {
    setText(String(value));
    setInvalid("");
    onValidity(true);
  }, [value, onValidity]);
  const commit = () => {
    try {
      const trimmed = text.trim();
      if (!/^\d+(\.\d{1,3})?$/.test(trimmed))
        throw Error("Enter seconds, e.g. 7.32.");
      onCommit(Number(trimmed));
      setInvalid("");
      onValidity(true);
    } catch (e) {
      setInvalid(e instanceof Error ? e.message : String(e));
      onValidity(false);
    }
  };
  return (
    <>
      <input
        aria-label={t("Length in seconds")}
        inputMode="decimal"
        value={text}
        aria-invalid={!!invalid}
        onChange={(e) => {
          setText(e.target.value);
          onValidity(false);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      {invalid && <small role="alert">{tb(invalid)}</small>}
    </>
  );
}
function TimeInput({
  value,
  onChange,
  onValidity,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  onValidity: (valid: boolean) => void;
  label: string;
}) {
  const [text, setText] = useState(preciseTimestamp(value)),
    [invalid, setInvalid] = useState("");
  useEffect(() => {
    setText(preciseTimestamp(value));
    setInvalid("");
    onValidity(true);
  }, [value, onValidity]);
  const commit = () => {
    try {
      onChange(parseTimestamp(text));
      setInvalid("");
      onValidity(true);
    } catch (e) {
      setInvalid(String(e));
      onValidity(false);
    }
  };
  const step = (delta: number) => {
    try {
      onChange(Math.round((value + delta) * 1000) / 1000);
      setInvalid("");
      onValidity(true);
    } catch (e) {
      setInvalid(String(e));
      onValidity(false);
    }
  };
  return (
    <div className="time-input">
      <div className="number-stepper">
        <input
          aria-label={t("{name} timestamp", { name: tb(label) })}
          value={text}
          aria-invalid={!!invalid}
          onChange={(e) => {
            setText(e.target.value);
            onValidity(false);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <StepperButtons label={label} onStep={step} />
      </div>
      {invalid && <small role="alert">{tb(invalid)}</small>}
    </div>
  );
}
initLanguage().finally(() =>
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  ),
);

function ErrorPopup({
  message,
  nameFix,
  onClose,
  onFix,
}: {
  message: string;
  nameFix: { original: string; proposed: string } | null;
  onClose: () => void;
  onFix: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="error-popup"
      aria-labelledby="error-title"
      aria-describedby="error-message"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <h2 id="error-title">
        {nameFix ? t("Fix file name") : t("Something went wrong")}
      </h2>
      <p id="error-message">{tb(message)}</p>
      {nameFix && (
        <dl className="filename-comparison">
          <dt>{t("Original name")}</dt>
          <dd>{nameFix.original || t("(empty)")}</dd>
          <dt>{t("Proposed name")}</dt>
          <dd>{nameFix.proposed}</dd>
        </dl>
      )}
      <div className="error-popup-actions">
        <button onClick={onClose}>{nameFix ? t("Cancel") : t("Close")}</button>
        {nameFix && (
          <button className="primary" onClick={onFix}>
            {t("Fix name")}
          </button>
        )}
      </div>
    </dialog>
  );
}
