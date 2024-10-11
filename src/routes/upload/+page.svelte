<script lang="ts">
	import { FileDropzone, ProgressRadial } from '@skeletonlabs/skeleton';
	import { PUBLIC_PROCESS_FILES_SERVER } from '$env/static/public';
	import { Toast, initializeStores, getToastStore } from '@skeletonlabs/skeleton';
	import type { ToastSettings } from '@skeletonlabs/skeleton';
	import { onMount } from 'svelte';
	import { signOut } from '$lib/auth';
	import { clickOutside } from '$lib/clickOutsite';
	import { session } from '$lib/sessionStore';
	import ThemeToogle from '$lib/components/ThemeToogle.svelte';

	initializeStores();
	const toastStore = getToastStore();

	let files: FileList;
	let processing = false;
	let deleting = false;
	let dropdownOpen = false;

	let filesUploaded: { name: string; size: number; type: string }[] = [];

	onMount(() => {
		getFiles();
	});

	function toggleDropdown() {
		dropdownOpen = !dropdownOpen;
	}

	async function handleSignOut() {
		try {
			await signOut();
		} catch (error) {
			console.error('Error al cerrar sesión:', error);
		}
	}

	const getFiles = () => {
		const storedFiles = localStorage.getItem('uploadedFiles');
		if (storedFiles) {
			filesUploaded = JSON.parse(storedFiles);
		} else {
			filesUploaded = [];
		}
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

	function onChangeHandler(e: Event): void {
		files = files;
	}

	async function startProcessing(event: Event) {
		processing = true;
		const formEl = event.target as HTMLFormElement;
		const data = new FormData(formEl);

		// Crear un arreglo para almacenar los nombres o datos de los archivos
		let uploadedFiles: { name: string; size: number; type: string }[] = [];

		// Obtener los archivos del FormData
		for (let [key, value] of data.entries()) {
			if (value instanceof File) {
				uploadedFiles.push({
					name: value.name,
					size: value.size,
					type: value.type
				});
			}
		}

		// Guardar en el localStorage
		uploadedFiles.push(...JSON.parse(localStorage.getItem('uploadedFiles') || '[]'));

		localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));

		// Enviar los archivos al servidor
		const response = await fetch(`${PUBLIC_PROCESS_FILES_SERVER}/process`, {
			method: 'POST',
			headers: {
				'Access-Control-Allow-Origin': '*'
			},
			body: data
		});

		let result = await response.json();

		if (result && result.success) {
			successToast('Información procesada correctamente');
			getFiles();
		} else {
			errorToast('Hubo un error al procesar la información');
		}
		processing = false;
	}

	async function refreshDb() {
		deleting = true;
		const response = await fetch(`${PUBLIC_PROCESS_FILES_SERVER}/refresh`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				'Access-Control-Allow-Origin': '*'
			}
		});
		let result = await response.json();
		if (result && result.success) {
			localStorage.removeItem('uploadedFiles');
			getFiles();
			successToast('Se borro la información correctamente');
		} else {
			errorToast('Hubo un error, o no se encontro información para borrar');
		}
		deleting = false;
	}
</script>

<svelte:head>
	<title>Cargar archivos</title>
</svelte:head>

<div class="flex flex-col md:h-screen h-dvh bg-slate-50 dark:bg-slate-900">
	<Toast position="b" />

	<div class="flex-1 flex flex-col">
		<!-- Topbar -->
		<div
			class="backdrop-blur-lg shadow p-4 flex items-center justify-between text-gray-600 dark:text-gray-100"
		>
			<div class="md:flex-1 lg:flex-1"></div>
			<div class="flex-1 flex justify-center">
				<h4 class="font-bold">CARGAR ARCHIVOS</h4>
			</div>
			<div class="flex-1 flex justify-end relative gap-2">
				<ThemeToogle />

				<button
					on:click={toggleDropdown}
					class="align-middle content-center items-center flex gap-2 text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors duration-200 dark:hover:bg-slate-700 bg-white shadow-lg dark:bg-slate-600 dark:text-slate-100"
				>
					Opciones
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
						class="absolute right-0 mt-0 w-48 bg-slate-50 rounded-md overflow-hidden shadow-xl z-50 dark:bg-slate-800"
					>
						<a
							href="/"
							class="block px-4 py-2 text-sm text-slate-600 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 w-full text-left bg-slate-50 dark:bg-slate-800"
						>
							Conversar con bot
						</a>
						<button
							on:click={refreshDb}
							class="block px-4 py-2 text-sm text-slate-600 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 w-full text-left bg-slate-50 dark:bg-slate-800"
						>
							{#if deleting}
								<ProgressRadial value={undefined} width="w-4 mr-2" track="stroke-white" />
							{/if}
							Borrar información
						</button>
						{#if $session}
							<button
								on:click={handleSignOut}
								class="block px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 w-full text-left"
							>
								Cerrar sesión
							</button>
						{/if}
					</div>
				{/if}
			</div>
		</div>
		<!-- Topbar -->

		<!-- Buttons container -->
		<div class=" mt-2 space-y-4 max-w-4xl w-full mx-auto p-4">
			<div class="flex justify-end gap-3"></div>
		</div>
		<!-- Buttons container -->

		<!-- File upload container -->
		<div class="flex-1 overflow-y-auto p-4 space-y-4">
			<form
				method="POST"
				on:submit|preventDefault={startProcessing}
				class="w-full max-w-4xl mx-auto"
			>
				<div
					class="bg-slate-70 shadow-lg border-t dark:border-none p-6 rounded-lg dark:bg-slate-800"
				>
					<FileDropzone
						name="documents"
						multiple
						bind:files
						on:change={onChangeHandler}
						class="!bg-slate-300 dark:!bg-slate-700 border-dashed border-2 !border-slate-500 dark:!border-slate-200 p-8 rounded-lg text-center !hover:bg-slate-400 dark:!hover:bg-slate-600"
					>
						<svelte:fragment slot="lead">
							<svg
								height="35px"
								class="text-slate-600 mx-auto mb-4 dark:text-slate-200"
								viewBox="0 0 1792 1792"
								fill="currentColor"
								xmlns="http://www.w3.org/2000/svg"
								><path
									d="M1344 1472q0-26-19-45t-45-19-45 19-19 45 19 45 45 19 45-19 19-45zm256 0q0-26-19-45t-45-19-45 19-19 45 19 45 45 19 45-19 19-45zm128-224v320q0 40-28 68t-68 28h-1472q-40 0-68-28t-28-68v-320q0-40 28-68t68-28h427q21 56 70.5 92t110.5 36h256q61 0 110.5-36t70.5-92h427q40 0 68 28t28 68zm-325-648q-17 40-59 40h-256v448q0 26-19 45t-45 19h-256q-26 0-45-19t-19-45v-448h-256q-42 0-59-40-17-39 14-69l448-448q18-19 45-19t45 19l448 448q31 30 14 69z"
								/></svg
							>
						</svelte:fragment>
						<svelte:fragment slot="message">
							<span class="text-slate-600 dark:text-slate-100 font-medium"
								>Subir archivos o arrastrarlos</span
							>
						</svelte:fragment>
						<svelte:fragment slot="meta">
							<span class="text-slate-600 dark:text-slate-100 text-sm">TXT Y MD permitidos</span>
						</svelte:fragment>
					</FileDropzone>

					{#if files}
						<div
							class="mt-4 bg-slate-200 p-4 rounded-lg h-auto max-h-48 overflow-y-auto dark:bg-slate-700"
						>
							<h3 class="text-slate-600 mb-2 dark:text-slate-100">Archivos seleccionados:</h3>
							<ol class="list w-full space-y-2">
								{#each Array.from(files) as document, i}
									<li class="flex items-center text-slate-600 dark:text-slate-100">
										<span class="badge-icon p-2 bg-blue-500 text-white rounded-full mr-2"
											>{i + 1}</span
										>
										<span>{document.name}</span>
									</li>
								{/each}
							</ol>
						</div>
						<button
							class="w-full btn bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg mt-4"
							disabled={processing}
						>
							{#if processing}
								<ProgressRadial value={undefined} width="w-4 mr-2" track="stroke-white" />
								Procesando
							{:else}
								Procesar archivos
							{/if}
						</button>
					{/if}

					<!-- Responsive Container (recommended) -->
					{#if filesUploaded.length > 0}
						<div class="relative overflow-x-auto shadow-md sm:rounded-lg mt-10">
							<!-- Native Table Element -->

							<table
								class="w-full text-sm text-left rtl:text-right text-slate-500 dark:text-slate-400"
							>
								<thead
									class="text-sm text-slate-500 uppercase bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-none border-t"
								>
									<tr>
										<th scope="col" class="px-6 py-3">#</th>
										<th scope="col" class="px-6 py-3">Nombre de archivo</th>
										<th scope="col" class="px-6 py-3">Extensión</th>
										<th scope="col" class="px-6 py-3">Peso (KB)</th>
									</tr>
								</thead>
								<tbody>
									{#each filesUploaded as row, i}
										<tr
											class="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600"
										>
											<th scope="row" class="px-6 py-4"> {i + 1}</th>
											<td
												class="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white"
												>{row.name}</td
											>
											<td class="px-6 py-4">{row.type}</td>
											<td class="px-6 py-4">{(row.size / 1024).toFixed(2)} KB</td>
										</tr>
									{/each}
								</tbody>
								<tfoot
									class="text-sm text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400"
								>
									<tr>
										<th
											colspan="3"
											scope="row"
											class="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white"
											>Total Archivos</th
										>
										<td
											class="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white"
											>{filesUploaded.length}</td
										>
									</tr>
								</tfoot>
							</table>
						</div>
					{/if}
				</div>
			</form>
		</div>
		<!-- File upload container -->
	</div>
</div>
