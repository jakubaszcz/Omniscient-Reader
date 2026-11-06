import {useEffect, useState} from "react";
import "./App.css";
import {Chapter} from "./chapter/Chapter.tsx";
import {invoke} from "@tauri-apps/api/core";


export interface Save {
    chapter: number,
    paragraph_id: string | null
}

function App() {
  const [chapters, setChapters] = useState<string[]>([]);
  const [chapterError, setChapterError] = useState("");
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [loadChapter, setLoadChapter] = useState<Save | null>(null)
  const [index, setIndex] = useState<number>(0);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  async function call_save(id: number) {
      try {
          const content: Save = {
              chapter: id,
              paragraph_id: loadChapter?.chapter === id ? loadChapter.paragraph_id : null,
          };
          await invoke<void>("save", {content});
          setLoadChapter(content);
          console.log("saved");
      } catch (error) {
          console.error("Save failed:", error);
      }
  }
  useEffect(() => {

    async function fetchChapter() {
        try {
            const response = await invoke<Save | null>("load");

            setLoadChapter(response)
        } catch (e) {
            console.error(e)
        }
    }

    async function loadChapters() {
      try {
        const response = await fetch(
            `${import.meta.env.BASE_URL}books/chapters.json`
        );

        if (!response.ok) {
          throw new Error('Cannot load chapters.')
        }

        const files: string[] = await response.json();
        setChapters(files);
      } catch (error) {
        setChapterError(error instanceof Error ? error.message : "Cannot load.");
      } finally {
        setChaptersLoading(false);
      }
    }

    loadChapters();
    fetchChapter()

  }, []);

    function select(file: string | null, chapter: number) {
        console.log(chapter)
        setSelectedChapter(file)
        setIndex(chapter)
    }

    function changeChapter(nextIndex: number) {
        if (nextIndex < 0 || nextIndex >= chapters.length) return;
        select(chapters[nextIndex], nextIndex);
        window.scrollTo(0, 0);
    }

  if (selectedChapter) {
    return (
        <main className="mx-auto max-w-3xl px-6 py-8">
          <button
              type="button"
              onClick={() => select(null, 0)}
          >
            ← Back to chapters
          </button>
            <br/>
            <button onClick={() => call_save(index)}>
                Save
            </button>
          <Chapter key={selectedChapter} file={selectedChapter} index={index} save={loadChapter} onSaved={setLoadChapter} />
            <button disabled={index === 0} onClick={() => changeChapter(index - 1)}>
                Previous
            </button>
            <button disabled={index === chapters.length - 1} onClick={() => changeChapter(index + 1)}>
                Next
        </button>
        </main>
    );
}

  // @ts-ignore
    return (
      <main>
        {chaptersLoading && <p role="status">Chargement des chapitres…</p>}
        {chapterError && <p role="alert">{chapterError}</p>}
        <p>Last saved chapter: {loadChapter?.chapter}</p>
        <button disabled={!loadChapter || !chapters[loadChapter.chapter]} onClick={() => { if (loadChapter) changeChapter(loadChapter.chapter); }}>Last save</button>
        <ul>
          {chapters.map((file, index) => (
              <li
                  key={file}
              >
                <button type="button" onClick={() => select(file, index)}>
                  Chapter {index + 1}
                </button>
              </li>
          ))}
        </ul>
      </main>
  );
}

export default App;


