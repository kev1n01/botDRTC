<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	export let content: string;

	function renderMarkdown(markdown: string): string {
		// Configurar marked para manejar correctamente los encabezados y listas
		marked.setOptions({
			headerIds: true,
			mangle: false
		});

		// Renderizar el markdown a HTML
		const rawHtml = marked(markdown);

		// Sanitizar el HTML para prevenir XSS
		return DOMPurify.sanitize(rawHtml);
	}
</script>

<div class="markdown-content">
	{@html renderMarkdown(content)}
</div>

<style>
	.markdown-content :global(h1) {
		font-size: 1.1em !important;
		text-transform: uppercase;
		font-weight: 700 !important;
		margin-top: 0.2em;
		margin-bottom: 0.2em;
	}
	.markdown-content :global(h2) {
		font-size: 1.1em !important;
		text-transform: uppercase;
		font-weight: 700 !important;
		margin-top: 0.2em;
		margin-bottom: 0.2em;
	}
	.markdown-content :global(h3) {
		font-size: 1.1em !important;
		font-weight: 500 !important;
		margin-top: 0.2em;
		margin-bottom: 0em;
	}
	.markdown-content :global(h4) {
		font-size: 1.1em !important;
		font-weight: 500 !important;
		margin-top: 0.2em;
		margin-bottom: 0em;
	}
	.markdown-content :global(ul),
	.markdown-content :global(ol) {
		padding-left: 1.5em;
		margin-bottom: 1em;
	}
	.markdown-content :global(li) {
		margin-bottom: 0.2em;
	}
	.markdown-content :global(p) {
		margin-bottom: 0.2em;
	}
	/* Estilos para los enlaces (a) */
	.markdown-content :global(a) {
		color: #12bcda; /* Cambia este color según tus necesidades */
		text-decoration: none;
		font-weight: 600;
	}

	/* Subrayado en los enlaces cuando se pasa el ratón por encima */
	.markdown-content :global(a:hover) {
		text-decoration: underline;
		color: #0e9eb8; /* Cambia este color si deseas un color diferente al hacer hover */
	}
</style>
