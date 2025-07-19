import { useCallback, useEffect, useState } from "react";
import { playSound } from "../lib/audio";
import { useSocket } from "../context/SocketProvider";
import { usePremium } from "../context/PremiumProvider";
import { useCoin } from "../context/CoinProvider";
import { useFriends } from "../context/FriendsProvider";
import peerservice from "../service/peer";
import ReactPlayer from "react-player";
import { Button } from "../components/ui/button";
import Messages from "../components/Messages";
import ChatTimer from "../components/ChatTimer";
import PremiumPaywall from "../components/PremiumPaywall";
import TreasureChest from "../components/TreasureChest";
import ReportUserModal from "../components/ReportUserModal";
import BlockUserModal from "../components/BlockUserModal";
import StayConnectedModal from "../components/StayConnectedModal";
import FriendNotification from "../components/FriendNotification";
import {
  ScreenShare,
  ArrowLeft,
  SkipForward,
  Crown,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Coins,
  Phone,
} from "lucide-react";
import { ClipLoader } from "react-spinners";
import { useTheme } from "../components/theme-provider";
import { useNavigate, useLocation } from "react-router-dom";
import MockWebRTC from "../lib/mockWebRTC";
import "../css/VideoChat.css";

interface Offer {
  offer: RTCSessionDescriptionInit;
  from: string;
}

interface Answer {
  answer: RTCSessionDescriptionInit;
  from: string;
}

interface NegotiationDone {
  answer: RTCSessionDescriptionInit;
  to: string;
}

export default function VideoChat() {
  const { socket, mockMatching, isUsingMockMode } = useSocket();
  const { isPremium, setPremium } = usePremium();
  const { coins, isLoading: coinsLoading } = useCoin();
  const { addFriend, canAddMoreFriends, friends } = useFriends();
  const location = useLocation();
  const [remoteChatToken, setRemoteChatToken] = useState<string | null>(null);
  const [isSearchingForMatch, setIsSearchingForMatch] = useState(false);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [flag, setFlag] = useState(false);
  const [messagesArray, setMessagesArray] = useState<
    Array<{
      sender: string;
      message: string;
      id?: string;
      isSecret?: boolean;
      timestamp?: number;
    }>
  >([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showTreasureChest, setShowTreasureChest] = useState(false);
  const [isVoiceOnly, setIsVoiceOnly] = useState(false);
  const [partnerPremium, setPartnerPremium] = useState(false);

  // Friends system state
  const [showStayConnected, setShowStayConnected] = useState(false);
  const [partnerWantsToStay, setPartnerWantsToStay] = useState<boolean | null>(
    null,
  );
  const [myStayResponse, setMyStayResponse] = useState<boolean | null>(null);
  const [partnerName, setPartnerName] = useState("Stranger");
  const [isFriendCall, setIsFriendCall] = useState(false);
  const [friendNotification, setFriendNotification] = useState<{
    show: boolean;
    friendName: string;
    friendId: string;
  }>({ show: false, friendName: "", friendId: "" });

  // Reporting state
  const [showReport, setShowReport] = useState(false);
  const [showReportEnd, setShowReportEnd] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [suspended, setSuspended] = useState(false);

  // Blocking state
  const [showBlock, setShowBlock] = useState(false);
  const [blockSubmitted, setBlockSubmitted] = useState(false);

  const { theme } = useTheme();
  const navigate = useNavigate();

  const loaderColor = theme === "dark" ? "#D1D5DB" : "#4B5563";

  // Check if this is a friend call or searching for random match
  useEffect(() => {
    const state = location.state as {
      genderFilter?: string;
      voiceOnly?: boolean;
      friendCall?: boolean;
      friendId?: string;
      friendName?: string;
      isSearching?: boolean;
    };

    if (state?.friendCall) {
      setIsFriendCall(true);
      setPartnerName(state.friendName || "Friend");
      // Show rewarded ad for friend calls
      setTimeout(() => {
        alert("🎬 Enjoy your call! Another ad will show after the call ends.");
      }, 1000);
    } else if (state?.isSearching) {
      // User came from home screen to find random match
      setIsSearchingForMatch(true);
      // Start finding match if socket is connected
      if (socket) {
        socket.emit("find:match");
      }
    }

    if (state?.voiceOnly && isPremium) {
      setIsVoiceOnly(true);
      setIsCameraOn(false);
    }
  }, [location.state, isPremium, socket]);

  // Show friend online notifications
  useEffect(() => {
    const checkOnlineFriends = () => {
      const onlineFriends = friends.filter((friend) => friend.isOnline);
      if (onlineFriends.length > 0 && Math.random() < 0.3) {
        // 30% chance
        const randomFriend =
          onlineFriends[Math.floor(Math.random() * onlineFriends.length)];
        setFriendNotification({
          show: true,
          friendName: randomFriend.name,
          friendId: randomFriend.id,
        });
      }
    };

    const interval = setInterval(checkOnlineFriends, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [friends]);

  const handlePremiumPurchase = useCallback(
    (plan: string) => {
      console.log(`Processing payment for ${plan} plan`);

      const now = new Date();
      const expiry = new Date(now);
      if (plan === "weekly") {
        expiry.setDate(now.getDate() + 7);
      } else {
        expiry.setMonth(now.getMonth() + 1);
      }

      setPremium(true, expiry);
      setShowPaywall(false);

      alert(
        `🎉 Welcome to Premium! Your ${plan} subscription is now active until ${expiry.toLocaleDateString()}`,
      );
    },
    [setPremium],
  );

  // Auto-award coins when chat completes
  const { completeChat } = useCoin();

  const handleChatComplete = useCallback(() => {
    if (remoteChatToken) {
      completeChat();
    }
  }, [remoteChatToken, completeChat]);

  const handleSkip = useCallback(async () => {
    if (!isFriendCall && remoteChatToken) {
      handleChatComplete(); // Award coins for completing chat
      setShowStayConnected(true);
      return;
    }

    if (remoteChatToken) {
      handleChatComplete(); // Award coins for completing chat
    }

    peerservice.peer.getTransceivers().forEach((transceiver) => {
      if (transceiver.stop) {
        transceiver.stop();
      }
    });

    peerservice.peer.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
        peerservice.peer.removeTrack(sender);
      }
    });

    peerservice.peer.onicecandidate = null;
    peerservice.peer.ontrack = null;
    peerservice.peer.onnegotiationneeded = null;

    if (peerservice.peer.signalingState !== "closed") {
      peerservice.peer.close();
    }
    peerservice.initPeer();
    setMessagesArray([]);
    setFlag(false);

    setRemoteStream(null);
    setRemoteChatToken(null);

    socket?.emit("skip");
  }, [socket, isFriendCall, remoteChatToken, handleChatComplete]);

  const handleTimeUp = useCallback(() => {
    if (!isFriendCall) {
      setShowStayConnected(true);
    } else {
      // Show ad after friend call ends
      alert("🎬 Thanks for using AjnabiCam! Here's your post-call ad.");
      handleSkip();
    }
  }, [isFriendCall, handleSkip]);

  const handleUpgrade = useCallback(() => {
    setShowPaywall(true);
  }, []);

  const handleStayConnected = useCallback(
    (wantToStay: boolean) => {
      setMyStayResponse(wantToStay);

      if (wantToStay) {
        // Check if user can add more friends
        if (!canAddMoreFriends) {
          setShowStayConnected(false);
          setShowPaywall(true);
          return;
        }

        // Send stay connected request to partner
        socket?.emit("stay:connected:response", {
          targetChatToken: remoteChatToken,
          wantToStay: true,
        });
      } else {
        socket?.emit("stay:connected:response", {
          targetChatToken: remoteChatToken,
          wantToStay: false,
        });
        setShowStayConnected(false);
        handleSkip();
      }
    },
    [canAddMoreFriends, remoteChatToken, socket, handleSkip],
  );

  const handleFriendCall = (friendId: string) => {
    setFriendNotification({ show: false, friendName: "", friendId: "" });
    navigate("/video-chat", {
      state: {
        friendCall: true,
        friendId,
        friendName: friends.find((f) => f.id === friendId)?.name || "Friend",
      },
    });
  };

  const getUserStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: !isVoiceOnly,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          sampleSize: 16,
          channelCount: 2,
        },
      });
      setMyStream(stream);
      return stream;
    } catch (error) {
      console.error("Error getting user media:", error);
      // Fallback to basic audio only if full request fails
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        setMyStream(fallbackStream);
        return fallbackStream;
      } catch (fallbackError) {
        console.error("Fallback media access also failed:", fallbackError);
        throw fallbackError;
      }
    }
  }, [isVoiceOnly]);

  useEffect(() => {
    if (!myStream) {
      getUserStream();
    }
  }, [getUserStream, myStream]);

  // Handle match finding when socket connects and we're searching
  useEffect(() => {
    if (isSearchingForMatch && !remoteChatToken && !isFriendCall) {
      if (socket && !isUsingMockMode) {
        console.log("Socket connected, finding match...");
        socket.emit("find:match");
      } else {
        console.log("Using mock matching service...");
        const userId = "user_" + Math.random().toString(36).substr(2, 9);
        mockMatching.findMatch(userId, (partnerId) => {
          console.log("Mock match found:", partnerId);
          setRemoteChatToken(partnerId);
          setPartnerPremium(false);
          setIsSearchingForMatch(false);
          playSound("match");
          setShowReport(true);
          setPartnerName("Demo Partner");
          MockWebRTC.simulateConnection((mockStream) => {
            setRemoteStream(mockStream);
          });
        });
      }

      // Set a timeout for match finding (30 seconds)
      const matchTimeout = setTimeout(() => {
        if (isSearchingForMatch && !remoteChatToken) {
          setIsSearchingForMatch(false);
          alert("No matches found at the moment. Please try again!");
          navigate("/");
        }
      }, 30000);

      return () => clearTimeout(matchTimeout);
    }
  }, [
    socket,
    isUsingMockMode,
    mockMatching,
    isSearchingForMatch,
    remoteChatToken,
    isFriendCall,
    navigate,
  ]);

  // Premium feature: Switch to voice-only mode during call
  const toggleVoiceOnlyMode = useCallback(async () => {
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }

    try {
      if (!isVoiceOnly) {
        // Switch to voice-only
        const videoTrack = myStream?.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          myStream?.removeTrack(videoTrack);

          const sender = peerservice.peer
            .getSenders()
            .find((s) => s.track?.kind === "video");
          if (sender) {
            await sender.replaceTrack(null);
          }
        }
        setIsCameraOn(false);
        setIsVoiceOnly(true);
      } else {
        // Switch back to video
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        myStream?.addTrack(newVideoTrack);

        const sender = peerservice.peer
          .getSenders()
          .find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }

        setIsCameraOn(true);
        setIsVoiceOnly(false);
      }
    } catch (error) {
      console.error("Error toggling voice-only mode:", error);
    }
  }, [isPremium, isVoiceOnly, myStream]);

  const toggleCamera = useCallback(async () => {
    if (!myStream) return;

    try {
      const videoTrack = myStream.getVideoTracks()[0];
      const sender = peerservice.peer
        .getSenders()
        .find((s) => s.track?.kind === "video");

      if (isCameraOn) {
        if (videoTrack) {
          videoTrack.stop();
          myStream.removeTrack(videoTrack);
        }
        if (sender) {
          await sender.replaceTrack(null);
        }
      } else {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        myStream.addTrack(newVideoTrack);
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }
      setIsCameraOn(!isCameraOn);
    } catch (error) {
      console.error("Error toggling camera:", error);
    }
  }, [myStream, isCameraOn]);

  const toggleMic = useCallback(async () => {
    if (!myStream) return;

    try {
      const audioTrack = myStream.getAudioTracks()[0];
      const sender = peerservice.peer
        .getSenders()
        .find((s) => s.track?.kind === "audio");

      if (isMicOn) {
        if (audioTrack) {
          audioTrack.stop();
          myStream.removeTrack(audioTrack);
        }
        if (sender) {
          await sender.replaceTrack(null);
        }
      } else {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const newAudioTrack = newStream.getAudioTracks()[0];
        myStream.addTrack(newAudioTrack);
        if (sender) {
          await sender.replaceTrack(newAudioTrack);
        }
      }
      setIsMicOn(!isMicOn);
    } catch (error) {
      console.error("Error toggling mic:", error);
    }
  }, [myStream, isMicOn]);

  const sendStream = useCallback(() => {
    if (myStream) {
      const videoTrack = myStream.getVideoTracks()[0];
      const audioTrack = myStream.getAudioTracks()[0];

      const senders = peerservice.peer.getSenders();

      if (videoTrack) {
        const videoSender = senders.find((s) => s.track === videoTrack);
        if (!videoSender) {
          peerservice.peer.addTrack(videoTrack, myStream);
        }
      }

      if (audioTrack) {
        const audioSender = senders.find((s) => s.track === audioTrack);
        if (!audioSender) {
          peerservice.peer.addTrack(audioTrack, myStream);
        }
      }
    }
  }, [myStream]);

  const handleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        const videoTrack = myStream?.getVideoTracks()[0];
        const screenSender = peerservice.peer
          .getSenders()
          .find((s) => s.track?.kind === "video");

        if (videoTrack && screenSender) {
          await screenSender.replaceTrack(videoTrack);
        }

        screenStream?.getTracks().forEach((track) => track.stop());
        setScreenStream(null);
        setIsScreenSharing(false);

        if (peerservice.peer.signalingState === "stable") {
          const offer = await peerservice.getOffer();
          socket?.emit("peer:nego:needed", {
            offer,
            targetChatToken: remoteChatToken,
          });
        }
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        setScreenStream(stream);
        setIsScreenSharing(true);

        const screenTrack = stream.getVideoTracks()[0];
        const videoSender = peerservice.peer
          .getSenders()
          .find((s) => s.track?.kind === "video");

        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        } else {
          peerservice.peer.addTrack(screenTrack, stream);
        }

        if (peerservice.peer.signalingState === "stable") {
          const offer = await peerservice.getOffer();
          socket?.emit("peer:nego:needed", {
            offer,
            targetChatToken: remoteChatToken,
          });
        }
      }
    } catch (error) {
      console.error("Error sharing screen:", error);
    }
  }, [isScreenSharing, myStream, screenStream, remoteChatToken, socket]);

  const setAudioBandwidth = (peerConnection: RTCPeerConnection) => {
    const sender = peerConnection
      .getSenders()
      .find((s) => s.track && s.track.kind === "audio");
    if (sender) {
      const parameters = sender.getParameters();
      if (parameters.encodings && parameters.encodings[0]) {
        parameters.encodings[0].maxBitrate = 128000;
        sender.setParameters(parameters);
      }
    }
  };

  const handleUserJoined = useCallback(
    async (remoteId: string) => {
      console.log("Match found:", remoteId);
      setRemoteChatToken(remoteId);
      setPartnerPremium(false);
      setIsSearchingForMatch(false); // Stop searching
      playSound("match");
      setShowReport(true);

      // If using mock mode or partner is a bot, simulate WebRTC connection
      if (isUsingMockMode || remoteId.startsWith("bot_")) {
        console.log("🤖 Using mock WebRTC connection");
        setPartnerName("Demo Partner");
        MockWebRTC.simulateConnection((mockStream) => {
          setRemoteStream(mockStream);
        });
      } else {
        // Real WebRTC connection
        const offer = await peerservice.getOffer();
        socket?.emit("offer", { offer, to: remoteId });
      }
    },
    [socket, isUsingMockMode],
  );

  const handleIncommingOffer = useCallback(
    async ({ offer, from }: Offer) => {
      setRemoteChatToken(from);
      await getUserStream();

      if (peerservice.peer.signalingState === "stable") {
        const answer = await peerservice.getAnswer(offer);
        setAudioBandwidth(peerservice.peer);
        socket?.emit("answer", { answer, to: from });
        sendStream();
      } else {
        console.warn(
          "Cannot handle incoming offer in signaling state:",
          peerservice.peer.signalingState,
        );
      }
    },
    [getUserStream, socket, sendStream],
  );

  const handleIncommingAnswer = useCallback(
    async ({ answer }: Answer) => {
      if (peerservice.peer.signalingState === "have-local-offer") {
        await peerservice.setRemoteDescription(answer);
        sendStream();
      } else {
        console.warn("Peer not in a proper state to set remote description.");
      }
    },
    [sendStream],
  );

  const modifySDP = (sdp: string) => {
    return sdp.replace(
      /a=fmtp:111 .*opus.*/,
      "a=fmtp:111 maxplaybackrate=48000;stereo=1;sprop-stereo=1;maxaveragebitrate=510000;useinbandfec=1",
    );
  };

  const handleNegotiationNeeded = useCallback(async () => {
    if (peerservice.peer.signalingState === "stable") {
      const currentOffer = await peerservice.getOffer();

      if (currentOffer && currentOffer.sdp) {
        const modifiedSDP = modifySDP(currentOffer.sdp);

        const modifiedOffer = new RTCSessionDescription({
          type: currentOffer.type,
          sdp: modifiedSDP,
        });

        setAudioBandwidth(peerservice.peer);

        socket?.emit("peer:nego:needed", {
          offer: modifiedOffer,
          targetChatToken: remoteChatToken,
        });
      }
    } else {
      console.warn("Peer is not in a stable state for negotiation.");
    }
  }, [remoteChatToken, socket]);

  const handleNegotiationIncomming = useCallback(
    async ({ offer, from }: Offer) => {
      if (
        peerservice.peer.signalingState === "stable" ||
        peerservice.peer.signalingState === "have-local-offer"
      ) {
        const answer = await peerservice.getAnswer(offer);
        socket?.emit("peer:nego:done", { answer, to: from });
      } else {
        console.warn(
          "Cannot handle negotiation in state:",
          peerservice.peer.signalingState,
        );
      }
    },
    [socket],
  );

  const handleNegotiationFinal = useCallback(
    async ({ answer }: NegotiationDone) => {
      if (
        peerservice.peer.signalingState === "have-local-offer" ||
        peerservice.peer.signalingState === "have-remote-offer"
      ) {
        await peerservice.setRemoteDescription(answer);
        sendStream();
      } else if (peerservice.peer.signalingState === "stable") {
        console.log("Connection is stable, no need for further negotiation.");
      } else {
        console.warn(
          "Cannot set remote description: Peer connection is in state",
          peerservice.peer.signalingState,
        );
      }
    },
    [sendStream],
  );

  useEffect(() => {
    if (flag !== true) {
      peerservice.peer.addEventListener(
        "negotiationneeded",
        handleNegotiationNeeded,
      );
      setFlag(false);
    }

    return () => {
      peerservice.peer.removeEventListener(
        "negotiationneeded",
        handleNegotiationNeeded,
      );
    };
  }, [flag, handleNegotiationNeeded]);

  useEffect(() => {
    const handleTrackEvent = (event: RTCTrackEvent) => {
      const [incomingStream] = event.streams;
      setRemoteStream(incomingStream);
    };

    peerservice.peer.addEventListener("track", handleTrackEvent);

    return () => {
      peerservice.peer.removeEventListener("track", handleTrackEvent);
    };
  }, []);

  const userDisConnected = useCallback(async () => {
    setFlag(true);
    peerservice.peer.getTransceivers().forEach((transceiver) => {
      if (transceiver.stop) {
        transceiver.stop();
      }
    });

    peerservice.peer.getSenders().forEach((sender) => {
      peerservice.peer.removeTrack(sender);
    });

    peerservice.peer.onicecandidate = null;
    peerservice.peer.ontrack = null;
    peerservice.peer.onnegotiationneeded = null;

    if (peerservice.peer.signalingState !== "closed") {
      peerservice.peer.close();
    }

    setRemoteStream(null);
    setRemoteChatToken(null);
    setPartnerPremium(false);

    peerservice.initPeer();
    setMessagesArray([]);
  }, []);

  useEffect(() => {
    socket?.on("skipped", userDisConnected);

    return () => {
      socket?.off("skipped", userDisConnected);
    };
  }, [socket, userDisConnected]);

  useEffect(() => {
    peerservice.peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit("ice-candidate", {
          candidate: event.candidate,
          to: remoteChatToken,
        });
      }
    };
  }, [socket, remoteChatToken]);

  useEffect(() => {
    socket?.on("ice-candidate", (data) => {
      if (data.candidate) {
        const candidate = new RTCIceCandidate(data.candidate);
        peerservice.peer
          .addIceCandidate(candidate)
          .then(() => {
            console.log("Added ICE candidate:", candidate);
          })
          .catch((error) => {
            console.error("Error adding ICE candidate:", error);
          });
      }
    });

    return () => {
      socket?.off("ice-candidate");
    };
  }, [socket]);

  // Handle stay connected responses
  useEffect(() => {
    socket?.on(
      "stay:connected:response",
      ({ wantToStay, from }: { wantToStay: boolean; from: string }) => {
        setPartnerWantsToStay(wantToStay);

        if (myStayResponse === true && wantToStay === true) {
          // Both want to stay connected - add as friends
          const success = addFriend({
            id: from,
            name: partnerName,
            avatar: `https://images.pexels.com/photos/${Math.floor(Math.random() * 1000000)}/pexels-photo.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop`,
            isOnline: true,
          });

          if (success) {
            alert(
              `🎉 You and ${partnerName} are now friends! You can find them in your Friends list.`,
            );
          } else {
            alert(
              `❌ Couldn't add ${partnerName} as friend. You've reached the free limit of 3 friends. Upgrade to Premium for unlimited friends!`,
            );
            setShowPaywall(true);
          }

          setShowStayConnected(false);
          handleSkip();
        } else if (myStayResponse !== null) {
          // One or both don't want to stay connected
          setShowStayConnected(false);
          handleSkip();
        }
      },
    );

    socket?.on(
      "stay:connected:request",
      ({ wantToStay, from }: { wantToStay: boolean; from: string }) => {
        if (wantToStay) {
          setShowStayConnected(true);
        }
      },
    );

    return () => {
      socket?.off("stay:connected:response");
      socket?.off("stay:connected:request");
    };
  }, [socket, myStayResponse, partnerName, addFriend, handleSkip]);

  useEffect(() => {
    socket?.on("user:connect", handleUserJoined);
    socket?.on("offer", handleIncommingOffer);
    socket?.on("answer", handleIncommingAnswer);
    socket?.on("peer:nego:needed", handleNegotiationIncomming);
    socket?.on("peer:nego:final", handleNegotiationFinal);
    socket?.on("partnerDisconnected", userDisConnected);

    socket?.on(
      "partner:premium:status",
      ({ isPremium }: { isPremium: boolean }) => {
        setPartnerPremium(isPremium);
      },
    );

    return () => {
      socket?.off("user:connect", handleUserJoined);
      socket?.off("offer", handleIncommingOffer);
      socket?.off("answer", handleIncommingAnswer);
      socket?.off("peer:nego:needed", handleNegotiationIncomming);
      socket?.off("peer:nego:final", handleNegotiationFinal);
      socket?.off("partnerDisconnected", userDisConnected);
      socket?.off("partner:premium:status");
    };
  }, [
    handleIncommingAnswer,
    handleIncommingOffer,
    handleNegotiationFinal,
    handleNegotiationIncomming,
    handleUserJoined,
    socket,
    userDisConnected,
  ]);

  useEffect(() => {
    if (remoteChatToken && socket) {
      socket.emit("send:premium:status", {
        isPremium,
        targetChatToken: remoteChatToken,
      });
    }
  }, [isPremium, remoteChatToken, socket]);

  const handleCleanup = useCallback(() => {
    try {
      if (myStream) {
        myStream.getTracks().forEach((track) => {
          track.stop();
        });
        setMyStream(null);
      }

      if (screenStream) {
        screenStream.getTracks().forEach((track) => {
          track.stop();
        });
        setScreenStream(null);
        setIsScreenSharing(false);
      }

      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => {
          track.stop();
        });
        setRemoteStream(null);
      }

      if (peerservice.peer && peerservice.peer.signalingState !== "closed") {
        peerservice.peer.close();
        peerservice.initPeer();
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    } finally {
      navigate("/");
    }
  }, [myStream, navigate, screenStream, remoteStream]);

  const handleReport = (reason: string) => {
    const count =
      Number(
        localStorage.getItem(`ajnabicam_reports_${remoteChatToken}`) || 0,
      ) + 1;
    localStorage.setItem(`ajnabicam_reports_${remoteChatToken}`, String(count));
    setReportSubmitted(true);
    setShowReport(false);
    setShowReportEnd(false);

    if (count >= 20) {
      localStorage.setItem(
        "ajnabicam_suspend_until",
        String(Date.now() + 24 * 60 * 60 * 1000),
      );
      setSuspended(true);
    }

    if (count < 20) {
      alert(
        "You have been reported. Please follow decency guidelines or your account may be suspended.",
      );
    }
    setTimeout(() => setReportSubmitted(false), 2000);
  };

  const handleBlock = () => {
    if (remoteChatToken) {
      let blocked = JSON.parse(
        localStorage.getItem("ajnabicam_blocked") || "[]",
      );
      if (!blocked.includes(remoteChatToken)) {
        blocked.push(remoteChatToken);
        localStorage.setItem("ajnabicam_blocked", JSON.stringify(blocked));
      }
      setBlockSubmitted(true);
      setShowBlock(false);
      setTimeout(() => setBlockSubmitted(false), 2000);
    }
  };

  useEffect(() => {
    const blocked = JSON.parse(
      localStorage.getItem("ajnabicam_blocked") || "[]",
    );
    if (blocked.includes(remoteChatToken)) {
      alert(
        "You have blocked this user. You will not be matched with them again.",
      );
      handleSkip();
    }
  }, [remoteChatToken, handleSkip]);

  useEffect(() => {
    const suspendUntil = localStorage.getItem("ajnabicam_suspend_until");
    if (suspendUntil && Date.now() < Number(suspendUntil)) {
      setSuspended(true);
    }
  }, []);

  if (suspended) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="bg-rose-100 border border-rose-300 rounded-2xl p-8 shadow-xl flex flex-col items-center">
          <h2 className="text-2xl font-bold text-rose-600 mb-4">
            Account Suspended
          </h2>
          <p className="text-rose-500 text-center mb-4">
            Your account has been suspended for 24 hours due to excessive
            amounts of reports.
          </p>
          <p className="text-xs text-rose-400">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl mx-auto bg-white flex flex-col items-center justify-between overflow-y-auto">
      {/* Enhanced Top Bar */}
      <div className="w-full bg-white shadow-sm px-3 sm:px-4 lg:px-6 py-3 sm:py-4 z-20 border-b border-primary-100">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="rounded-full p-2 hover:bg-primary-50"
            onClick={handleCleanup}
          >
            <ArrowLeft size={22} className="text-primary-500" />
          </Button>

          <div className="flex-1 flex justify-center">
            <div className="text-center">
              <span className="font-bold text-xl text-primary-600 tracking-wide block">
                AjnabiCam
              </span>
              {isFriendCall && (
                <span className="text-xs text-mehendi-600 font-medium">
                  Friend Call
                </span>
              )}
            </div>
          </div>

          <Button
            onClick={() => setShowTreasureChest(true)}
            disabled={coinsLoading}
            className="bg-gradient-to-r from-gold-500 to-secondary-600 hover:from-gold-600 hover:to-secondary-700 text-white font-semibold px-3 py-2 rounded-full shadow-md"
          >
            <Coins className="h-4 w-4 mr-1" />
            {coinsLoading ? "..." : coins}
          </Button>
        </div>
      </div>

      {/* Timer - only show for non-friend calls */}
      {!isFriendCall && (
        <div className="w-full px-4 py-2">
          <ChatTimer
            isPremium={isPremium}
            isConnected={remoteChatToken !== null}
            partnerPremium={partnerPremium}
            onTimeUp={handleTimeUp}
            onUpgrade={handleUpgrade}
          />
        </div>
      )}

      {/* Video Streams */}
      <div className="flex-1 flex flex-col items-center justify-start w-full px-2 pb-32 pt-2 relative">
        <div className="w-full h-[65vh] rounded-3xl shadow-2xl bg-gradient-to-br from-primary-100 via-accent-50 to-secondary-100 overflow-hidden relative border-2 border-primary-200/50 flex items-center justify-center">
          {remoteStream ? (
            isVoiceOnly ? (
              <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-premium-400 to-secondary-400">
                <div className="text-7xl mb-2">🎙️</div>
                <p className="text-white text-lg font-semibold drop-shadow">
                  {partnerName}'s Voice
                </p>
                {isFriendCall && (
                  <div className="mt-2 bg-mehendi-500 px-3 py-1 rounded-full">
                    <span className="text-white text-sm font-bold">Friend</span>
                  </div>
                )}
              </div>
            ) : (
              <ReactPlayer
                className="w-full h-full object-cover"
                url={remoteStream}
                playing
                muted={false}
                width="100%"
                height="100%"
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-primary-100 to-accent-100">
              <ClipLoader color={loaderColor} size={40} />
              <p className="text-neutral-600 mt-3 text-sm font-medium">
                {isSearchingForMatch
                  ? "🔍 Finding your perfect match..."
                  : isFriendCall
                    ? `📞 Calling ${partnerName}...`
                    : "��� Waiting for connection..."}
              </p>
              {isSearchingForMatch && (
                <div className="mt-4 flex flex-col items-center">
                  <div className="flex space-x-1 mb-2">
                    <div
                      className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-accent-500 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-premium-500 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                  <p className="text-xs text-neutral-500 text-center px-4">
                    Finding someone special just for you...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* My stream as PiP */}
          {myStream && !isVoiceOnly && (
            <div className="absolute bottom-4 right-4 w-20 h-32 bg-gradient-to-br from-primary-200/90 via-accent-100/90 to-secondary-200/90 backdrop-blur-sm rounded-xl shadow-lg border-2 border-primary-300/50 z-30 flex items-center justify-center">
              <ReactPlayer
                className="w-full h-full object-cover rounded-xl"
                url={myStream}
                playing
                muted
                width="100%"
                height="100%"
              />
            </div>
          )}

          {/* Friend indicator overlay */}
          {isFriendCall && remoteStream && (
            <div className="absolute top-4 left-4 bg-mehendi-500 px-3 py-1 rounded-full z-30">
              <span className="text-white text-sm font-bold">
                👥 Friend Call
              </span>
            </div>
          )}
        </div>

        {/* Voice only card */}
        {myStream && isVoiceOnly && (
          <div className="w-full h-24 rounded-3xl shadow-2xl bg-gradient-to-br from-premium-400 to-primary-400 overflow-hidden relative border border-primary-100 mt-4 flex flex-col items-center justify-center">
            <div className="text-4xl mb-1">🎙️</div>
            <p className="text-white text-sm font-semibold drop-shadow">
              Your Voice
            </p>
            {isPremium && (
              <div className="flex items-center gap-1 bg-gold-400 px-2 py-1 rounded-full text-xs font-bold text-white mt-1">
                <Crown className="h-3 w-3" /> PREMIUM
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="fixed bottom-0 left-0 w-full z-40 flex flex-col items-center pb-4 max-w-md mx-auto">
        <div className="w-full flex flex-row justify-center items-center gap-2 bg-white rounded-2xl shadow-2xl px-3 py-2 border border-primary-100">
          <Button
            className="flex-1 mx-1 p-3 bg-primary-500 text-white rounded-xl text-lg font-bold shadow-md"
            onClick={handleSkip}
            disabled={remoteChatToken === null}
          >
            <SkipForward size={22} />
            <span className="ml-2">{isFriendCall ? "End" : "Skip"}</span>
          </Button>

          <Button
            className={`flex-1 mx-1 p-3 rounded-xl text-lg font-bold shadow-md flex items-center justify-center ${
              isCameraOn
                ? "bg-gray-200 text-primary-500"
                : "bg-primary-500 text-white"
            }`}
            onClick={toggleCamera}
          >
            {isCameraOn ? <Video size={22} /> : <VideoOff size={22} />}
          </Button>

          <Button
            className={`flex-1 mx-1 p-3 rounded-xl text-lg font-bold shadow-md flex items-center justify-center ${
              isMicOn ? "bg-gray-200 text-primary-500" : "bg-primary-500 text-white"
            }`}
            onClick={toggleMic}
          >
            {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
          </Button>

          <Button
            className="flex-1 mx-1 p-3 bg-secondary-500 text-white rounded-xl text-lg font-bold shadow-md"
            onClick={handleScreenShare}
          >
            <ScreenShare size={22} />
          </Button>
        </div>

        {/* Premium Voice-Only Toggle */}
        {isPremium && remoteChatToken && (
          <div className="w-full flex justify-center mt-2">
            <Button
              className={`px-6 py-2 rounded-xl font-semibold shadow-md ${
                isVoiceOnly
                  ? "bg-premium-500 text-white"
                  : "bg-white text-premium-500 border border-premium-300"
              }`}
              onClick={toggleVoiceOnlyMode}
            >
              <Phone className="h-4 w-4 mr-2" />
              {isVoiceOnly ? "Switch to Video" : "Voice Only"}
            </Button>
          </div>
        )}

        {!isFriendCall && (
          <div className="w-full flex flex-row justify-center gap-2 mt-2">
            <Button
              className="bg-neutral-100 text-neutral-700 font-semibold rounded-xl px-6 py-2"
              onClick={() => setShowBlock(true)}
            >
              Block
            </Button>
            <Button
              className="bg-primary-100 text-primary-700 font-semibold rounded-xl px-6 py-2"
              onClick={() => setShowReport(true)}
            >
              Report
            </Button>
          </div>
        )}
      </div>

      {/* Friend Notification */}
      {friendNotification.show && (
        <FriendNotification
          friendName={friendNotification.friendName}
          onCall={() => handleFriendCall(friendNotification.friendId)}
          onDismiss={() =>
            setFriendNotification({ show: false, friendName: "", friendId: "" })
          }
        />
      )}

      {/* Modals */}
      <PremiumPaywall
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchase={handlePremiumPurchase}
      />

      <TreasureChest
        isOpen={showTreasureChest}
        onClose={() => setShowTreasureChest(false)}
      />

      <StayConnectedModal
        isOpen={showStayConnected}
        onClose={() => setShowStayConnected(false)}
        onStayConnected={handleStayConnected}
        partnerName={partnerName}
      />

      <ReportUserModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        onSubmit={handleReport}
      />
      <ReportUserModal
        isOpen={showReportEnd}
        onClose={() => setShowReportEnd(false)}
        onSubmit={handleReport}
      />
      <BlockUserModal
        isOpen={showBlock}
        onClose={() => setShowBlock(false)}
        onBlock={handleBlock}
      />

      {/* Toast notifications */}
      {reportSubmitted && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-mehendi-100 text-mehendi-700 px-4 py-2 rounded-full shadow-lg z-50">
          Thank you for your report.
        </div>
      )}
      {blockSubmitted && (
        <div className="fixed bottom-40 left-1/2 -translate-x-1/2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full shadow-lg z-50">
          User blocked. You won't be matched again.
        </div>
      )}
    </div>
  );
}
