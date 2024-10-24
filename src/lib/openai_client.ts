import { SECRET_OPENAI_API_KEY } from '$env/static/private';
import { Configuration, OpenAIApi, type ChatCompletionRequestMessage } from 'openai';

const configuration = new Configuration({
	apiKey: SECRET_OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

export async function createChatCompletion(
	document: string[],
	question: string,
	username: string = '',
): Promise<string | null> {
	let messages = [];

	// Definimos un contexto detallado para el sistema
	let systemContent = `You are a digital assistant called TRACO, designed to assist citizens with questions related to the Dirección Regional de Transportes y Comunicaciones de Huánuco (DRTC). Your goal is to guide users through various services such as vehicle licenses, authorized driving schools, authorized medical centers, citizen complaints, contact information, office hours, and more. All answers should be provided in Spanish, with clarity and a friendly tone.

	When a user asks a question, you should structure your response to make it easy to understand, using headings, subheadings, and lists. For general questions, use a decision tree approach by providing options for the user to choose from. For example, if a user asks about "licenses," offer categories like "requisitos para una nueva licencia," "renovación de licencia," or "procedimiento para licencia duplicada".

	Always ensure the user understands the process, and encourage follow-up questions. If the answer is not available or unclear, guide the user on the next steps or where they can obtain further information.`


	// Incluimos los documentos relacionados a los servicios y trámites de la DRTC
	systemContent += '\n\nThe following are official documents detailing the procedures for the DRTC services:\n\n```';
	for (let i = 0; i < document.length; i++) {
		systemContent += '\n' + document[i];
	}
	systemContent += '\n```\n\nThe user will ask questions about the above documents, and you should answer based on the information provided. If the information is unclear or missing, suggest possible steps or where they can seek more information.';

	// Añadimos el contenido del sistema al array de mensajes
	messages.push({
		role: 'system',
		content: systemContent
	} satisfies ChatCompletionRequestMessage);

	// Definimos el prompt del usuario con la pregunta que realiza
	let prompt = `A citizen has asked the following question regarding DRTC services: "${question}". Answer based on the provided documents, using a decision tree format when the question is general.`;

	// Añadimos el prompt del usuario al array de mensajes
	messages.push({
		role: 'user',
		content: prompt
	} satisfies ChatCompletionRequestMessage);

	console.log(messages);

	try {
		// Hacemos la llamada a la API de OpenAI para obtener la respuesta
		let response = await openai.createChatCompletion({
			model: 'gpt-4o-mini',
			messages: messages,
			temperature: 0.7, // Ajustamos la creatividad de las respuestas
			max_tokens: 1200 // Aumentamos el límite de tokens para permitir respuestas más completas
		});

		// Devolvemos la respuesta generada por el modelo
		if (response.data.choices.length > 0) {
			return response.data.choices[0].message!.content;
		} else {
			return null;
		}
	} catch (error: any) {
		if (error.response) {
			console.log(error.response.status);
			console.log(error.response.data);
		} else {
			console.log(error.message);
		}
		return null;
	}
}
