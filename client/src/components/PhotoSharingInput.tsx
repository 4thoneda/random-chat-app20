import { useState, useRef } from "react";
import { Camera, Image, X, Upload, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import {
  uploadChatPhoto,
  validateImageFile,
  getStorageErrorMessage,
} from "../lib/storageUtils";

interface PhotoSharingInputProps {
  onPhotoSelected: (photoUrl: string, filePath?: string) => void;
  onCancel: () => void;
  chatId?: string;
  userId?: string;
}

export default function PhotoSharingInput({
  onPhotoSelected,
  onCancel,
  chatId = "default",
  userId = "anonymous",
}: PhotoSharingInputProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(""); // Clear previous errors

    if (!file) return;

    // Validate file using our utility
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setError(validation.error || "Invalid file");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPreviewUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendPhoto = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError("");
    setUploadProgress(0);

    try {
      // Upload to Firebase Storage with progress tracking
      const result = await uploadChatPhoto(
        selectedFile,
        chatId,
        userId,
        (progress) => setUploadProgress(progress),
      );

      // Call the callback with the Firebase Storage URL
      onPhotoSelected(result.url, result.path);

      // Reset state
      setSelectedFile(null);
      setPreviewUrl("");
      setUploadProgress(0);
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      const errorMessage = getStorageErrorMessage(error);
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setError("");
    setUploadProgress(0);
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-primary-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-accent-600 text-white p-6 relative">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Share Photo</h2>
            <button
              onClick={handleCancel}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!selectedFile ? (
            <>
              {/* Photo selection options */}
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">📸</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Share a Special Moment
                  </h3>
                  <p className="text-sm text-gray-600">
                    Choose a photo to share in this conversation
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700"
                  >
                    <Image size={24} />
                    <span className="text-sm font-medium">Gallery</span>
                  </Button>

                  <Button
                    onClick={() => {
                      // In a real app, this would open camera
                      fileInputRef.current?.click();
                    }}
                    className="h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-mehendi-500 to-mehendi-600 hover:from-mehendi-600 hover:to-mehendi-700"
                  >
                    <Camera size={24} />
                    <span className="text-sm font-medium">Camera</span>
                  </Button>
                </div>

                {/* Error display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        size={20}
                        className="text-secondary-600 flex-shrink-0 mt-0.5"
                      />
                      <div>
                        <h4 className="font-semibold text-secondary-800 text-sm mb-1">
                          Upload Error
                        </h4>
                        <p className="text-secondary-700 text-xs leading-relaxed">
                          {error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Privacy notice */}
                <div className="bg-gold-50 border border-gold-200 rounded-xl p-4 mt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={20}
                      className="text-gold-600 flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <h4 className="font-semibold text-gold-800 text-sm mb-1">
                        Privacy Notice
                      </h4>
                      <p className="text-gold-700 text-xs leading-relaxed">
                        • Photos are automatically deleted when chat is closed
                        <br />
                        • Non-premium users cannot screenshot or download
                        <br />• Only Premium users can save shared photos
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Photo preview */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Preview & Send
                  </h3>
                </div>

                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-xl shadow-lg"
                  />
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl("");
                    }}
                    className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>
                      File size: {(selectedFile.size / 1024 / 1024).toFixed(2)}{" "}
                      MB
                    </span>
                    <span>
                      Format: {selectedFile.type.split("/")[1].toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl("");
                    }}
                    className="flex-1"
                    disabled={isUploading}
                  >
                    Change Photo
                  </Button>
                  <Button
                    onClick={handleSendPhoto}
                    disabled={isUploading}
                    className="flex-1 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700"
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-1 w-full">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Uploading...
                        </div>
                        {uploadProgress > 0 && (
                          <div className="w-full bg-white/20 rounded-full h-1">
                            <div
                              className="bg-white h-1 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        )}
                        {uploadProgress > 0 && (
                          <span className="text-xs text-white/80">
                            {Math.round(uploadProgress)}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Upload size={16} />
                        Send Photo
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
