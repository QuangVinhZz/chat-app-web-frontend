import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PhoneCall, Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useCall } from '../contexts/CallContext';
import { useUserStore } from '../stores/userStore';
import { Button } from './ui/Button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';
import { getInitials } from '../utils/format';
import { cn } from '../utils/cn';

const RemoteParticipant = ({ stream, participant, remoteCameraOff }) => {
  const ref = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);

  const checkVideo = useCallback(() => {
    if (!stream) { setHasVideo(false); return; }
    const videoTrack = stream.getVideoTracks()[0];
    const trackActive = !!videoTrack && videoTrack.enabled && !videoTrack.muted && videoTrack.readyState === 'live';
    setHasVideo(trackActive);
  }, [stream]);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      const attemptPlay = () => {
        ref.current?.play().catch(e => console.warn("AutoPlay blocked:", e));
      };
      attemptPlay();
      ref.current.onloadedmetadata = attemptPlay;
      
      checkVideo();
      
      // Listen for track changes (e.g., user toggles camera on/off)
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onmute = checkVideo;
        videoTrack.onunmute = checkVideo;
        videoTrack.onended = checkVideo;
      }

      // Also poll periodically to catch enabled/disabled changes not covered by events
      const pollInterval = setInterval(checkVideo, 1000);
      return () => clearInterval(pollInterval);
    } else {
      setHasVideo(false);
    }
  }, [stream, checkVideo]);

  // Use participant.avatar (matches CallContext data shape)
  const avatarUrl = participant?.avatar || participant?.avatarUrl;
  // Camera is considered off if we got explicit signal OR track-level detection says no video
  const showAvatar = remoteCameraOff || !hasVideo;

  return (
    <div className="relative w-full h-full bg-gray-900 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center">
      <video
        ref={ref}
        autoPlay
        playsInline
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
          !showAvatar ? "opacity-100" : "opacity-0"
        )}
      />
      {/* Fallback avatar overlay for Audio calls or if video is off */}
      <div className={cn(
        "absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-300 bg-gray-900 border-2 border-transparent",
        showAvatar ? "opacity-100 z-10" : "opacity-0 -z-10"
      )}>
        <Avatar className="w-20 h-20 mb-3 border-2 border-white/20 shadow-xl">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {getInitials(participant?.name || 'User')}
          </AvatarFallback>
        </Avatar>
        <span className="text-white text-sm font-semibold bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
          {participant?.name || 'Unknown'}
        </span>
      </div>
      
      {/* Floating name badge if video is active */}
      {!showAvatar && participant?.name && (
        <div className="absolute bottom-3 left-3 z-20 bg-black/50 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
          {participant.name}
        </div>
      )}
    </div>
  );
};

export default function CallOverlay() {
  const {
    callState,
    activeCall,
    localStream,
    remoteStream,
    remoteStreams,
    participants,
    participantCameraOff,
    isMicMuted,
    isCameraOff,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCamera,
  } = useCall();

  const currentUser = useUserStore((s) => s.user);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  const [durationText, setDurationText] = useState('');

  // Update call duration timer
  useEffect(() => {
    let interval;
    if (callState === 'connected' || callState === 'group-connected') {
      const start = Date.now();
      const tick = () => {
        const seconds = Math.floor((Date.now() - start) / 1000);
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        setDurationText(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      };
      tick();
      interval = setInterval(tick, 1000);
    } else {
      setDurationText('');
    }
    return () => clearInterval(interval);
  }, [callState]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  if (callState === 'idle') {
    return null;
  }

  // Incoming Call ringing screen
  if (callState === 'incoming') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-card p-8 rounded-3xl shadow-2xl flex flex-col items-center min-w-[320px] border border-border">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping scale-150" />
            <div className="relative z-10">
              {activeCall?.avatar || activeCall?.name ? (
                <Avatar className="w-24 h-24 border-4 border-card shadow-lg">
                  <AvatarImage src={activeCall.avatar} />
                  <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                    {getInitials(activeCall.name || '?')}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-4 border-card shadow-lg">
                  <PhoneCall className="w-10 h-10 text-primary animate-bounce" />
                </div>
              )}
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2 text-foreground">
              {activeCall?.name || 'Someone'}
            </h2>
            <p className="text-muted-foreground bg-muted inline-block px-4 py-1 rounded-full text-sm font-medium">
              Incoming {activeCall?.type === 'video' ? 'Video' : 'Audio'} Call...
            </p>
          </div>
          <div className="flex gap-4 w-full">
            <Button
              variant="destructive"
              className="flex-1 py-6 text-lg rounded-xl"
              onClick={rejectCall}
            >
              <PhoneOff className="w-5 h-5 mr-2" />
              Reject
            </Button>
            <Button
              className="flex-1 py-6 text-lg bg-green-600 hover:bg-green-700 rounded-xl"
              onClick={acceptCall}
            >
              <Phone className="w-5 h-5 mr-2" />
              Accept
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Determine if group call mode
  const isGroup = activeCall?.isGroup;
  const isAudioCall = activeCall?.type === 'audio';

  const remoteStreamsList = Object.entries(remoteStreams);
  const participantCount = remoteStreamsList.length;

  const getGridClass = (count) => {
    if (count === 0) return "flex items-center justify-center";
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 md:grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-3 md:grid-cols-4";
  };

  // Active or Outgoing Call Screen
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex-1 relative flex items-center justify-center overflow-hidden p-4">
        {/* Call Duration Overlay (Top) */}
        {(callState === 'connected' || callState === 'group-connected') && durationText && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 bg-black/50 px-5 py-2 rounded-full backdrop-blur-md text-white font-mono text-xl font-bold tracking-widest shadow-lg border border-white/10">
            {durationText}
          </div>
        )}

        {isGroup ? (
          /* Multi-User Grid */
          <div className={cn("w-full h-full grid gap-4 max-w-7xl mx-auto", getGridClass(participantCount))}>
             {participantCount === 0 ? (
                <div className="text-white text-xl animate-pulse flex flex-col items-center">
                  <div className="w-24 h-24 mb-6 rounded-full bg-primary/20 flex flex-col items-center justify-center animate-bounce border-2 border-primary/50 shadow-xl">
                      <PhoneCall className="w-10 h-10 text-primary" />
                  </div>
                  <p>Waiting for others to join...</p>
                </div>
             ) : (
                remoteStreamsList.map(([userId, stream]) => (
                  <RemoteParticipant
                     key={userId}
                     stream={stream}
                     isAudioCall={isAudioCall}
                     participant={participants[userId]}
                     remoteCameraOff={!!participantCameraOff[userId]}
                  />
                ))
             )}
          </div>
        ) : (
          /* 1-to-1 Full Screen */
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={cn(
                "absolute inset-0 w-full h-full object-cover",
                (!remoteStream || isAudioCall || (activeCall?.from && participantCameraOff[activeCall.from]) || (activeCall?.to && participantCameraOff[activeCall.to])) ? "opacity-0" : "opacity-100"
              )}
            />

            {/* Avatar Display for Audio Calls, Loading State, or Remote Camera Off */}
            {(!remoteStream || isAudioCall || (activeCall?.from && participantCameraOff[activeCall.from]) || (activeCall?.to && participantCameraOff[activeCall.to])) && (
              <div className="text-white flex flex-col items-center z-10 drop-shadow-lg">
                {activeCall?.avatar || activeCall?.name ? (
                  <Avatar className="w-32 h-32 mb-6 border-4 border-white/20 shadow-2xl animate-pulse">
                    <AvatarImage src={activeCall.avatar} />
                    <AvatarFallback className="text-4xl bg-primary text-primary-foreground">
                      {getInitials(activeCall.name || '?')}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center animate-pulse mb-6 border-4 border-white/20">
                      <PhoneCall className="w-12 h-12 text-white" />
                  </div>
                )}
                <h2 className="text-3xl font-bold mb-3 drop-shadow-md">
                  {activeCall?.name || 'Unknown User'}
                </h2>
                {callState !== 'connected' && (
                  <p className="text-xl text-white/80 tracking-wide font-medium">
                    {callState === 'outgoing' ? 'Calling...' : 'Connecting...'}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Local Video (PiP) */}
        {localStream && (
          <div className={cn(
            "absolute bottom-20 right-6 z-10 w-32 md:w-48 aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 transition-all",
            isAudioCall ? "hidden" : "block",
            isGroup ? "md:bottom-6 md:right-6" : ""
          )}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "w-full h-full object-cover rounded-lg transition-opacity duration-300",
                isCameraOff ? "opacity-0" : "opacity-100"
              )}
            />
            {/* Local avatar overlay when camera is off */}
            {isCameraOff && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
                <Avatar className="w-12 h-12 border-2 border-white/20 shadow-lg">
                  <AvatarImage src={currentUser?.avatarUrl} />
                  <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                    {getInitials(currentUser?.name || 'Me')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white text-xs mt-1 font-medium">You</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="h-24 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-center gap-6 px-4 pb-4">
        <Button
          variant="secondary"
          size="icon"
          className={cn("w-14 h-14 rounded-full", isMicMuted && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
          onClick={toggleMic}
        >
          {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>

        {!isAudioCall && (
          <Button
            variant="secondary"
            size="icon"
            className={cn("w-14 h-14 rounded-full", isCameraOff && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
            onClick={toggleCamera}
          >
            {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </Button>
        )}

        <Button
          variant="destructive"
          size="icon"
          className="w-16 h-16 rounded-full"
          onClick={endCall}
        >
          <PhoneOff className="w-8 h-8" />
        </Button>
      </div>
    </div>
  );
}
