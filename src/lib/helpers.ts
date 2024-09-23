interface TextBlock {
    isCodeBlock: boolean;
    text: string;
    language?: string;
}

function markdownToPlainText(texto: string): string {
    // Eliminar encabezados (#, ##, etc.)
    texto = texto.replace(/^#+\s+/gm, '');

    // Eliminar énfasis (negrita, cursiva, subrayado)
    texto = texto.replace(/(\*\*|__)(.*?)\1/g, '$2'); // **negrita** o __negrita__
    texto = texto.replace(/(\*|_)(.*?)\1/g, '$2');   // *cursiva* o _cursiva_
    texto = texto.replace(/~~(.*?)~~/g, '$1');       // ~~tachado~~

    // Eliminar enlaces y dejar solo el texto
    texto = texto.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    // Eliminar imágenes
    texto = texto.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');

    // Eliminar bloques de código en línea (backticks)
    texto = texto.replace(/`([^`]+)`/g, '$1');

    // Eliminar bloques de código multilínea (triple backtick)
    texto = texto.replace(/```[\s\S]*?```/g, '');

    // Eliminar listas (tanto numeradas como no numeradas)
    texto = texto.replace(/^[\*\+-]\s+/gm, ''); // Listas con *, -, +
    texto = texto.replace(/^\d+\.\s+/gm, '');   // Listas numeradas

    // Eliminar citas (>)
    texto = texto.replace(/^>\s+/gm, '');

    // Eliminar líneas horizontales (---, ***, ___)
    texto = texto.replace(/^\s*[-_*]{3,}\s*$/gm, '');

    // Eliminar cualquier otro carácter especial de Markdown sobrante
    texto = texto.replace(/[\\`*_{}[\]()#+.!|>~-]/g, '');

    // Eliminar múltiples líneas en blanco consecutivas
    texto = texto.replace(/\n{3,}/g, '\n\n');

    // Eliminar espacios en blanco extra
    texto = texto.trim();

    return texto;
}

function preprocessMarkdown(content: string): string {
    return content
        .replace(/^(#{1,6} .*$)/gm, '\n$1\n')  // Asegura líneas en blanco alrededor de encabezados
        .replace(/^([*-] .*$)/gm, '\n$1')     // Asegura una línea en blanco antes de las listas
        .replace(/\n{3,}/g, '\n\n');          // Elimina líneas en blanco excesivas
}

function parseText(text: string): TextBlock[] {
    const regex = /```([\w-]+)?\s*([\s\S]+?)\s*```/g;
    const blocks: TextBlock[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text))) {
        const [fullMatch, language, code] = match;
        const preMatch = text.slice(lastIndex, match.index);
        if (preMatch) {
            blocks.push({ isCodeBlock: false, text: preMatch });
        }
        blocks.push({ isCodeBlock: true, text: code, language });
        lastIndex = match.index + fullMatch.length;
    }

    const lastBlock = text.slice(lastIndex);
    if (lastBlock) {
        blocks.push({ isCodeBlock: false, text: lastBlock });
    }

    return blocks;
}

export { markdownToPlainText, preprocessMarkdown, parseText };