"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isDanger = true,
}: ConfirmationModalProps) {
  const t = useTranslations("Common");

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-[#333333]/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden pointer-events-auto border border-gray-100 relative"
            >
              <div className="p-8">
                {/* Header with Icon */}
                <div className="flex flex-col items-center text-center mb-6">
                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 bg-[#D2691E]/10 text-[#D2691E]`}>
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-[#333333] mb-2 leading-tight">
                    {title}
                  </h3>
                  <p className="text-sm font-medium text-[#333333]/70 leading-relaxed">
                    {message}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-full text-sm font-bold text-[#333333]/60 hover:bg-[#333333]/5 transition-colors"
                  >
                    {cancelText || t('cancel')}
                  </button>
                  <button
                    onClick={() => {
                      onConfirm();
                      onClose();
                    }}
                    className={`flex-1 sm:flex-none px-8 py-3 rounded-full text-sm font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#D2691E]/20 bg-[#D2691E] text-white`}
                  >
                    {confirmText || t('confirm')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
