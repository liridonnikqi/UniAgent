export type MessagePart =
	{ type: 'text'; text: string } | { type: 'code'; lang: string; code: string };

function isRawHtml(content: string) {
	const start = content.trimStart();
	return /^<!DOCTYPE html/i.test(start) || /^<html[\s>]/i.test(start);
}

export function parseMessage(content: string): MessagePart[] {
	if (isRawHtml(content) && !content.includes('```')) {
		return [{ type: 'code', lang: 'html', code: content.trim() }];
	}

	const parts: MessagePart[] = [];
	let rest = content;

	while (rest.length) {
		const start = rest.indexOf('```');
		if (start < 0) {
			if (rest) parts.push({ type: 'text', text: rest });
			break;
		}

		if (start > 0) {
			parts.push({ type: 'text', text: rest.slice(0, start) });
		}

		const after = rest.slice(start + 3);
		const nl = after.indexOf('\n');
		const lang = (nl < 0 ? after : after.slice(0, nl)).trim();
		const body = nl < 0 ? '' : after.slice(nl + 1);
		const end = body.indexOf('```');

		if (end < 0) {
			parts.push({ type: 'code', lang, code: body.replace(/\n$/, '') });
			break;
		}

		parts.push({ type: 'code', lang, code: body.slice(0, end).replace(/\n$/, '') });
		rest = body.slice(end + 3).replace(/^\n/, '');
	}

	return parts.filter((part) => (part.type === 'text' ? part.text.length : true));
}
