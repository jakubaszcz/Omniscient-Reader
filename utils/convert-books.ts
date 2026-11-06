import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

const outputDir = path.resolve("public/books");
const inputDir = path.resolve("public/ORV/OEBPS");

const dom = new JSDOM("");
const parser = new dom.window.DOMParser();
const DOMPurify = createDOMPurify(dom.window);

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
    const entries = await readdir(inputDir, { withFileTypes: true });

    const files = entries
        .filter(
            (entry) => entry.isFile() && /^ch_.*\.xhtml$/i.test(entry.name),
        )
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

    if (files.length === 0) {
        throw new Error(`Aucun fichier ch_*.xhtml trouvé dans ${inputDir}`);
    }

    await mkdir(outputDir, { recursive: true });

    let failures = 0;
    let chapters: string[] = [];

    for (const filename of files) {
        try {
            const xhtml = await readFile(path.join(inputDir, filename), "utf8");
            const html = convertChapter(xhtml);
            const outputName = filename.replace(/\.xhtml$/i, ".html");

            chapters.push(outputName)

            await writeFile(
                path.join(outputDir, outputName),
                `${html}\n`,
                "utf8",
            );

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