import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

const target = process.argv[2] ?? "computer";
const outputDir = path.resolve(target === "android" ? "generated/android/books" : "public/books");
const inputDir = path.resolve("public/ORV/OEBPS");

const dom = new JSDOM("");
const parser = new dom.window.DOMParser();
const DOMPurify = createDOMPurify(dom.window);

type Block = {
    id: string;
    type: "title" | "paragraph" | "star_stream" | "scenario";
    text: string;
};

type ChapterJson = { chapter: number; blocks: Block[] };

function convertChapterJSON(xhtml: string, chapter: number): ChapterJson {
    const doc = parser.parseFromString(xhtml, "application/xhtml+xml");
    const parseError = doc.querySelector("parsererror");
    if (parseError) throw new Error("Document XHTML invalide : " + parseError.textContent);
    const body = doc.querySelector("body");
    if (!body) throw new Error("Le chapitre ne contient pas de body");

    body.querySelectorAll("a").forEach((link) => {
        if (link.getAttribute("href")?.includes("orv.pages.dev/stories/")) link.remove();
    });

    const blocks: Block[] = [];
    function addBlock(type: Block["type"], text: string) {
        const cleaned = text.trim();
        if (!cleaned) return;
        blocks.push({ id: `ch-${chapter}-b-${blocks.length + 1}`, type, text: cleaned });
    }

    // Preserve line breaks without carrying HTML or images into the JSON.
    function textOf(element: Element): string {
        const copy = element.cloneNode(true) as Element;
        copy.querySelectorAll("img, script, style").forEach((node) => node.remove());
        copy.querySelectorAll("br").forEach((node) => node.replaceWith(doc.createTextNode("\n")));
        return (copy.textContent ?? "").trim();
    }

    function visit(parent: Element) {
        for (const element of Array.from(parent.children)) {
            const tag = element.localName.toLowerCase();
            if (["img", "script", "style"].includes(tag)) continue;
            if (tag === "fieldset" || element.classList.contains("orv-window")) {
                const lines = Array.from(element.querySelectorAll("h1,h2,h3,h4,h5,h6,legend,p"))
                    .map(textOf).filter(Boolean);
                addBlock("scenario", lines.length ? lines.join("\n\n") : textOf(element));
                continue;
            }
            const text = textOf(element);
            if (/^h[1-6]$/.test(tag)) {
                addBlock("title", text);
            } else if (tag === "p") {
                addBlock(text.startsWith("[") && text.endsWith("]") ? "star_stream" : "paragraph", text);
            } else {
                visit(element);
            }
        }
    }

    visit(body);
    return { chapter, blocks };
}
function convertChapter(xhtml: string): string {
    const doc = parser.parseFromString(xhtml, "application/xhtml+xml");

    if (doc.querySelector("parsererror")) {
        throw new Error("Document XHTML invalide");
    }

    const body = doc.querySelector("body");

    if (!body) {
        throw new Error("Le chapitre ne contient pas de body");
    }

    body.querySelectorAll("p").forEach((paragraph, index) => {
        paragraph.setAttribute("data-paragraph-id", `p-${index + 1}`);
    });

    body.querySelectorAll("a").forEach((link) => {
        const href = link.getAttribute("href") ?? "";

        if (href.includes("orv.pages.dev/stories/")) {
            link.remove();
        }
    });

    body.querySelectorAll("fieldset").forEach((field) => {
        const windowElement = doc.createElementNS(
            "http://www.w3.org/1999/xhtml",
            "div",
        );

        windowElement.classList.add("orv-window", "scenario");

        while (field.firstChild) {
            windowElement.appendChild(field.firstChild);
        }

        const title = windowElement.querySelector("h3");

        if (title) {
            title.classList.add("orv-window-title");
            title.removeAttribute("style");
        }

        field.replaceWith(windowElement);
    });

    body.querySelectorAll("h2").forEach((title) => {
        title.classList.add("orv-chapter-title");
        title.removeAttribute("style");
    });

    return DOMPurify.sanitize(body.innerHTML, {
        USE_PROFILES: { html: true },
    });
}

async function main(): Promise<void> {
    if (!["computer", "android"].includes(target) || process.argv.length > 3) {
        throw new Error("Usage : tsx utils/convert-books.ts [computer|android]");
    }
    const entries = await readdir(inputDir, { withFileTypes: true });

    const files = entries
        .filter(
            (entry) => entry.isFile() && /^ch_\d+\.xhtml$/i.test(entry.name),
        )
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

    if (files.length === 0) {
        throw new Error(`Aucun fichier ch_*.xhtml trouvé dans ${inputDir}`);
    }

    await mkdir(outputDir, { recursive: true });

    let failures = 0;
    const chapters: string[] = [];

    for (const filename of files) {
        try {
            const xhtml = await readFile(path.join(inputDir, filename), "utf8");
            const chapter = Number(/^ch_(\d+)\.xhtml$/i.exec(filename)![1]);
            const html = target === "android"
                ? JSON.stringify(convertChapterJSON(xhtml, chapter), null, 2)
                : convertChapter(xhtml);
            const outputName = filename.replace(/\.xhtml$/i, target === "android" ? ".json" : ".html");



            await writeFile(
                path.join(outputDir, outputName),
                `${html}\n`,
                "utf8",
            );

            chapters.push(outputName);
            console.log(`✓ ${filename} → ${outputName}`);
        } catch (error) {
            failures++;
            console.error(
                `✗ ${filename} :`,
                error instanceof Error ? error.message : error,
            );
        }
    }

    await writeFile(
        path.join(outputDir, "chapters.json"),
        JSON.stringify(chapters, null, 2),
        "utf8",
    );

    console.log(
        `${files.length - failures}/${files.length} chapitre(s) converti(s).`,
    );

    if (failures > 0) {
        throw new Error(`${failures} chapitre(s) en échec`);
    }
}

main()
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => {
        dom.window.close();
    });
