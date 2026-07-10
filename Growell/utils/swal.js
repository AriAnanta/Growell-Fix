import Swal from 'sweetalert2';

export const growellSwal = Swal.mixin({
  customClass: {
    popup: 'rounded-2xl shadow-xl border border-gray-100',
    title: 'text-lg font-bold text-gray-900',
    htmlContainer: 'text-sm text-gray-600',
    confirmButton: 'px-4 py-2 bg-gradient-to-r from-teal-500 to-sky-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/20 transition-all ml-2',
    cancelButton: 'px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all mr-2',
  },
  buttonsStyling: false,
});

export const showAlert = (title, text, icon = 'info') => {
  return growellSwal.fire({
    title,
    text,
    icon,
  });
};

export const showConfirm = (title, text, confirmText = 'Ya', cancelText = 'Batal') => {
  return growellSwal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
  });
};

export const showSuccess = (title, text) => {
  return growellSwal.fire({
    title,
    text,
    icon: 'success',
  });
};

export const showError = (title, text) => {
  return growellSwal.fire({
    title,
    text,
    icon: 'error',
  });
};
