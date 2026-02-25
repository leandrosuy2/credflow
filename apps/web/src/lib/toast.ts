import toast from 'react-hot-toast';

export const toasts = {
  success: (message: string) => toast.success(message, { duration: 4000, style: { background: '#ecfdf5', color: '#065f46', borderRadius: '12px' } }),
  error: (message: string) => toast.error(message, { duration: 5000, style: { background: '#fef2f2', color: '#991b1b', borderRadius: '12px' } }),
  warning: (message: string) => toast(message, { icon: '⚠️', duration: 4000, style: { background: '#fffbeb', color: '#92400e', borderRadius: '12px' } }),
  info: (message: string) => toast(message, { icon: 'ℹ️', duration: 4000, style: { background: '#eff6ff', color: '#1e40af', borderRadius: '12px' } }),
};
