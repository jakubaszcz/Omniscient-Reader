import {type MouseEvent, useEffect, useRef, useState} from "react";
import {invoke} from "@tauri-apps/api/core";
import type {Save} from "../App.tsx";

export function Chapter({file, index, save, onSaved}: {
    file: string;
    index: number;
    save: Save | null;
    onSaved: (save: Save) => void;
}) {
    const articleRef = useRef<HTMLElement>(null);
    // Capture the resume target when this chapter is opened, not on every save.
    const resumeId = useRef(save?.chapter === index ? save.paragraph_id : null);
    const restored = useRef(false);
    const saving = useRef(false);
    const [html, setHtml] = useState("");
    const [error, setError] = useState("");
    const [saveError, setSaveError] = useState("");
    const [loading, setLoading] = useState(true);

    async function handleParagraphClick(event: MouseEvent<HTMLElement>) {
        if (!(event.target instanceof Element) || saving.current) return;
        if (event.target.closest("a")) return;
        const paragraph = event.target.closest<HTMLElement>("p[data-paragraph-id]");
        if (!paragraph || !event.currentTarget.contains(paragraph)) return;
        const paragraphID = paragraph.dataset.paragraphId;
        if (!paragraphID) return;
        saving.current = true;
        setSaveError("");
        try {
            const content: Save = {chapter: index, paragraph_id: paragraphID};
            await invoke<void>("save", {content});
            onSaved(content);
        } catch (error) {
            setSaveError("Unable to save your bookmark. Please try again in the app.");
        } finally {
            saving.current = false;
        }
    }

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        async function loadChapter() {
            try {
                const response = await fetch(
                    `${import.meta.env.BASE_URL}books/${file}`,
                    {signal: controller.signal},
                );
                if (!response.ok) throw new Error("Cannot load the chapter.");
                const content = await response.text();
                const doc = new DOMParser().parseFromString(content, "text/html");
                doc.querySelectorAll("img[src]").forEach((image) => {
                    image.setAttribute("src", new URL(image.getAttribute("src")!, response.url).href);
                });
                if (!controller.signal.aborted) setHtml(doc.body.innerHTML);
            } catch (error) {
                if (!controller.signal.aborted)
                    setError(error instanceof Error ? error.message : "Error while loading.");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }
        void loadChapter();
        return () => controller.abort();
    }, [file]);

    useEffect(() => {
        if (loading || error || !html || restored.current) return;
        const id = resumeId.current;
        if (!id) return;
        const paragraph = articleRef.current?.querySelector(
            `[data-paragraph-id="${CSS.escape(id)}"]`,
        );
        if (!paragraph) return;
        paragraph.scrollIntoView({behavior: "instant", block: "start"});
        restored.current = true;
    }, [html, loading, error]);

    useEffect(() => {
        const article = articleRef.current;
        if (!article) return;
        article.querySelectorAll("[data-saved]").forEach((paragraph) => paragraph.removeAttribute("data-saved"));
        if (save?.chapter === index && save.paragraph_id) {
            article.querySelector(`[data-paragraph-id="${CSS.escape(save.paragraph_id)}"]`)?.setAttribute("data-saved", "true");
        }
    }, [save, index, html, loading]);

    if (error) return <p role="alert" className="reader-message">{error}</p>;
    if (loading) return <p role="status" className="reader-message">Loading…</p>;

    return (
        <>
            {saveError && <p role="alert" className="reader-message">{saveError}</p>}
            <article
                ref={articleRef}
                className="reader"
                lang="en"
                onClick={handleParagraphClick}
                dangerouslySetInnerHTML={{__html: html}}
            />
        </>
    );
}
