import { useEffect } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

const ConfirmDialog = ({
	open,
	title = "ยืนยันการลบ",
	message = "คุณแน่ใจหรือไม่ว่าต้องการดำเนินการนี้?",
	confirmText = "ลบ",
	cancelText = "ยกเลิก",
	onConfirm,
	onCancel,
	isLoading = false,
}) => {
	const { isDarkMode } = useTheme();

	useEffect(() => {
		const onKey = (e) => {
			if (e.key === "Escape") {
				if (!isLoading) onCancel?.();
			}
		};
		if (open) {
			document.addEventListener("keydown", onKey);
			return () => document.removeEventListener("keydown", onKey);
		}
	}, [open, isLoading, onCancel]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/40 backdrop-blur-sm"
				onClick={() => !isLoading && onCancel?.()}
			/>

			{/* Dialog */}
			<div
				className={`relative w-full max-w-md mx-4 rounded-2xl shadow-2xl border overflow-hidden transition-colors duration-300 ${
					isDarkMode ? "bg-gray-800 border-gray-700/60" : "bg-white border-gray-200/60"
				}`}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div
					className={`px-5 py-4 border-b flex items-center justify-between ${
						isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
					}`}
				>
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center">
							<AlertTriangle className="w-4 h-4" />
						</div>
						<h3 className={`text-sm font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>{title}</h3>
					</div>
					<button
						title="ปิด"
						disabled={isLoading}
						onClick={() => onCancel?.()}
						className={`p-1 rounded-md ${
							isDarkMode ? "text-gray-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-100"
						} disabled:opacity-50`}
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Body */}
				<div className="px-5 py-4">
					<p className={`text-sm leading-relaxed ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{message}</p>
					<p className={`mt-2 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
						การกระทำนี้ไม่สามารถย้อนกลับได้
					</p>
				</div>

				{/* Footer */}
				<div className={`px-5 py-3 border-t flex items-center justify-end gap-2 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
					<button
						onClick={() => onCancel?.()}
						disabled={isLoading}
						className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
							isDarkMode ? "text-gray-200 bg-gray-700 hover:bg-gray-600" : "text-gray-700 bg-gray-100 hover:bg-gray-200"
						} disabled:opacity-50`}
					>
						{cancelText}
					</button>
					<button
						onClick={() => onConfirm?.()}
						disabled={isLoading}
						className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
					>
						{isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ConfirmDialog;


