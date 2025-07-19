import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Wifi, Database } from "lucide-react";
import {
  testFirebaseStorageConnection,
  ConnectionTestResult,
} from "../lib/connectionTest";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  console.log("SplashScreen rendered");
  const [connectionStatus, setConnectionStatus] = useState<{
    isTestingConnection: boolean;
    connectionResult: ConnectionTestResult | null;
    showConnectionTest: boolean;
  }>({
    isTestingConnection: false,
    connectionResult: null,
    showConnectionTest: false,
  });

  useEffect(() => {
    // Start connection test after 1 second
    const connectionTimer = setTimeout(() => {
      setConnectionStatus((prev) => ({
        ...prev,
        isTestingConnection: true,
        showConnectionTest: true,
      }));

      testFirebaseStorageConnection()
        .then((result) => {
          setConnectionStatus((prev) => ({
            ...prev,
            isTestingConnection: false,
            connectionResult: result,
          }));
        })
        .catch((error) => {
          setConnectionStatus((prev) => ({
            ...prev,
            isTestingConnection: false,
            connectionResult: {
              isConnected: false,
              status: "error",
              message: "Connection test failed",
              details: {
                canRead: false,
                canWrite: false,
                canDelete: false,
                error: error.message,
              },
            },
          }));
        });
    }, 1000);

    // Hide splash immediately to see main app
    const timer = setTimeout(() => {
      console.log("SplashScreen: hiding splash immediately");
      setIsVisible(false);
      setTimeout(() => {
        console.log("SplashScreen: calling onComplete");
        onComplete();
      }, 100); // Very fast transition
    }, 500);

    return () => {
      clearTimeout(timer);
      clearTimeout(connectionTimer);
    };
  }, [onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      style={{
        background: "linear-gradient(to bottom right, #F44B7F, #FFB6B9, #FF6F61)",
        transition: "opacity 0.5s",
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 ${isVisible ? "opacity-100" : "opacity-0"}`}
    >
      <div className="flex flex-col items-center justify-center animate-fade-in max-w-lg w-full">
        <div className="relative mb-4 sm:mb-6 lg:mb-8 transform hover:scale-105 transition-transform duration-300">
          <img
            src="/splash-image.png"
            alt="AjnabiCam Splash"
            className="w-64 sm:w-72 md:w-80 lg:w-96 h-auto rounded-2xl sm:rounded-3xl shadow-2xl max-w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl sm:rounded-3xl"></div>
        </div>

        {/* Loading animation */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-4 sm:mt-6">
          <div
            style={{ backgroundColor: "#F44B7F" }}
            className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full animate-bounce shadow-lg"
          ></div>
          <div
            style={{ backgroundColor: "#FFB6B9", animationDelay: "0.1s" }}
            className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full animate-bounce shadow-lg"
          ></div>
          <div
            style={{ backgroundColor: "#FF6F61", animationDelay: "0.2s" }}
            className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full animate-bounce shadow-lg"
          ></div>
        </div>

        <p
          style={{ color: "#F44B7F" }}
          className="text-base sm:text-lg lg:text-xl font-medium mt-3 sm:mt-4 animate-pulse text-center px-4"
        >
          💕 Finding your perfect match...
        </p>

        {/* Firebase Storage Connection Status */}
        {connectionStatus.showConnectionTest && (
          <div className="mt-4 sm:mt-6 bg-white/90 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-xl border border-primary-200 w-full max-w-sm mx-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Database className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 flex-shrink-0" />
              <span className="font-semibold text-romance-800 text-sm sm:text-base">
                Firebase Storage
              </span>

              {connectionStatus.isTestingConnection ? (
                <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"></div>
                  <span className="text-xs sm:text-sm text-primary-700">
                    Testing...
                  </span>
                </div>
              ) : connectionStatus.connectionResult ? (
                <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
                  {connectionStatus.connectionResult.isConnected ? (
                    <>
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-mehendi-600" />
                      <Wifi className="w-3 h-3 sm:w-4 sm:h-4 text-mehendi-600" />
                      <span className="text-xs sm:text-sm text-mehendi-700 font-medium">
                        Connected
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-secondary-600" />
                      <span className="text-xs sm:text-sm text-secondary-700 font-medium">
                        Failed
                      </span>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            {/* Connection result message */}
            {connectionStatus.connectionResult && (
              <p
                className={`text-xs sm:text-sm mt-2 ${
                  connectionStatus.connectionResult.isConnected
                    ? "text-mehendi-600"
                    : "text-secondary-600"
                }`}
              >
                {connectionStatus.connectionResult.message}
              </p>
            )}

            {/* Connection capabilities */}
            {connectionStatus.connectionResult?.details &&
              !connectionStatus.isTestingConnection && (
                <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 text-xs">
                  <span
                    className={`flex items-center gap-1 ${
                      connectionStatus.connectionResult.details.canWrite
                        ? "text-mehendi-600"
                        : "text-secondary-600"
                    }`}
                  >
                    {connectionStatus.connectionResult.details.canWrite
                      ? "✓"
                      : "✗"}{" "}
                    Write
                  </span>
                  <span
                    className={`flex items-center gap-1 ${
                      connectionStatus.connectionResult.details.canRead
                        ? "text-mehendi-600"
                        : "text-secondary-600"
                    }`}
                  >
                    {connectionStatus.connectionResult.details.canRead
                      ? "✓"
                      : "✗"}{" "}
                    Read
                  </span>
                  <span
                    className={`flex items-center gap-1 ${
                      connectionStatus.connectionResult.details.canDelete
                        ? "text-mehendi-600"
                        : "text-secondary-600"
                    }`}
                  >
                    {connectionStatus.connectionResult.details.canDelete
                      ? "✓"
                      : "✗"}{" "}
                    Delete
                  </span>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
