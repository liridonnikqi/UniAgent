import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import type { ChatMessage } from '$lib/types';

const SYSTEM_PROMPT = `Je UniAgent, një asistent inteligjent për studentë universitarë (asistencë studentore).

Ndihmo me:
- shpjegimin e koncepteve dhe lëndëve
- përgatitjen për provime
- detyra, projekte dhe raporte
- planifikimin e kohës së studimit
- shkrimin akademik dhe citimin e burimeve

Jep përgjigje të qarta, të shkurtra dhe praktike. Zakonisht 1-3 paragrafë ose një listë e shkurtër.
Mos përdor markdown. Shkruaj tekst të thjeshtë, pa tituj me ## dhe pa blloqe kodi.
Nëse nuk je i sigurt, thuaj.
Përgjigju në të njëjtën gjuhë që përdor studenti. Nëse shkruan shqip, përgjigju shqip.`;

function makeChain(
	apiKey: string,
	baseURL: string | undefined,
	modelName: string,
	studentName?: string | null,
	university?: string | null
) {
	const model = new ChatOpenAI({
		model: modelName,
		temperature: 0.4,
		apiKey,
		...(baseURL ? { configuration: { baseURL } } : {})
	});

	let system = SYSTEM_PROMPT;
	if (studentName && university) {
		system += `\n\nStudenti quhet ${studentName} dhe studion në ${university}. Përshtat shembujt dhe këshillat me këtë kontekst kur ka kuptim.`;
	}

	const prompt = ChatPromptTemplate.fromMessages([
		['system', system],
		new MessagesPlaceholder('history'),
		['human', '{input}']
	]);

	return prompt.pipe(model).pipe(new StringOutputParser());
}

export async function* streamStudentQuestion(
	message: string,
	history: ChatMessage[] = [],
	apiKey: string,
	baseURL?: string,
	modelName = 'gpt-4o-mini',
	studentName?: string | null,
	university?: string | null
) {
	const chain = makeChain(apiKey, baseURL, modelName, studentName, university);

	const past = history
		.slice(-20)
		.map((item) =>
			item.role === 'user' ? new HumanMessage(item.content) : new AIMessage(item.content)
		);

	const stream = await chain.stream({
		input: message,
		history: past
	});

	for await (const chunk of stream) {
		if (chunk) yield chunk;
	}
}
