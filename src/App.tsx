import {useEffect, useState} from "react";
import "./App.css";
import {ThemeToggle} from "./ThemeToggle";
import {Chapter} from "./chapter/Chapter.tsx";
import {invoke} from "@tauri-apps/api/core";
import {getCurrentWindow} from "@tauri-apps/api/window";

export interface Save {
    chapter: number;
    paragraph_id: string | null;
}

const chapterNumber = (file: string) => file.match(/ch_(\d+)/)?.[1] ?? file;

function App() {
    const [chapters, setChapters] = useState<string[]>([]);
    const [chapterError, setChapterError] = useState("");
    const [chaptersLoading, setChaptersLoading] = useState(true);
    const [loadChapter, setLoadChapter] = useState<Save | null>(null);
    const [index, setIndex] = useState(0);
    const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [saveMessage, setSaveMessage] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let changing = false;
        async function handleKeyDown(event: KeyboardEvent) {
            if (event.key !== "F11" || !("__TAURI_INTERNALS__" in window)) return;
            event.preventDefault();
            if (event.repeat || changing) return;
            changing = true;
            try {
                const app = getCurrentWindow();
                await app.setFullscreen(!(await app.isFullscreen()));
            } catch (error) { console.error(error); }
            finally { changing = false; }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            try {
                const response = await fetch(`${import.meta.env.BASE_URL}books/chapters.json`, {signal: controller.signal});
                if (!response.ok) throw new Error("Unable to load chapters.");
                const files: string[] = await response.json();
                if (!controller.signal.aborted) setChapters(files);
            } catch (error) {
                if (!controller.signal.aborted) setChapterError(error instanceof Error ? error.message : "Unable to load content.");
            } finally {
                if (!controller.signal.aborted) setChaptersLoading(false);
            }
        }
        void load();
        if ("__TAURI_INTERNALS__" in window) {
            void invoke<Save | null>("load").then(setLoadChapter).catch(() => setSaveMessage("Unable to load your saved position."));
        }
        return () => controller.abort();
    }, []);

    function select(file: string | null, nextIndex: number) {
        setSelectedChapter(file);
        setIndex(nextIndex);
        setSaveMessage("");
        window.scrollTo(0, 0);
    }
    function changeChapter(nextIndex: number) {
        if (nextIndex >= 0 && nextIndex < chapters.length) select(chapters[nextIndex], nextIndex);
    }
    async function saveChapter() {
        setSaving(true);
        try {
            const content: Save = {chapter: index, paragraph_id: loadChapter?.chapter === index ? loadChapter.paragraph_id : null};
            await invoke<void>("save", {content});
            setLoadChapter(content);
            setSaveMessage("Your reading position has been saved.");
        } catch { setSaveMessage("Saving failed. Please try again in the app."); }
        finally { setSaving(false); }
    }

    if (selectedChapter) return (
        <main className="reading-layout">
            <header className="reading-toolbar">
                <button className="button button-quiet" onClick={() => select(null, 0)}>← Library</button>
                <span className="toolbar-chapter">Chapter {chapterNumber(selectedChapter)}</span>
                <div className="header-actions"><ThemeToggle /><button className="button button-primary" disabled={saving} onClick={saveChapter}>{saving ? "Saving…" : "Save position"}</button></div>
            </header>
            <div className="reading-intro">
                <span className="eyebrow">Omniscient Reader’s Viewpoint</span>
                <p>Click a paragraph to place your bookmark.</p>
                <p className="save-feedback" role="status">{saveMessage}</p>
            </div>
            <Chapter key={selectedChapter} file={selectedChapter} index={index} save={loadChapter} onSaved={(save) => { setLoadChapter(save); setSaveMessage("Bookmark saved."); }} />
            <nav className="chapter-navigation" aria-label="Chapter navigation">
                <button className="button button-secondary" disabled={index === 0} onClick={() => changeChapter(index - 1)}>← Previous chapter</button>
                <span>{index + 1} / {chapters.length}</span>
                <button className="button button-primary" disabled={index === chapters.length - 1} onClick={() => changeChapter(index + 1)}>Next chapter →</button>
            </nav>
        </main>
    );

    const savedFile = loadChapter ? chapters[loadChapter.chapter] : undefined;
    const visibleChapters = chapters.map((file, chapterIndex) => ({file, chapterIndex})).filter(({file}) => `chapter ${chapterNumber(file)}`.includes(query.trim().toLowerCase()));
    return (
        <main className="library">
            <header className="library-header">
                <a className="brand" href="#" aria-label="Home"><span className="brand-symbol" aria-hidden="true">OR</span><span>THE READER’S LIBRARY</span></a>
                <div className="header-actions"><span className="header-caption">A world in every chapter.</span><ThemeToggle /></div>
            </header>
            <section className="library-heading">
                <p className="eyebrow">Your reading space</p>
                <h1>Omniscient Reader<span>’s Viewpoint.</span></h1>
                <p>The story continues. Pick up where you left off.</p>
            </section>
            <section className="resume-card" aria-labelledby="resume-title">
                <div className="resume-decoration" aria-hidden="true">❝</div>
                <div className="resume-content">
                    <p className="eyebrow">{savedFile ? "Your last saved position" : "A new story awaits"}</p>
                    <h2 id="resume-title">{savedFile ? `Continue chapter ${chapterNumber(savedFile)}` : "Every story begins with a first page."}</h2>
                    <p>{savedFile ? "Your bookmark is waiting, right where you left it." : "Settle in and step into the world of Kim Dokja."}</p>
                    {savedFile && loadChapter && <dl className="save-details">
                        <div><dt>Chapter</dt><dd>{chapterNumber(savedFile)}</dd></div>
                        <div><dt>Position</dt><dd>{loadChapter.paragraph_id ? `Paragraph ${loadChapter.paragraph_id.replace(/^p-/, "")}` : "Beginning of chapter"}</dd></div>
                        <div><dt>In the library</dt><dd>{loadChapter.chapter + 1} of {chapters.length}</dd></div>
                    </dl>}
                    <button className="button button-light" disabled={!chapters.length} onClick={() => changeChapter(savedFile && loadChapter ? loadChapter.chapter : 0)}>{savedFile ? "Continue reading" : "Start reading"}<span aria-hidden="true">→</span></button>
                    {saveMessage && <p role="status">{saveMessage}</p>}
                </div>
            </section>
            <section className="chapter-section" aria-labelledby="chapters-title">
                <div className="section-heading">
                    <div><p className="eyebrow">The collection</p><h2 id="chapters-title">All chapters <span className="count">{chapters.length}</span></h2></div>
                    <label className="search-field"><span className="sr-only">Search chapters</span><span aria-hidden="true">⌕</span><input type="search" placeholder="Search chapters…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
                </div>
                {chaptersLoading && <p className="empty-state" role="status">Loading chapters…</p>}
                {chapterError && <p className="empty-state" role="alert">{chapterError}</p>}
                {!chaptersLoading && !chapterError && !visibleChapters.length && <p className="empty-state" role="status">No chapters found.</p>}
                <ul className="chapter-grid">
                    {visibleChapters.map(({file, chapterIndex}) => <li key={file}>
                        <button className={`chapter-card${savedFile === file ? " is-saved" : ""}`} onClick={() => select(file, chapterIndex)}>
                            <span className="chapter-number">{chapterNumber(file).padStart(2, "0")}</span>
                            <span className="chapter-card-copy"><span className="chapter-card-title">Chapter {chapterNumber(file)}</span><span className="chapter-card-subtitle">{savedFile === file ? "Bookmark saved" : "Omniscient Reader’s Viewpoint"}</span></span>
                            <span className="chapter-arrow" aria-hidden="true">↗</span>
                        </button>
                    </li>)}
                </ul>
            </section>
            <footer className="library-footer">Omniscient Reader’s Viewpoint <span>Enjoy the story.</span></footer>
        </main>
    );
}
export default App;
