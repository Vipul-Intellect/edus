import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import ApiService from "../../services/api";

export default function BulkImportModal({ isOpen, onClose, title, endpoint, templateInfo, onSuccess }) {
    const [file, setFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const name = selectedFile.name.toLowerCase();
            const validExts = ['.csv', '.xlsx', '.xls'];
            const isValid = validExts.some(ext => name.endsWith(ext));
            if (!isValid) {
                setError("Please upload a valid CSV or Excel file (.csv, .xlsx, .xls).");
                setFile(null);
                return;
            }
            setFile(selectedFile);
            setError(null);
            setResult(null);
        }
    };

    const handleSubmit = async () => {
        if (!file) return;

        try {
            setIsSubmitting(true);
            setError(null);
            
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await ApiService.bulkImport(endpoint, formData);
            setResult(response);
            if (onSuccess) onSuccess(response);
        } catch (err) {
            console.error("Bulk import failed:", err);
            setError(err.message || "Failed to import data. Please check your CSV format.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setError(null);
        setResult(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-blue-600" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>
                        Upload a CSV or Excel file to bulk import data into the system.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Template Info */}
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <h4 className="text-sm font-semibold text-blue-800 mb-1 flex items-center gap-1.5">
                            <FileText className="w-4 h-4" />
                            Required CSV Columns:
                        </h4>
                        <p className="text-xs text-blue-700 leading-relaxed font-mono">
                            {templateInfo}
                        </p>
                    </div>

                    {/* Dropzone */}
                    <div 
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                            ${file ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            className="hidden" 
                            ref={fileInputRef}
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileChange}
                        />
                        
                        {file ? (
                            <div className="space-y-2">
                                <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
                                <p className="text-sm font-medium text-green-800">{file.name}</p>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-gray-500"
                                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                >
                                    Change File
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Upload className="w-10 h-10 text-gray-300 mx-auto" />
                                <p className="text-sm font-medium text-gray-700">Click to upload CSV or Excel</p>
                                <p className="text-xs text-gray-500">.csv / .xlsx / .xls &nbsp;|&nbsp; Max size: 5MB</p>
                            </div>
                        )}
                    </div>

                    {/* Messages */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 text-sm">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {result && (
                        <div className="flex items-start gap-2 p-3 bg-green-50 text-green-700 rounded-lg border border-green-100 text-sm">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">{result.message}</p>
                                {result.skipped > 0 && (
                                    <p className="text-xs opacity-80 mt-1">Skipped {result.skipped} existing records or invalid entries.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        {result ? "Close" : "Cancel"}
                    </Button>
                    {!result && (
                        <Button 
                            onClick={handleSubmit} 
                            disabled={!file || isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Importing...
                                </>
                            ) : "Start Import"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
