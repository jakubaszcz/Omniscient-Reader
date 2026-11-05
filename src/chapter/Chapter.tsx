import {useEffect, useState} from "react";

export function Chapter({file}: {file: string}) {
    const [html, setHtml] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");

        async function loadChapter() {
            try {
                const response = await fetch(`${import.meta.env.BASE_URL}books/${file}`, {
                    signal: controller.signal,
                });
                if (!response.ok) throw new Error("Cannot load the chapter.");

                const content = await response.text();
                const document = new DOMParser().parseFromString(content, "text/html");
                document.querySelectorAll("img[src]").forEach((image) => {
                    image.setAttribute("src", new URL(image.getAttribute("src")!, response.url).href);
                });
                if (!controller.signal.aborted) setHtml(document.body.innerHTML);
            } catch (error) {
                if (!controller.signal.aborted) {
                    setError(error instanceof Error ? error.message : "Error while loading.");
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        loadChapter();
        return () => controller.abort();
    }, [file]);

    if (error) return <p role="alert" className="text-red-600">{error}</p>;
    if (loading) return <p role="status" className="text-gray-500">Chargement…</p>;

    return (
        <article
            className="reader text-lg leading-8 [&_p]:my-4 [&_h2]:my-6 [&_h2]:text-2xl [&_h2]:font-bold [&_img]:max-w-full"
            dangerouslySetInnerHTML={{__html: html}}
        />
    );
}
