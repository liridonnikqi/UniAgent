import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

marked.setOptions({
	gfm: true,
	breaks: true
});

export function renderMarkdown(text: string) {
	const html = marked.parse(text, { async: false }) as string;
	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS: [
			'p',
			'br',
			'strong',
			'b',
			'em',
			'i',
			'h1',
			'h2',
			'h3',
			'ul',
			'ol',
			'li',
			'code',
			'blockquote'
		],
		ALLOWED_ATTR: []
	});
}
