import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import BottomNavBar from "../components/BottomNavBar";
import PremiumPaywall from "../components/PremiumPaywall";
import LanguageSelector from "../components/LanguageSelector";
import SettingsModal from "../components/SettingsModal";
import HelpSupportModal from "../components/HelpSupportModal";

import { useFriends } from "../context/FriendsProvider";
import { useCoin } from "../context/CoinProvider";
import {
  uploadProfileImage,
  getStorageErrorMessage,
  validateImageFile,
} from "../lib/storageUtils";
import { getUserId, getUserProfile, saveUserProfile } from "../lib/userUtils";
import {
  Crown,
  Camera,
  Copy,
  Star,
  Gift,
  ArrowLeft,
  Edit3,
  Check,
  Settings,
  User,
  Globe,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  AlertCircle,
  Trash2,
  Download,
  Share2,
  Heart,
  Database,
  Zap,
  Award,
  TrendingUp,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  Sparkles,
  Medal,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { usePremium } from "../context/PremiumProvider";
import { useLanguage } from "../context/LanguageProvider";

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { friends, removeFriend, canAddMoreFriends, maxFreeLimit } =
    useFriends();
  const { isPremium, setPremium, premiumExpiry } = usePremium();
  const { coins, isLoading: coinsLoading } = useCoin();
  const { t } = useLanguage();

  const [username, setUsername] = useState<string>("User");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userGender, setUserGender] = useState<string>("other");
  const [isEditingUsername, setIsEditingUsername] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const [showLanguageSelector, setShowLanguageSelector] =
    useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [settingsType, setSettingsType] = useState<
    "privacy" | "notifications" | "account" | "general" | null
  >(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string>("");

  const [activeTab, setActiveTab] = useState<
    "profile" | "stats" | "achievements"
  >("profile");

  const referralId = "AJNABICAM12345";

  // Mock user stats
  const userStats = {
    totalChats: 127,
    friendsMade: 23,
    hoursSpent: 45,
    favoriteTime: "Evening",
    joinDate: "Dec 2024",
    streak: 7,
  };

  // Mock achievements
  const achievements = [
    {
      id: 1,
      title: "First Chat",
      description: "Complete your first video chat",
      unlocked: true,
      icon: "🎉",
    },
    {
      id: 2,
      title: "Social Butterfly",
      description: "Make 10 friends",
      unlocked: true,
      icon: "🦋",
    },
    {
      id: 3,
      title: "Night Owl",
      description: "Chat after midnight 5 times",
      unlocked: true,
      icon: "🦉",
    },
    {
      id: 4,
      title: "Premium Member",
      description: "Subscribe to Premium",
      unlocked: isPremium,
      icon: "👑",
    },
    {
      id: 5,
      title: "Conversation Master",
      description: "Have 100 chats",
      unlocked: true,
      icon: "💬",
    },
    {
      id: 6,
      title: "Global Connector",
      description: "Chat with people from 10 countries",
      unlocked: false,
      icon: "🌍",
    },
  ];

  // Gender-specific avatar URLs
  const getDefaultAvatar = (gender: string): string => {
    switch (gender) {
      case "male":
        return "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop";
      case "female":
        return "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop";
      default:
        return "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop";
    }
  };

  // Load user data on component mount
  useEffect(() => {
    const userData = localStorage.getItem("ajnabicam_user_data");
    if (userData) {
      try {
        const parsedData = JSON.parse(userData);
        if (parsedData.username) {
          setUsername(parsedData.username);
        }
        if (parsedData.gender) {
          setUserGender(parsedData.gender);
        }

        const savedProfileImage = localStorage.getItem(
          "ajnabicam_profile_image",
        );
        if (savedProfileImage) {
          setProfileImage(savedProfileImage);
        } else {
          setProfileImage(getDefaultAvatar(parsedData.gender || "other"));
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        setProfileImage(getDefaultAvatar("other"));
      }
    } else {
      setProfileImage(getDefaultAvatar("other"));
    }
  }, []);

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError("");

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setUploadError(validation.error || "Invalid file");
      return;
    }

    // Create preview immediately for better UX
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setProfileImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    setIsUploadingImage(true);
    setUploadProgress(0);

    try {
      // Get user ID
      const userId = getUserId();

      // Upload to Firebase Storage
      const result = await uploadProfileImage(file, userId, (progress) =>
        setUploadProgress(progress),
      );

      // Save the Firebase Storage URL
      setProfileImage(result.url);
      localStorage.setItem("ajnabicam_profile_image", result.url);
      localStorage.setItem("ajnabicam_profile_path", result.path);

      console.log("Profile image uploaded successfully:", result.url);
    } catch (error: any) {
      console.error("Error uploading profile image:", error);
      const errorMessage = getStorageErrorMessage(error);
      setUploadError(errorMessage);

      // Revert to previous image on error
      const previousImage = localStorage.getItem("ajnabicam_profile_image");
      if (previousImage) {
        setProfileImage(previousImage);
      } else {
        setProfileImage(getDefaultAvatar(userGender));
      }
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value);
  };

  const handleUsernameSave = () => {
    setIsEditingUsername(false);

    const userData = localStorage.getItem("ajnabicam_user_data");
    if (userData) {
      try {
        const parsedData = JSON.parse(userData);
        parsedData.username = username;
        localStorage.setItem("ajnabicam_user_data", JSON.stringify(parsedData));
      } catch (error) {
        console.error("Error updating user data:", error);
      }
    }
  };

  const handlePremiumClick = () => {
    setShowPaywall(true);
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralId);
    alert(t("profile.referral.copy") + "!");
  };

  const handlePremiumPurchase = (plan: string) => {
    const now = new Date();
    const expiry = new Date(now);
    if (plan === "weekly") {
      expiry.setDate(now.getDate() + 7);
    } else {
      expiry.setMonth(now.getMonth() + 1);
    }

    setPremium(true, expiry);
    setShowPaywall(false);
    alert(`🎉 Welcome to Premium! Your ${plan} subscription is now active!`);
  };

  const handleSettingsClick = (
    type: "privacy" | "notifications" | "account" | "general",
  ) => {
    setSettingsType(type);
    setShowSettingsModal(true);
  };

  const formatPremiumExpiry = () => {
    if (!premiumExpiry) return "";
    return premiumExpiry.toLocaleDateString();
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Enhanced Profile Image Section */}
      <div className="flex flex-col items-center">
        <div className="relative group">
          {/* Larger circular profile image */}
          <div className="w-40 h-40 rounded-full bg-gradient-to-br from-primary-200 via-accent-300 to-premium-300 flex justify-center items-center overflow-hidden cursor-pointer border-4 border-white shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 relative">
            {/* Animated border ring */}
            <div className="absolute inset-0 rounded-full border-4 border-primary-400 animate-pulse opacity-30"></div>

            {/* Premium glow effect for premium users */}
            {isPremium && (
              <div className="absolute inset-0 rounded-full border-4 border-gold-400 animate-pulse shadow-[0_0_20px_rgba(247,200,115,0.6)]"></div>
            )}

            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                <div className="text-primary-700 text-xs font-bold text-center">
                  {t("profile.addPhoto")}
                </div>
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full flex items-center justify-center">
              <div className="text-center text-white">
                <Camera className="h-8 w-8 mx-auto mb-1" />
                <div className="text-xs font-semibold">Change Photo</div>
              </div>
            </div>
          </div>

          {/* Camera button with premium styling */}
          <button
            onClick={handleImageUploadClick}
            className={`absolute -bottom-2 -right-2 text-white p-3 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 hover:rotate-12 ${
              isPremium
                ? "bg-gradient-to-r from-gold-500 via-premium-500 to-secondary-500"
                : "bg-gradient-to-r from-primary-500 to-accent-600"
            }`}
          >
            <Camera className="h-5 w-5" />
          </button>

          {/* Premium crown indicator */}
          {isPremium && (
            <div className="absolute -top-3 -right-3 bg-gradient-to-r from-gold-400 to-secondary-500 rounded-full p-2 shadow-lg animate-bounce">
              <Crown className="h-5 w-5 text-white" />
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleImageChange}
            disabled={isUploadingImage}
          />

          {/* Upload Progress */}
          {isUploadingImage && (
            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
                <div className="text-xs font-semibold">
                  Uploading {Math.round(uploadProgress)}%
                </div>
                {uploadProgress > 0 && (
                  <div className="w-16 bg-white/20 rounded-full h-1 mt-1 mx-auto">
                    <div
                      className="bg-white h-1 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Upload Error */}
        {uploadError && (
          <div className="mt-4 w-full max-w-sm bg-red-50 border border-red-200 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <AlertCircle
                size={16}
                className="text-red-600 flex-shrink-0 mt-0.5"
              />
              <div>
                <h4 className="font-semibold text-red-800 text-sm">
                  Upload Failed
                </h4>
                <p className="text-red-700 text-xs mt-1">{uploadError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Username Section */}
        <div className="mt-6 w-full max-w-sm">
          {isEditingUsername ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                className="flex-grow px-4 py-3 rounded-xl border-2 border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-500 bg-primary-50 text-lg font-semibold transition-all duration-200"
                autoFocus
              />
              <Button
                onClick={handleUsernameSave}
                className="bg-gradient-to-r from-gold-500 to-premium-600 text-white px-4 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-grow text-center px-4 py-3 rounded-xl bg-gradient-to-r from-primary-50 to-accent-50 text-primary-800 font-bold text-xl border-2 border-primary-200 shadow-sm">
                {username}
              </div>
              <Button
                onClick={() => setIsEditingUsername(true)}
                className="bg-gradient-to-r from-premium-500 to-premium-600 text-white px-4 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* User Level Badge */}
        <div className="mt-4 flex items-center gap-2 bg-gradient-to-r from-premium-100 to-primary-100 px-4 py-2 rounded-full border border-premium-200">
          <Medal className="h-5 w-5 text-premium-600" />
          <span className="text-premium-700 font-semibold">Level 5 Chatter</span>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-gold-50 to-gold-100 border-gold-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gold-700">
              {coinsLoading ? "..." : coins}
            </div>
            <div className="text-xs text-gold-600 font-medium">Coins</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-secondary-50 to-secondary-100 border-secondary-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-secondary-700">
              {userStats.friendsMade}
            </div>
            <div className="text-xs text-secondary-600 font-medium">
              Friends Made
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Section */}
      <Card className="bg-gradient-to-r from-gold-50 to-premium-50 border-2 border-gold-200 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 animate-pulse"></div>
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-3 text-gold-800">
            <div className="bg-gold-100 p-2 rounded-full">
              <Gift className="h-6 w-6 text-gold-600" />
            </div>
            {t("profile.referral.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 space-y-4">
          <div className="bg-white rounded-xl p-4 border border-gold-200 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gold-600 font-bold">
                  {t("profile.referral.id")}
                </span>
                <div className="font-mono text-gold-800 text-lg font-extrabold tracking-wider">
                  {referralId}
                </div>
              </div>
              <Button
                onClick={handleCopyReferral}
                className="bg-gradient-to-r from-gold-500 to-premium-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Copy className="h-4 w-4 mr-2" />
                {t("profile.referral.copy")}
              </Button>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gold-700 font-bold mb-2">
              {t("profile.referral.reward")}
            </p>
            <p className="text-xs text-gold-600 font-medium">
              {t("profile.referral.share")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAchievementsTab = () => (
    <div className="space-y-4">
      {achievements.map((achievement) => (
        <Card
          key={achievement.id}
          className={`${achievement.unlocked ? "bg-gradient-to-r from-gold-50 to-premium-50 border-gold-200" : "bg-gray-50 border-gray-200"} transition-all duration-300 hover:shadow-lg`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div
                className={`text-3xl ${achievement.unlocked ? "grayscale-0" : "grayscale"}`}
              >
                {achievement.icon}
              </div>
              <div className="flex-1">
                <h3
                  className={`font-bold ${achievement.unlocked ? "text-gold-800" : "text-gray-600"}`}
                >
                  {achievement.title}
                </h3>
                <p
                  className={`text-sm ${achievement.unlocked ? "text-gold-600" : "text-gray-500"}`}
                >
                  {achievement.description}
                </p>
              </div>
              {achievement.unlocked && (
                <div className="bg-gold-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  Unlocked
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      <Helmet>
        <title>
          {t("app.name")} - {t("profile.title")}
        </title>
      </Helmet>
      <main className="flex flex-col items-center min-h-screen w-full max-w-md mx-auto bg-gradient-to-br from-primary-50 via-accent-25 to-gold-50 px-2 py-4 relative pb-20">
        {/* Enhanced Header */}
        <div className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-primary-500 via-accent-500 to-premium-600 text-white font-bold text-xl rounded-t-2xl shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>

          <div className="relative z-10 flex items-center justify-between w-full">
            <button
              onClick={handleBackClick}
              className="text-white font-bold text-xl hover:scale-110 transition-transform"
            >
              <ArrowLeft size={24} />
            </button>

            <button
              onClick={handlePremiumClick}
              className="hover:scale-110 transition-transform bg-white/20 backdrop-blur-sm rounded-full p-2"
            >
              <Crown className="h-6 w-6 text-yellow-300" />
            </button>
          </div>
        </div>

        <div className="w-full flex flex-col bg-white/90 backdrop-blur-sm rounded-b-2xl border border-rose-100 shadow-2xl mb-6 overflow-hidden">
          {/* Premium Status Banner */}
          {isPremium ? (
            <div className="bg-gradient-to-r from-gold-400 via-premium-500 to-secondary-500 p-3 text-white text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent animate-pulse"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Crown className="h-5 w-5 text-gold-200" />
                  <h2 className="text-base font-bold">
                    {t("profile.premium.active")}
                  </h2>
                </div>
                <p className="text-gold-200 text-xs">
                  Expires: {formatPremiumExpiry()}
                </p>
              </div>
            </div>
          ) : (
            <div
              className="bg-gradient-to-r from-premium-500 via-primary-500 to-accent-500 p-3 text-white text-center cursor-pointer relative overflow-hidden hover:shadow-lg transition-all duration-300"
              onClick={handlePremiumClick}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10 animate-pulse"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Crown className="h-5 w-5 text-gold-200" />
                  <h2 className="text-base font-bold">
                    {t("profile.premium.upgrade")}
                  </h2>
                </div>
                <div className="flex justify-center gap-3 text-premium-100 text-xs font-medium mb-1">
                  <span>{t("profile.premium.features.gender")}</span>
                  <span>{t("profile.premium.features.voice")}</span>
                  <span>{t("profile.premium.features.unlimited")}</span>
                </div>
                <div className="text-gold-200 text-xs font-bold">
                  ✨ Tap to upgrade! ✨
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex bg-gray-50 border-b border-gray-200">
            {[
              { id: "profile", label: "Profile", icon: User },
              { id: "achievements", label: "Awards", icon: Award },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-white text-primary-600 border-b-2 border-primary-500"
                    : "text-gray-600 hover:text-primary-500 hover:bg-gray-100"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "profile" && renderProfileTab()}
            {activeTab === "achievements" && renderAchievementsTab()}
          </div>

          {/* Settings Section */}
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <h3 className="font-bold text-primary-800 text-base flex items-center gap-2 mb-3">
              <div className="bg-primary-100 p-1.5 rounded-full">
                <Settings className="h-4 w-4 text-primary-600" />
              </div>
              {t("profile.settings")}
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {/* Storage Debug Button (Development) */}
              <button
                onClick={() => navigate("/storage-debug")}
                className="flex flex-col items-center p-3 rounded-lg bg-white hover:bg-secondary-50 transition-all duration-300 border border-secondary-200 shadow-sm hover:shadow-md"
              >
                <Database className="h-5 w-5 text-secondary-600 mb-1" />
                <span className="text-secondary-700 font-semibold text-xs">
                  Storage Debug
                </span>
              </button>
              <button
                onClick={() => handleSettingsClick("privacy")}
                className="flex flex-col items-center p-3 rounded-lg bg-white hover:bg-primary-50 transition-all duration-300 border border-primary-200 shadow-sm hover:shadow-md"
              >
                <Shield className="h-5 w-5 text-primary-600 mb-1" />
                <span className="text-primary-700 font-semibold text-xs">
                  Privacy
                </span>
              </button>

              <button
                onClick={() => handleSettingsClick("notifications")}
                className="flex flex-col items-center p-3 rounded-lg bg-white hover:bg-primary-50 transition-all duration-300 border border-primary-200 shadow-sm hover:shadow-md"
              >
                <Bell className="h-5 w-5 text-primary-600 mb-1" />
                <span className="text-primary-700 font-semibold text-xs">
                  Notifications
                </span>
              </button>

              <button
                onClick={() => handleSettingsClick("account")}
                className="flex flex-col items-center p-3 rounded-lg bg-white hover:bg-primary-50 transition-all duration-300 border border-primary-200 shadow-sm hover:shadow-md"
              >
                <User className="h-5 w-5 text-primary-600 mb-1" />
                <span className="text-primary-700 font-semibold text-xs">
                  Account
                </span>
              </button>

              <button
                onClick={() => setShowLanguageSelector(true)}
                className="flex flex-col items-center p-3 rounded-lg bg-white hover:bg-primary-50 transition-all duration-300 border border-primary-200 shadow-sm hover:shadow-md"
              >
                <Globe className="h-5 w-5 text-primary-600 mb-1" />
                <span className="text-primary-700 font-semibold text-xs">
                  Language
                </span>
              </button>

              <button
                onClick={() => setShowHelpModal(true)}
                className="flex flex-col items-center p-3 rounded-lg bg-white hover:bg-primary-50 transition-all duration-300 border border-primary-200 shadow-sm hover:shadow-md"
              >
                <HelpCircle className="h-5 w-5 text-primary-600 mb-1" />
                <span className="text-primary-700 font-semibold text-xs">
                  Help
                </span>
              </button>

              <button
                onClick={() => {
                  if (confirm("Are you sure you want to logout?")) {
                    localStorage.clear();
                    navigate("/onboarding");
                  }
                }}
                className="flex flex-col items-center p-3 rounded-lg bg-white hover:bg-red-50 transition-all duration-300 border border-red-200 shadow-sm hover:shadow-md"
              >
                <LogOut className="h-5 w-5 text-red-600 mb-1" />
                <span className="text-red-700 font-semibold text-xs">
                  Logout
                </span>
              </button>
            </div>
          </div>
        </div>

        <BottomNavBar />
      </main>

      <PremiumPaywall
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchase={handlePremiumPurchase}
      />

      <LanguageSelector
        isOpen={showLanguageSelector}
        onClose={() => setShowLanguageSelector(false)}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => {
          setShowSettingsModal(false);
          setSettingsType(null);
        }}
        settingType={settingsType}
      />

      <HelpSupportModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </>
  );
};

export default ProfilePage;