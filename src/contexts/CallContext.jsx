import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { socketService } from '../services/socketService';
import { useUserStore } from '../stores/userStore';
import { userService } from '../services/userService';
import { messageService } from '../services/messageService';

const CallContext = createContext(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within a CallProvider');
  return context;
};

export const CallProvider = ({ children }) => {
  const currentUser = useUserStore((s) => s.user);

  // States
  const [callState, setCallState] = useState('idle'); // idle, incoming, outgoing, connected, group-connected
  const [activeCall, setActiveCall] = useState(null); // { isGroup, conversationId, type, from/to, name, avatar }

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null); // Single 1-1
  const [remoteStreams, setRemoteStreams] = useState({}); // Group { [userId]: stream }
  const [participants, setParticipants] = useState({}); // Group { [userId]: {name, avatarUrl} }
  const [participantCameraOff, setParticipantCameraOff] = useState({}); // { [userId]: boolean }

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const callStateRef = useRef(callState);
  const activeCallRef = useRef(activeCall);
  const connectedAtRef = useRef(null);

  // WebRTC Refs
  const localStreamRef = useRef(null);

  // 1-to-1 Refs
  const peerConnectionRef = useRef(null);
  const remoteIceCandidatesQueue = useRef([]);

  // Group Refs
  const peerConnectionsRef = useRef({}); // { [userId]: RTCPeerConnection }
  const groupIceQueuesRef = useRef({}); // { [userId]: candidate[] }

  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

  const cleanStreams = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteStreams({});
    setParticipants({});
    setParticipantCameraOff({});
  };

  const closeConnections = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    groupIceQueuesRef.current = {};
    remoteIceCandidatesQueue.current = [];
  };

  const resetCallState = (options = { avoidLogging: false }) => {
    const currentState = callStateRef.current;
    const callData = activeCallRef.current;

    if (!options.avoidLogging && callData) {
      if (!callData.isGroup) {
        if (callData.isCaller && currentState === 'outgoing') {
          messageService.send(callData.conversationId, { content: '📞 Cuộc gọi nhỡ' }).catch(console.error);
        } else if (callData.isCaller && currentState === 'connected' && connectedAtRef.current) {
          const d = Math.floor((Date.now() - connectedAtRef.current) / 1000);
          const text = `${Math.floor(d / 60).toString().padStart(2, '0')}:${(d % 60).toString().padStart(2, '0')}`;
          messageService.send(callData.conversationId, {
            content: `📞 Cuộc gọi ${callData.type === 'video' ? 'video' : 'thoại'} kết thúc (${text})`
          }).catch(console.error);
        }
      } else {
        // For group calls, only the last person standing announces the end, to prevent spam.
        const remainingPeers = Object.keys(peerConnectionsRef.current).length;
        if (remainingPeers === 0 && currentState === 'group-connected' && connectedAtRef.current) {
          const d = Math.floor((Date.now() - connectedAtRef.current) / 1000);
          const text = `${Math.floor(d / 60).toString().padStart(2, '0')}:${(d % 60).toString().padStart(2, '0')}`;
          messageService.send(callData.conversationId, {
            content: `📞 Cuộc gọi nhóm kết thúc (${text})`
          }).catch(console.error);
        }
      }
    }

    closeConnections();
    cleanStreams();
    connectedAtRef.current = null;
    setActiveCall(null);
    setCallState('idle');
    setIsMicMuted(false);
    setIsCameraOff(false);
  };

  const getMediaStream = async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsCameraOff(type === 'audio');
      return stream;
    } catch (e) {
      console.error('Error accessing media', e);
      alert('Could not access camera/mic.');
      return null;
    }
  };

  // ==========================================
  // DIRECT CALL (1-on-1) LOGIC
  // ==========================================
  // Auto-timeout for 1-1
  useEffect(() => {
    let timeout;
    if (callState === 'outgoing' && !activeCallRef.current?.isGroup) {
      timeout = setTimeout(() => {
        if (callStateRef.current === 'outgoing') endCall();
      }, 30000);
    }
    return () => clearTimeout(timeout);
  }, [callState]);

  const initPeerConnection = (otherUserId, conversationId) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
    }
    pc.ontrack = (e) => setRemoteStream(e.streams[0]);
    pc.onicecandidate = (e) => {
      if (e.candidate) socketService.emit('call:ice-candidate', { to: otherUserId, candidate: e.candidate, conversationId });
    };
    peerConnectionRef.current = pc;
    return pc;
  };

  const startCall = async (receiverId, type, existingConvId = null, userInfo = null) => {
    if (callStateRef.current !== 'idle') return;
    const stream = await getMediaStream(type);
    if (!stream) return;

    let convId = existingConvId || ('web-rtc-' + Date.now().toString(36));
    setActiveCall({ to: receiverId, conversationId: convId, type, isCaller: true, name: userInfo?.name, avatar: userInfo?.avatar, isGroup: false });
    setCallState('outgoing');

    const pc = initPeerConnection(receiverId, convId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketService.emit('call:request', { to: receiverId, offer: { type: offer.type, sdp: offer.sdp }, type, conversationId: convId });
    } catch (error) {
      resetCallState({ avoidLogging: true });
    }
  };

  const acceptCall = async () => {
    if (callStateRef.current !== 'incoming' || !activeCallRef.current) return;

    // Group call accept logic
    if (activeCallRef.current.isGroup) {
      joinGroupCall(activeCallRef.current.conversationId, activeCallRef.current.type);
      return;
    }

    setCallState('connected');
    connectedAtRef.current = Date.now();

    const callData = activeCallRef.current;
    const stream = await getMediaStream(callData.type);
    if (!stream) { rejectCall(); return; }

    const pc = initPeerConnection(callData.from, callData.conversationId);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
      while (remoteIceCandidatesQueue.current.length > 0) {
        await pc.addIceCandidate(new RTCIceCandidate(remoteIceCandidatesQueue.current.shift()));
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketService.emit('call:answer', { to: callData.from, answer: { type: answer.type, sdp: answer.sdp }, conversationId: callData.conversationId });
    } catch (error) { resetCallState(); }
  };

  const rejectCall = () => {
    const active = activeCallRef.current;
    if (active && !active.isGroup && callStateRef.current === 'incoming') {
      socketService.emit('call:reject', { to: active.from, conversationId: active.conversationId });
    }
    resetCallState();
  };

  const endCall = () => {
    const active = activeCallRef.current;
    if (active && !active.isGroup) {
      const to = active.isCaller ? active.to : active.from;
      if (to) socketService.emit('call:reject', { to, conversationId: active.conversationId });
    } else if (active && active.isGroup) {
      socketService.emit('group-call:leave', { conversationId: active.conversationId, fromUserId: currentUser?.id });
    }
    resetCallState();
  };

  // ==========================================
  // GROUP CALL MESH LOGIC
  // ==========================================
  const fetchParticipantProfile = async (userId) => {
    try {
      const user = await userService.getPublicProfile(userId);
      if (user) setParticipants(p => ({ ...p, [userId]: { name: user.name, avatar: user.avatarUrl } }));
    } catch (e) { }
  };

  const initGroupPeer = (targetUserId, conversationId) => {
    if (!targetUserId) return null;
    if (peerConnectionsRef.current[targetUserId]) return peerConnectionsRef.current[targetUserId];
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerConnectionsRef.current[targetUserId] = pc;
    groupIceQueuesRef.current[targetUserId] = [];
    fetchParticipantProfile(targetUserId);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
    }

    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({ ...prev, [targetUserId]: event.streams[0] }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('group-call:signal', {
          targetUserId,
          conversationId,
          fromUserId: currentUser?.id,
          payload: { type: 'ice-candidate', candidate: event.candidate }
        });
      }
    };
    return pc;
  };

  const startGroupCall = async (conversationId, type, groupName) => {
    if (callStateRef.current !== 'idle') return;
    const stream = await getMediaStream(type);
    if (!stream) return;

    const newActiveCall = { conversationId, type, isCaller: true, name: groupName, isGroup: true };
    setActiveCall(newActiveCall);
    activeCallRef.current = newActiveCall; // Mutate ref immediately to prevent race conditions

    setCallState('group-connected');
    callStateRef.current = 'group-connected';
    connectedAtRef.current = Date.now();

    // Broadcast ring to everyone
    socketService.emit('group-call:ring', { conversationId, type, fromUserId: currentUser?.id });
    // Tell users we joined so they call us
    socketService.emit('group-call:join', { conversationId, fromUserId: currentUser?.id });
  };

  const joinGroupCall = async (conversationId, type = 'audio') => {
    if (callStateRef.current !== 'idle' && callStateRef.current !== 'incoming') {
      resetCallState({ avoidLogging: true });
    }

    // Default to audio for seamless drop-ins unless specified otherwise
    const stream = await getMediaStream(type);
    if (!stream) return;

    const newActiveCall = { conversationId, type, isCaller: false, name: 'Group Call', isGroup: true };
    setActiveCall(newActiveCall);
    activeCallRef.current = newActiveCall;

    setCallState('group-connected');
    callStateRef.current = 'group-connected';
    connectedAtRef.current = Date.now();

    socketService.emit('group-call:join', { conversationId, fromUserId: currentUser?.id });
  };

  // ==========================================
  // TOGGLES
  // ==========================================
  const toggleMic = () => {
    if (localStreamRef.current) {
      const t = localStreamRef.current.getAudioTracks()[0];
      if (t) { t.enabled = !t.enabled; setIsMicMuted(!t.enabled); }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const t = localStreamRef.current.getVideoTracks()[0];
      if (t) {
        t.enabled = !t.enabled;
        const cameraOff = !t.enabled;
        setIsCameraOff(cameraOff);
        // Signal camera state to other participants
        const active = activeCallRef.current;
        if (active) {
          socketService.emit('call:camera-toggle', {
            conversationId: active.conversationId,
            fromUserId: currentUser?.id,
            isCameraOff: cameraOff
          });
          socketService.emit('group-call:camera-state', {
            conversationId: active.conversationId,
            fromUserId: currentUser?.id,
            cameraOff: cameraOff
          });
        }
      }
    }
  };

  // ==========================================
  // SOCKET LISTENERS
  // ==========================================
  useEffect(() => {
    const offs = [
      // Direct Signaling
      socketService.on('call:incoming', (payload) => {
        if (callStateRef.current !== 'idle') {
          socketService.emit('call:reject', { to: payload.from, conversationId: payload.conversationId });
          return;
        }
        remoteIceCandidatesQueue.current = [];
        setActiveCall({ from: payload.from, offer: payload.offer, type: payload.type, conversationId: payload.conversationId, isCaller: false, isGroup: false });
        setCallState('incoming');
        userService.getPublicProfile(payload.from).then(user => {
          if (user) setActiveCall(prev => prev && prev.from === payload.from ? { ...prev, name: user.name, avatar: user.avatarUrl } : prev);
        }).catch(console.error);
      }),
      socketService.on('call:accepted', async (payload) => {
        const pc = peerConnectionRef.current;
        if (callStateRef.current === 'outgoing' && pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            setCallState('connected');
            connectedAtRef.current = Date.now();
            while (remoteIceCandidatesQueue.current.length > 0) {
              await pc.addIceCandidate(new RTCIceCandidate(remoteIceCandidatesQueue.current.shift()));
            }
          } catch (e) { }
        }
      }),
      socketService.on('call:ice-candidate', async (payload) => {
        if (!payload.candidate) return;
        const pc = peerConnectionRef.current;
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(console.error);
        } else {
          remoteIceCandidatesQueue.current.push(payload.candidate);
        }
      }),
      socketService.on('call:reject', resetCallState),

      // Group Signaling
      socketService.on('group-call:ring', (payload) => {
        // Prevent ringing if we rang ourselves or are already busy
        if (payload.fromUserId === currentUser?.id || callStateRef.current !== 'idle') return;

        setActiveCall({
          conversationId: payload.conversationId,
          type: payload.type,
          isCaller: false,
          isGroup: true,
          name: 'Group Call',
          from: payload.fromUserId
        });
        setCallState('incoming');

        // Try to fetch caller profile
        if (payload.fromUserId) {
          userService.getPublicProfile(payload.fromUserId).then(user => {
            if (user) setActiveCall(prev => prev && prev.isGroup ? { ...prev, avatar: user.avatarUrl } : prev);
          }).catch(() => { });
        }
      }),
      socketService.on('group-call:join', async (payload) => {
        const { conversationId, fromUserId } = payload;
        const currentState = callStateRef.current;
        const currentCall = activeCallRef.current;

        if (!fromUserId) return;
        if (currentState !== 'group-connected' || currentCall?.conversationId !== conversationId) return;
        if (fromUserId === currentUser?.id) return;

        const pc = initGroupPeer(fromUserId, conversationId);
        if (!pc) return;
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketService.emit('group-call:signal', {
            targetUserId: fromUserId,
            conversationId,
            fromUserId: currentUser?.id,
            payload: { type: 'offer', sdp: offer.sdp }
          });
        } catch (e) { console.error("Mesh Offer Error", e); }
      }),
      socketService.on('group-call:signal', async (payload) => {
        // Because BE broadcasts to room, make sure we only process if targetUserId matches us
        const targetUserId = payload.targetUserId || payload.to;
        if (!targetUserId || targetUserId !== currentUser?.id) return;

        const { fromUserId, conversationId, payload: signal } = payload;
        if (!fromUserId) return;
        if (callStateRef.current !== 'group-connected' || activeCallRef.current?.conversationId !== conversationId) return;

        const pc = initGroupPeer(fromUserId, conversationId);
        if (!pc) return;

        try {
          if (signal.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketService.emit('group-call:signal', {
              targetUserId: fromUserId,
              conversationId,
              fromUserId: currentUser?.id,
              payload: { type: 'answer', sdp: answer.sdp }
            });
            let queue = groupIceQueuesRef.current[fromUserId] || [];
            while (queue.length > 0) { await pc.addIceCandidate(new RTCIceCandidate(queue.shift())); }
          } else if (signal.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            let queue = groupIceQueuesRef.current[fromUserId] || [];
            while (queue.length > 0) { await pc.addIceCandidate(new RTCIceCandidate(queue.shift())); }
          } else if (signal.type === 'ice-candidate') {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } else {
              groupIceQueuesRef.current[fromUserId] = groupIceQueuesRef.current[fromUserId] || [];
              groupIceQueuesRef.current[fromUserId].push(signal.candidate);
            }
          }
        } catch (e) { console.error("Signal specific error", e); }
      }),
      socketService.on('group-call:leave', (payload) => {
        const { fromUserId } = payload;
        if (!fromUserId) return;

        // Cancel ringing if the caller gave up
        if (callStateRef.current === 'incoming' && activeCallRef.current?.from === fromUserId) {
          resetCallState();
          return;
        }

        if (peerConnectionsRef.current[fromUserId]) {
          peerConnectionsRef.current[fromUserId].close();
          delete peerConnectionsRef.current[fromUserId];
          setRemoteStreams(prev => { const n = { ...prev }; delete n[fromUserId]; return n; });
          setParticipants(prev => { const n = { ...prev }; delete n[fromUserId]; return n; });
          setParticipantCameraOff(prev => { const n = { ...prev }; delete n[fromUserId]; return n; });

          // Auto disconnect if we are the only one left in the room
          if (Object.keys(peerConnectionsRef.current).length === 0 && callStateRef.current === 'group-connected') {
            endCall();
          }
        }
      }),
      socketService.on('call:camera-toggle', (payload) => {
        const { fromUserId, isCameraOff: cameraOff } = payload;
        if (!fromUserId || fromUserId === currentUser?.id) return;
        setParticipantCameraOff(prev => ({ ...prev, [fromUserId]: cameraOff }));
      }),
      socketService.on('group-call:camera-state', (payload) => {
        const { fromUserId, cameraOff } = payload;
        if (!fromUserId || fromUserId === currentUser?.id) return;
        setParticipantCameraOff(prev => ({ ...prev, [fromUserId]: !!cameraOff }));
      })
    ];
    return () => offs.forEach(off => off?.());
  }, [currentUser?.id]);

  return (
    <CallContext.Provider value={{
      callState, activeCall, localStream, remoteStream, remoteStreams, participants, participantCameraOff,
      isMicMuted, isCameraOff,
      startCall, acceptCall, rejectCall, endCall,
      startGroupCall, joinGroupCall,
      toggleMic, toggleCamera
    }}>
      {children}
    </CallContext.Provider>
  );
};
