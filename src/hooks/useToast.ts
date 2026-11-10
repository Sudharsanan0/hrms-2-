import { useContext } from 'react';
import { ToastContext } from '../contexts/toast-context';

export const useToast = () => useContext(ToastContext);
