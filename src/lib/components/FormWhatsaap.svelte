<script lang="ts">
import { getModalStore, type CssClasses, type ToastSettings } from '@skeletonlabs/skeleton';
import { Toast, initializeStores, getToastStore} from '@skeletonlabs/skeleton';

export let parent : any;
export let modal = false;
export let classes: CssClasses;
export let message: string = '';
export let number_phone: string = '';

initializeStores();
const toastStore = getToastStore();
const modalStore = getModalStore();

const warningToast = (msg: string) =>{
	const toast: ToastSettings = {
		message: msg,
		background: 'variant-filled-warning',
	} 
	return toastStore.trigger(toast)
};
	
const successToast = (msg: string)  =>{
	const toast: ToastSettings = {
		message: msg,
		background: 'variant-filled-success',
	} 
	return toastStore.trigger(toast) 
};

const errorToast = (msg: string) =>{
	const toast: ToastSettings = {
		message: msg,
		background: 'variant-filled-error',
	} 
	return toastStore.trigger(toast)
};

const sendMessage = async() => {	
	if(number_phone === '') {
		warningToast('Ingrese un número de whatsapp');
		return;
	}
	if(number_phone.length < 9 || number_phone.length > 9) {
		warningToast('Ingrese un numero válido, solo debe tener 9 dígitos');
		return;
	}
	await fetch(`https://botvri-production.up.railway.app/v1/message`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		body: JSON.stringify(
			{
				number: '51' + number_phone, 
				message: message,
			}
		)
	}).then((res) => {
		if(res.status !== 200) {
			errorToast('Número de whatsapp incorrecto o inválido');
		}else{
			successToast(`Mensage enviado al número ${number_phone} correctamente`);
		}
	}).finally(() => {
		closeModal();
	})
}

const closeModal = () => {
	parent.onClose();
	modalStore.close();
};


</script>

<div class={classes}>
	<Toast position="t"/>
	<header class="card-header">
	{#if modal}
		<button on:click={closeModal} class="float-end border-none rounded-[50%] py-1 px-3 bg-slate-700 text-white hover:bg-slate-600 focus:outline-none focus:ring-offset-0">X</button>
		<p class="text-center uppercase font-semibold">
			Enviar respuesta a whatsapp
		</p>
	{/if}
	</header>
	<section class="p-4">
		<div class="p-3 space-y-4">
			<label class="label">
				<span>Número de whatsapp</span>
				<input class="input" type="text" placeholder="Ingresar tu número aquí..." required bind:value={number_phone} maxlength="9"/>
			</label>
			<label class="label">
				<span>Respuesta a enviar</span>
				<textarea class="textarea overflow-y-auto" rows="6" bind:value={message} disabled/>
			</label>
		</div>
	</section>
	<footer class="card-footer">
		<button type="button" class="btn variant-filled-primary float-end text-white w-full" on:click={sendMessage}>Enviar</button>
	</footer>
</div>