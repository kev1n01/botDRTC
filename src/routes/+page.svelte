<script lang="ts">
	import { PUBLIC_PROCESS_FILES_SERVER } from '$env/static/public';
	import { CodeBlock, ProgressRadial } from '@skeletonlabs/skeleton';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
	import ShareButton from '$lib/components/ShareButton.svelte';
	import { markdownToPlainText, preprocessMarkdown, parseText } from '$lib/helpers';
	import {
		Modal,
		Toast,
		initializeStores,
		getToastStore,
		getModalStore
	} from '@skeletonlabs/skeleton';
	import type { ToastSettings, ModalSettings, ModalStore } from '@skeletonlabs/skeleton';
	import FormWhatsaap from '$lib/components/FormWhatsaap.svelte';
	import { onMount, tick } from 'svelte';
	import { clickOutside } from '$lib/clickOutsite';
	import { signOut } from '$lib/auth';
	import { session } from '$lib/sessionStore';
	import ThemeToogle from '$lib/components/ThemeToogle.svelte';

	// init stores
	initializeStores();
	const modalStore: ModalStore = getModalStore();
	const toastStore = getToastStore();

	// Variables to speech-to-text
	let recognition: SpeechRecognition | null = null;
	let isRecording = false;

	// Varibles to text-to-speech
	let synth: SpeechSynthesis | null = null;
	let isSpeaking = false;

	// Variables to messages
	let query = '';
	let documents: string[] = [];
	let metadatas: MetaData[] = [];
	let loading = false;
	let messages: {
		sender: 'user' | 'bot';
		content: string;
		isCodeBlock?: boolean;
		language?: string;
	}[] = [];
	let messagesContainer: HTMLElement | null = null;

	// Declaration interfaces
	interface QueryResult {
		documents: string[][];
		distances: number[][];
		metadatas: MetaData[][];
	}

	// Declaration Interfaces 
	interface MetaData {
		document_title: string;
		file_name: string;
	}

	// types to SpeechRecognition
	declare global {
		interface Window {
			SpeechRecognition: typeof SpeechRecognition;
			webkitSpeechRecognition: typeof SpeechRecognition;
		}
	}

	const whatsappModal = (msg: string): void => {
		const s: ModalSettings = {
			type: 'component',
			component: {
				ref: FormWhatsaap,
				props: { classes: 'card p-8 w-modal', modal: true, message: msg, number_phone: '' }
			}
		};
		modalStore.trigger(s);
	};

	const warningToast = (msg: string) => {
		const toast: ToastSettings = {
			message: msg,
			background: 'variant-filled-warning'
		};
		return toastStore.trigger(toast);
	};

	const successToast = (msg: string) => {
		const toast: ToastSettings = {
			message: msg,
			background: 'variant-filled-success'
		};
		return toastStore.trigger(toast);
	};

	const errorToast = (msg: string) => {
		const toast: ToastSettings = {
			message: msg,
			background: 'variant-filled-error'
		};
		return toastStore.trigger(toast);
	};

	function startRecording() {
		if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
			const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
			recognition = new SpeechRecognition();
			recognition.lang = 'es-ES';
			recognition.continuous = true;
			recognition.interimResults = true;

			recognition.onresult = (event: any) => {
				for (const result of event.results) {
					query = result[0].transcript;
				}
			};

			recognition.start();
			isRecording = true;
		} else {
			errorToast('Tu dispositivo no soporta reconocimiento de voz.');
		}
	}

	function stopRecording() {
		if (recognition) {
			recognition.stop();
			isRecording = false;
		}
	}

	function toggleRecording() {
		if (isRecording) {
			stopRecording();
		} else {
			startRecording();
		}
	}

	function speakText(text: string) {
		if ('speechSynthesis' in window) {
			synth = window.speechSynthesis;
			const utterance = new SpeechSynthesisUtterance(text);
			utterance.lang = 'es-ES'; // Establece el idioma a español

			utterance.onstart = () => {
				isSpeaking = true;
			};

			utterance.onend = () => {
				isSpeaking = false;
			};

			synth.speak(utterance);
		} else {
			errorToast('Tu navegador no soporta la síntesis de voz.');
		}
	}

	function stopSpeaking() {
		if (synth) {
			synth.cancel();
			isSpeaking = false;
		}
	}

	function toggleSpeaking(text: string) {
		if (isSpeaking) {
			stopSpeaking();
		} else {
			speakText(text);
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			queryEmbeddings();
		}
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text).then(
			() => {
				successToast('Texto copiado');
			},
			(err) => {
				errorToast('Error al copiar texto: ' + err);
			}
		);
	}

	const faqQuestions = [
		'¿Cuáles son los requisitos para obtener una licencia de conducir por primera vez?',
		'¿Cuáles son los centros médicos autorizados para la obtención de certificado médico?',
		'¿Cuál es el horario de atención del DTRC?',
		'Perdi mi licencia de conducir, quiero obtener otra',
	];

	function sendFaqQuestion(question: string) {
		query = question;
		queryEmbeddings();
	}

	// Función para guardar mensajes en localStorage
	function saveMessagesToLocalStorage() {
		localStorage.setItem('chatMessages', JSON.stringify(messages));
	}

	// Función para cargar mensajes desde localStorage
	function loadMessagesFromLocalStorage() {
		const savedMessages = localStorage.getItem('chatMessages');
		if (savedMessages) {
			messages = JSON.parse(savedMessages);
		}
	}

	onMount(() => {
		loadMessagesFromLocalStorage();
		scrollToBottom('smooth');
	});

	let dropdownOpen = false;

	function toggleDropdown() {
		dropdownOpen = !dropdownOpen;
	}

	function clearMessages() {
		messages = [];
		const localmessage = localStorage.getItem('chatMessages');
		if (localmessage) {
			localStorage.removeItem('chatMessages');
			successToast('Se vaciaron los mensajes correctamente');
		} else {
			errorToast('No hay mensajes para borrar');
		}
		dropdownOpen = false;
	}

	async function handleSignOut() {
		try {
			await signOut();
		} catch (error) {
			console.error('Error al cerrar sesión:', error);
		}
	}

	async function scrollToBottom(behavior?: ScrollBehavior): Promise<void> {
		await tick();
		messagesContainer?.scrollTo({
			top: messagesContainer.scrollHeight,
			behavior
		});
	}

	async function queryEmbeddings() {
		if (query === '') {
			warningToast('Ingrese una consulta');
			return;
		}
		messages = [...messages, { sender: 'user', content: query }];
		saveMessagesToLocalStorage();
		await scrollToBottom('smooth');
		loading = true;
		const response = await fetch(`${PUBLIC_PROCESS_FILES_SERVER}/query?text=${query}`, {
			method: 'GET',
			headers: {
				'Access-Control-Allow-Origin': '*'
			}
		});
		let result: QueryResult = await response.json();
		documents = result.documents[0];
		metadatas = result.metadatas[0];
		await queryLLM();
	}

	async function queryLLM() {
		const response = await fetch('/bot', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				'Access-Control-Allow-Origin': '*'
			},
			body: JSON.stringify({
				query: query,
				documents: documents,
				username: ''
			})
		});
		let result = await response.json();
		const parsedBlocks = parseText(result.answer);
		loading = false;

		let botResponse = '';
		parsedBlocks.forEach((block) => {
			messages = [
				...messages,
				{
					sender: 'bot',
					content: block.text,
					isCodeBlock: block.isCodeBlock,
					language: block.language
				}
			];
			saveMessagesToLocalStorage();
			if (!block.isCodeBlock) {
				botResponse += block.text + ' ';
			}
		});

		query = '';
		await scrollToBottom('smooth');
	}

</script>

<svelte:head>
    <title>Chat bot | DRTC</title>
</svelte:head>

<div class="h-dvh md:h-[100vh] lg:h-[100vh] bg-slate-50 dark:bg-slate-900 overflow-hidden">
	<Modal />
	<Toast position="t" />
	<!-- Topbar -->
	<div class="backdrop-blur-lg shadow p-4 flex items-center justify-between text-gray-600 dark:text-gray-100">
		<div class="md:flex-1 lg:flex-1"></div>
		<div class="flex-1 flex justify-center">
			<h4 class="font-bold">CHAT BOT TRACO</h4>
		</div>
		<div class="flex-1 flex justify-end relative">
			<ThemeToogle />
			<button
				on:click={toggleDropdown}
				class="text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors duration-200 dark:text-gray-200 dark:hover:bg-slate-700"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
					/>
				</svg>
			</button>
			{#if dropdownOpen}
				<div
					use:clickOutside
					on:click_outside={() => (dropdownOpen = false)}
					class="absolute right-2 mt-0 w-48 bg-slate-50 rounded-md overflow-hidden shadow-lg z-50 dark:bg-slate-800"
				>
					<button
						on:click={clearMessages}
						class="block px-4 py-2 text-sm text-slate-600 dark:text-gray-200 dark:hover:bg-slate-700 hover:bg-slate-200 w-full text-left"
					>
						Vaciar mensajes
					</button>
					{#if $session}
						<a
							href="/upload"
							class="block px-4 py-2 text-sm text-slate-600 dark:text-gray-200 dark:hover:bg-slate-700 hover:bg-slate-200 w-full text-left"
						>
							Ir al panel
						</a>
						<button
							on:click={handleSignOut}
							class="block px-4 py-2 text-sm text-slate-600 dark:text-gray-200 dark:hover:bg-slate-700 hover:bg-slate-200 w-full text-left"
						>
							Cerrar sesión
						</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>
	<!-- Topbar -->

	<!-- messages container -->
	<div
		id="messagesContainer"
		class="flex-1 overflow-y-scroll h-[100vh] lg:h-full md:h-full space-y-4 p-4 lg:pb-[160px] md:pb-[160px] pb-[240px] -z-10"
		bind:this={messagesContainer}
	>
		{#each messages as message}
			<div
				class="flex w-full text-slate-700 dark:text-slate-200 {message.sender === 'user' ? 'justify-end' : 'justify-start'}"
			>
				<div
					class="max-w-[100%] md:max-w-[90%] lg:max-w-[60%] z-0 {message.sender === 'user'
						? 'bg-transparent'
						: 'bg-slate-200 dark:bg-slate-800'} p-3 rounded-lg relative group overflow-hidden"
				>
					{#if message.isCodeBlock}
						<CodeBlock code={message.content} language={message.language} />
					{:else}
						<MarkdownRenderer content={message.content} />
						<div>
							{#if documents.length > 0 && message.sender === 'bot'}
								<p class="mt-2 underline text-blue-400 cursor-pointer dark:text-blue-300">
									Esta respuesta es parte del documento: {metadatas[0].file_name}
								</p>
							{/if}
						</div>
						{#if message.sender === 'bot' && !message.isCodeBlock}
							<div class="flex justify-start mt-2 gap-2">
								<button
									on:click={() => copyToClipboard(markdownToPlainText(message.content))}
									class="text-slate-600 py-1 px-3 flex justify-center items-center rounded-full bg-slate-100 hover:bg-slate-300
									dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
									title="Copiar mensaje"
								>
									<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 mr-1"
										><title /><g data-name="1" id="_1"
											><path
												d="M308.51,450H80.59a15,15,0,0,1-15-15V143.93a15,15,0,0,1,15-15H308.51a15,15,0,0,1,15,15V435A15,15,0,0,1,308.51,450ZM95.59,420H293.51V158.93H95.59Z"
												fill="currentColor"
											/><path
												d="M389.44,369.07H308.51a15,15,0,0,1,0-30h65.93V78H176.52v65.92a15,15,0,0,1-30,0V63a15,15,0,0,1,15-15H389.44a15,15,0,0,1,15,15V354.07A15,15,0,0,1,389.44,369.07Z"
												fill="currentColor"
											/></g
										></svg
									>
								</button>
								<button
									on:click={() => whatsappModal(markdownToPlainText(message.content))}
									class="text-slate-600 py-1 px-3 flex justify-center items-center rounded-full bg-slate-100 hover:bg-slate-300	dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
									title="Copiar mensaje"
								>
									<svg
										class="w-5 h-5 mr-1"
										style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"
										version="1.1"
										viewBox="0 0 512 512"
										xml:space="preserve"
										><path
											fill="currentColor"
											d="M373.295,307.064c-6.37,-3.188 -37.687,-18.596 -43.526,-20.724c-5.838,-2.126 -10.084,-3.187 -14.331,3.188c-4.246,6.376 -16.454,20.725 -20.17,24.976c-3.715,4.251 -7.431,4.785 -13.8,1.594c-6.37,-3.187 -26.895,-9.913 -51.225,-31.616c-18.935,-16.89 -31.72,-37.749 -35.435,-44.126c-3.716,-6.377 -0.397,-9.824 2.792,-13c2.867,-2.854 6.371,-7.44 9.555,-11.16c3.186,-3.718 4.247,-6.377 6.37,-10.626c2.123,-4.252 1.062,-7.971 -0.532,-11.159c-1.591,-3.188 -14.33,-34.542 -19.638,-47.298c-5.171,-12.419 -10.422,-10.737 -14.332,-10.934c-3.711,-0.184 -7.963,-0.223 -12.208,-0.223c-4.246,0 -11.148,1.594 -16.987,7.969c-5.838,6.377 -22.293,21.789 -22.293,53.14c0,31.355 22.824,61.642 26.009,65.894c3.185,4.252 44.916,68.59 108.816,96.181c15.196,6.564 27.062,10.483 36.312,13.418c15.259,4.849 29.145,4.165 40.121,2.524c12.238,-1.827 37.686,-15.408 42.995,-30.286c5.307,-14.882 5.307,-27.635 3.715,-30.292c-1.592,-2.657 -5.838,-4.251 -12.208,-7.44m-116.224,158.693l-0.086,0c-38.022,-0.015 -75.313,-10.23 -107.845,-29.535l-7.738,-4.592l-80.194,21.037l21.405,-78.19l-5.037,-8.017c-21.211,-33.735 -32.414,-72.726 -32.397,-112.763c0.047,-116.825 95.1,-211.87 211.976,-211.87c56.595,0.019 109.795,22.088 149.801,62.139c40.005,40.05 62.023,93.286 62.001,149.902c-0.048,116.834 -95.1,211.889 -211.886,211.889m180.332,-392.224c-48.131,-48.186 -112.138,-74.735 -180.335,-74.763c-140.514,0 -254.875,114.354 -254.932,254.911c-0.018,44.932 11.72,88.786 34.03,127.448l-36.166,132.102l135.141,-35.45c37.236,20.31 79.159,31.015 121.826,31.029l0.105,0c140.499,0 254.87,-114.366 254.928,-254.925c0.026,-68.117 -26.467,-132.166 -74.597,-180.352"
											id="WhatsApp-Logo"
										/></svg
									>
								</button>
								<ShareButton content={markdownToPlainText(message.content)} />
								<button
									on:click={() => toggleSpeaking(markdownToPlainText(message.content))}
									class=" text-slate-600 py-1 px-3 rounded-full bg-slate-100 hover:bg-slate-300 flex justify-center items-center
									dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
									title="Escuchar mensaje"
								>
									{#if isSpeaking}
										<svg
											viewBox="0 0 512 512"
											xmlns="http://www.w3.org/2000/svg"
											class="w-6 h-6 mr-1"
											><title /><g data-name="1" id="_1"
												><path
													fill="currentColor"
													d="M179,388H103.35a49.27,49.27,0,0,1-49.22-49.21V237.21A49.27,49.27,0,0,1,103.35,188H179a15,15,0,0,1,15,15V373A15,15,0,0,1,179,388ZM103.35,218a19.24,19.24,0,0,0-19.22,19.21V338.79A19.24,19.24,0,0,0,103.35,358H164V218Z"
												/><path
													fill="currentColor"
													d="M295,452.92H245.62A81.71,81.71,0,0,1,164,371.3V204.7a81.71,81.71,0,0,1,81.62-81.62H295a15,15,0,0,1,15,15V437.92A15,15,0,0,1,295,452.92ZM245.62,153.08A51.68,51.68,0,0,0,194,204.7V371.3a51.68,51.68,0,0,0,51.62,51.62H280V153.08Z"
												/><path
													fill="currentColor"
													d="M358.57,351.57A15,15,0,0,1,348,326,53.73,53.73,0,0,0,348,250a15,15,0,0,1,21.22-21.22,83.79,83.79,0,0,1,0,118.36A15,15,0,0,1,358.57,351.57Z"
												/><path
													fill="currentColor"
													d="M404.5,397.5a15,15,0,0,1-10.61-25.61,118.77,118.77,0,0,0,0-167.78,15,15,0,0,1,21.22-21.22c57.95,58,57.95,152.26,0,210.22A15,15,0,0,1,404.5,397.5Z"
												/></g
											></svg
										>
									{:else}
										<svg
											viewBox="0 0 512 512"
											xmlns="http://www.w3.org/2000/svg"
											class="w-6 h-6 mr-1"
											><title /><g data-name="1" id="_1"
												><path
													fill="currentColor"
													d="M179,352H103.35a49.27,49.27,0,0,1-49.22-49.21V201.21A49.27,49.27,0,0,1,103.35,152H179a15,15,0,0,1,15,15V337A15,15,0,0,1,179,352ZM103.35,182a19.24,19.24,0,0,0-19.22,19.21V302.79A19.24,19.24,0,0,0,103.35,322H164V182Z"
												/><path
													fill="currentColor"
													d="M295,416.92H245.62A81.71,81.71,0,0,1,164,335.3V168.7a81.71,81.71,0,0,1,81.62-81.62H295a15,15,0,0,1,15,15V401.92A15,15,0,0,1,295,416.92ZM245.62,117.08A51.68,51.68,0,0,0,194,168.7V335.3a51.68,51.68,0,0,0,51.62,51.62H280V117.08Z"
												/><path
													fill="currentColor"
													d="M356.35,309.39a15,15,0,0,1-10.6-25.61L430.53,199a15,15,0,0,1,21.21,21.22L367,305A15,15,0,0,1,356.35,309.39Z"
												/><path
													fill="currentColor"
													d="M441.13,309.39a14.93,14.93,0,0,1-10.6-4.39l-84.78-84.78A15,15,0,0,1,367,199l84.78,84.78a15,15,0,0,1-10.61,25.61Z"
												/></g
											></svg
										>
									{/if}
								</button>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		{/each}
		{#if loading}
			<div class="p-8 flex justify-start items-start text-start text-slate-600 gap-2 dark:text-slate-200">
				<ProgressRadial width="w-5" value={undefined} track="stroke-slate-400" />
				Consultando...
			</div>
		{/if}
		{#if !loading}
			<!-- FAQ Section -->
			<div class="p-4 bg-transparent flex justify-center z-10">
				<div class="grid grid-cols-2 gap-4 w-full max-w-2xl">
					{#each faqQuestions as question}
						<button
							on:click={() => sendFaqQuestion(question)}
							class="bg-slate-200 hover:bg-slate-300 text-slate-700 
							dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 py-2 px-4 rounded-lg text-sm text-center transition-colors duration-200"
						>
							{question}
						</button>
					{/each}
				</div>
			</div>
			<!-- FAQ Section -->
		{/if}
	</div>
	<!-- messages container -->

	<!-- input search -->
	<div class="p-4 bg-slate-50 dark:bg-slate-900 absolute bottom-0 left-0 right-0 w-full">
		<div class="max-w-4xl mx-auto">
			<div class="flex items-center bg-slate-200 rounded-lg gap-2 py-2 px-4 dark:bg-slate-600">
				<textarea
					rows="1"
					disabled={loading}
					bind:value={query}
					on:keydown={handleKeyDown}
					placeholder="Escribe tu consulta..."
					class="flex-1 px-3 py-2 bg-transparent focus:outline-none text-slate-600 rounded-md placeholder:text-slate-400 dark:placeholder:text-slate-100 w-full
					dark:text-white dark:bg-slate-800 bg-white"
				/>
				<button
					type="button"
					on:click={toggleRecording}
					class="bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-300 p-2 rounded-md flex items-center dark:text-slate-200 dark:hover:bg-slate-700"
				>
					{#if isRecording}
						<span class="animate-pulse bg-red-500 rounded-full h-2 w-2 mr-1" />
						<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6"
							><rect fill="none" height="256" width="256" /><rect
								fill="none"
								height="144"
								rx="40"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="16"
								width="80"
								x="88"
								y="24"
							/><line
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="16"
								x1="128"
								x2="128"
								y1="200"
								y2="232"
							/><path
								d="M199.6,136a72.1,72.1,0,0,1-143.2,0"
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="16"
							/></svg
						>
					{:else}
						<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6"
							><rect fill="none" height="256" width="256" /><path
								d="M176.4,181.3A72,72,0,0,1,56.4,136"
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="16"
							/><path
								d="M154.9,157.6A39.6,39.6,0,0,1,128,168h0a40,40,0,0,1-40-40V84"
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="16"
							/><line
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="16"
								x1="128"
								x2="128"
								y1="200"
								y2="232"
							/><line
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="16"
								x1="48"
								x2="208"
								y1="40"
								y2="216"
							/><path
								d="M94,43a39.8,39.8,0,0,1,34-19h0a40,40,0,0,1,40,40v60.4"
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="16"
							/><path
								d="M199.6,136a72.4,72.4,0,0,1-4.5,18.2"
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="16"
							/></svg
						>
					{/if}
				</button>
				<button
					type="button"
					on:click={queryEmbeddings}
					class="bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-300 p-2 rounded-md flex items-center dark:text-slate-200 dark:hover:bg-slate-700"
				>
					Enviar
				</button>
			</div>
		</div>
	</div>
	<!-- input search -->
</div>
