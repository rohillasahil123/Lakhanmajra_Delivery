import { useState, useCallback, useRef } from 'react';
import { UseFormReturn, FieldValues } from 'react-hook-form';

interface UseFormModalOptions<T extends FieldValues> {
  onSubmit: (form: T, editingId: string | null) => Promise<void>;
}

interface UseFormModalReturn<T extends FieldValues> {
  // Modal state
  modalOpen: boolean;
  openCreateModal: () => void;
  openEditModal: (item: T, id: string) => void;
  closeModal: () => void;

  // Form state
  editingId: string | null;
  editingItem: T | null;
  isCreating: boolean;
  isEditing: boolean;

  // Submission state
  saving: boolean;
  submitError: string | null;
  setSubmitError: (error: string | null) => void;

  // react-hook-form integration
  handleFormSubmit: (form: UseFormReturn<T, unknown, T>) => (data: T) => Promise<void>;
}

/**
 * Reusable hook for managing form modal state with react-hook-form integration
 * Handles creating, editing, saving, and closing forms
 * Reduces duplication across the application
 *
 * @param options Configuration object with initial form and submit handler
 * @returns Form state and handlers optimized for react-hook-form
 *
 * @example
 * ```tsx
 * const modal = useFormModal({
 *   initialForm: { name: '', email: '' },
 *   onSubmit: async (data) => await api.post('/users', data),
 * });
 *
 * return (
 *   <>
 *     <UserForm
 *       open={modal.modalOpen}
 *       onClose={modal.closeModal}
 *       onSubmit={modal.handleFormSubmit(useFormReturn)}
 *     />
 *   </>
 * );
 * ```
 */
export function useFormModal<T extends FieldValues>({
  onSubmit,
}: UseFormModalOptions<T>): UseFormModalReturn<T> {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Track if we're in edit mode for form initialization
  const isEditingRef = useRef(false);

  /**
   * Open modal for creating new item
   */
  const openCreateModal = useCallback(() => {
    setModalOpen(true);
    setEditingId(null);
    setEditingItem(null);
    setSubmitError(null);
    isEditingRef.current = false;
  }, []);

  /**
   * Open modal for editing existing item
   */
  const openEditModal = useCallback((item: T, id: string) => {
    setModalOpen(true);
    setEditingId(id);
    setEditingItem(item);
    setSubmitError(null);
    isEditingRef.current = true;
  }, []);

  /**
   * Close modal and reset state
   */
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
    setEditingItem(null);
    setSubmitError(null);
    isEditingRef.current = false;
  }, []);

  /**
   * Create submit handler for react-hook-form
   * Returns a function that can be passed to form's onSubmit
   */
  const handleFormSubmit = useCallback(
    () => {
      return async (data: T) => {
        setSaving(true);
        setSubmitError(null);

        try {
          await onSubmit(data, editingId);
          closeModal();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'An error occurred during submission';
          setSubmitError(errorMessage);
          // Don't close modal on error, let user correct the form
        } finally {
          setSaving(false);
        }
      };
    },
    [editingId, onSubmit, closeModal]
  );

  return {
    // Modal state
    modalOpen,
    openCreateModal,
    openEditModal,
    closeModal,

    // Form state
    editingId,
    editingItem,
    isCreating: editingId === null,
    isEditing: editingId !== null,

    // Submission state
    saving,
    submitError,
    setSubmitError,

    // react-hook-form integration
    handleFormSubmit,
  };
}
