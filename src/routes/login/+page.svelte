<script lang="ts">
	import { signInWithEmail, signInWithGoogle } from '$lib/auth';
	import { goto } from '$app/navigation';
	import { ProgressRadial } from '@skeletonlabs/skeleton';

	let email = '';
	let password = '';
	let errorMessage: string | null = null;
	let loading = false;

	async function handleEmailLogin() {
		loading = true;
		try {
			await signInWithEmail(email, password);
			goto('/upload');
		} catch (error: any) {
			console.error('Error de login:', error);
			errorMessage = 'Error al iniciar sesión: ' + error.message;
		} finally {
			loading = true;
		}
	}

	async function handleGoogleLogin() {
		try {
			await signInWithGoogle();
			// La redirección se manejará automáticamente por Supabase
		} catch (error: any) {
			console.error('Error de login con Google:', error);
			errorMessage = 'Error al iniciar sesión con Google: ' + error.message;
		}
	}
</script>

<svelte:head>
	<title>Iniciar sesión | MDA</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-900 flex-col">
	<div class="p-6 items-center content-center flex justify-center flex-col">
		<img src="/favicon.png" alt="logi_amarilis" class="w-36 h-36 rounded-full col-1"/>
		<h2 class="text-white text-xl font-semibold text-center mt-2">Bienvenido a AMABOT ADMIN</h2>
	</div>

	<div class="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
		{#if errorMessage}
			<div class="text-red-500 text-sm mb-4">{errorMessage}</div>
		{/if}

		<!-- Formulario de email y contraseña -->
		<form on:submit|preventDefault={handleEmailLogin} class="space-y-6">
			<div>
				<label for="email" class="block text-sm font-medium text-gray-300">Correo Electrónico</label
				>
				<input
					id="email"
					type="email"
					bind:value={email}
					required
					class="mt-1 block w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
				/>
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-gray-300">Contraseña</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					required
					class="mt-1 block w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-300 flex justify-center gap-2 items-center"
			>
				{#if loading}
					<ProgressRadial value={undefined} width="w-4 mr-2" track="stroke-white" />
				{/if}
				Iniciar sesión
			</button>
		</form>

		<!-- Separador -->
		<div class="mt-6 relative">
			<div class="absolute inset-0 flex items-center">
				<div class="w-full border-t border-gray-600"></div>
			</div>
			<div class="relative flex justify-center text-sm">
				<span class="bg-gray-800 px-2 text-gray-300">O</span>
			</div>
		</div>

		<!-- Botón de Google -->
		<button
			disabled={loading}
			on:click={handleGoogleLogin}
			class="mt-6 w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition duration-300 flex items-center justify-center"
		>
			<img
				src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png"
				alt="Google"
				class="h-5 w-5 mr-2"
			/>
			Continuar con Google
		</button>
	</div>
</div>
