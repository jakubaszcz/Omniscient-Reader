import {useEffect, useState} from "react";
import "./App.css";
import {Chapter} from "./chapter/Chapter.tsx";
import {invoke} from "@tauri-apps/api/core";


export interface Save {
    chapter: number
}

function App() {
  const [chapters, setChapters] = useState<string[]>([]);
  const [loadChapter, setLoadChapter] = useState<Save>()
  const [index, setIndex] = useState<number>(0);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  async function call_save(id: number) {
      console.log("saved")
      await invoke<Save>("save", {
          content: {
              chapter: id
          }
      })
  }

  useEffect(() => {

    async function fetchChapter() {
        try {
            const response = await invoke<Save>("load");

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
        error instanceof Error ? error.message: "Cannot load."
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
          <Chapter key={selectedChapter} file={selectedChapter} />
            <button disabled={index === 0} onClick={() => changeChapter(index - 1)}>
                Previous
            </button>
            <button disabled={index === chapters.length - 1} onClick={() => changeChapter(index + 1)}>
                Next
        </button>
        </main>
    );
}

  return (
      <main>
        <p>Last saved chapter: {loadChapter?.chapter}</p>
        <p>{chapters.length} Chapters</p>
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
