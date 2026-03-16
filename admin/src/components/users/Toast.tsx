import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}

const Toast = ({ message, type = 'success', onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const baseStyle = 'fixed top-5 right-5 px-4 py-3 rounded-lg shadow-lg text-white z-50';

  const typeStyle = type === 'success' ? 'bg-green-600' : 'bg-red-600';

  return <div className={`${baseStyle} ${typeStyle}`}>{message}</div>;
};

export default Toast;
