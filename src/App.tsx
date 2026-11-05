import {use, useEffect, useState} from "react";
import "./App.css";

function App() {
  const [chapters, setChapters] = useState<string[]>([]);
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");

  const controller = new AbortController();

  useEffect(() => {
    async function loadChapters() {
      try {
        const response = await fetch(
            `public/books/chapters.json`
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

  async function loadChapter(chapter: number) {
    try {
      const response = await fetch(
          `public/books/ch_${chapter}.html`,
          { signal: controller.signal },
      );

      if (!response.ok) {
        throw new Error("Impossible de charger le chapitre.");
      }

      const content = await response.text();

      if (!controller.signal.aborted) {
        setHtml(content);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(
            error instanceof Error ? error.message : "Erreur de chargement.",
        );
      }
    }
  }

  return (
      <main>
        <p>{chapters.length} Chapters</p>
        {chapters.map((_, index) => (
            <button
                key={index}
                onClick={() => loadChapter(index + 1)}
            >
              Chapter {index + 1}
            </button>
        ))}
        <article
            className="reader"
            dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
  );
}

export default App;