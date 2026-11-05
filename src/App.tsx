import {useEffect, useState} from "react";
import "./App.css";
import {Chapter} from "./chapter/Chapter.tsx";

function App() {
  const [chapters, setChapters] = useState<string[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);


  useEffect(() => {
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

  }, []);



  if (selectedChapter) {
    return (
        <main className="mx-auto max-w-3xl px-6 py-8">
          <button
              type="button"
              onClick={() => setSelectedChapter(null)}
          >
            ← Back to chapters
          </button>
          <Chapter key={selectedChapter} file={selectedChapter} />
        </main>
    );
  }

  return (
      <main>
        <p>{chapters.length} Chapters</p>
        <ul>
          {chapters.map((file, index) => (
              <li
                  key={file}
              >
                <button type="button" onClick={() => setSelectedChapter(file)}>
                  Chapter {index + 1}
                </button>
              </li>
          ))}
        </ul>
      </main>
  );
}

export default App;
