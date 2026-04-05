import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text, Platform, Alert, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import Svg, { G, Circle, Path } from 'react-native-svg';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS, SharedValue } from 'react-native-reanimated';
import { useProject } from '../../contexts/ProjectContext';
import { DeviceNode, getChannelLayout, getNodeWidth, getNodeHeight } from '../../components/DeviceNode';
import { DeviceModal } from '../../components/DeviceModal';
import { Device } from '../../models';
import { Plus, Maximize, Minimize, RefreshCcw, Trash2, Share2, Layers, X } from 'lucide-react-native';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedSvg = Animated.createAnimatedComponent(Svg);
import ViewShot, { captureRef } from 'react-native-view-shot';
import { ExportService } from '../../services/ExportService';
import { 
  Point, 
  Obstacle, 
  getOrthogonalPoints, 
  pointsToRoundedPath, 
  distToSegments, 
  snap,
  ROUTE_MARGIN,
  LINE_SPACING,
  OBSTACLE_PADDING
} from '../../utils/routing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DiagramScreen() {
  const { project, updateDevice, addDevice, addConnection, deleteConnection, deleteDevice } = useProject();
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [isDeviceModalVisible, setIsDeviceModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | undefined>(undefined);
  const [canvasSize, setCanvasSize] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
  const [activeConnection, setActiveConnection] = useState<{
    startDeviceId: string;
    startChannelId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const vpX = useSharedValue(0);
  const vpY = useSharedValue(0);
  const vpScale = useSharedValue(1);
  const panCtx = useSharedValue({ x: 0, y: 0 });
  const scaleCtx = useSharedValue(1);
  const didPan = useSharedValue(false);
  const canvasOffsetX = useSharedValue(0);
  const canvasOffsetY = useSharedValue(0);

  const canvasContainerRef = useRef<View>(null);
  const viewShotRef = useRef<View>(null);

  const handleExportDiagram = async () => {
    try {
      if (Platform.OS === 'web') {
        // captureRef/react-native-view-shot is often broken on web in many expo versions
        window.alert('Web Export: Please use the browser Print (Cmd/Ctrl+P) or a screenshot tool for now. We are working on a better web export.');
        return;
      }
      
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile'
      });
      await ExportService.shareDiagramImage(uri, project.name);
    } catch (err) {
      console.error('Failed to capture diagram:', err);
      if (Platform.OS === 'web') {
        window.alert('Export Error: Web environment does not support direct diagram capture yet.');
      } else {
        Alert.alert('Export Error', 'Could not capture diagram image.');
      }
    }
  };

  const canvasAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: vpX.value },
        { translateY: vpY.value },
        { scale: vpScale.value },
      ] as any,
      transformOrigin: '0 0',
    };
  });

  const svgAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: vpX.value },
        { translateY: vpY.value },
        { scale: vpScale.value },
      ] as any,
      transformOrigin: '0 0',
    };
  });

  const svgSize = useMemo(() => {
    let maxX = canvasSize.width;
    let maxY = canvasSize.height;
    project.devices.forEach(d => {
      maxX = Math.max(maxX, (d.position?.x ?? 0) + 600);
      maxY = Math.max(maxY, (d.position?.y ?? 0) + 600);
    });
    // Cap size to prevent massive memory allocation
    return { width: Math.min(maxX, 4000), height: Math.min(maxY, 4000) };
  }, [project.devices, canvasSize]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = canvasContainerRef.current as any;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = (el as HTMLElement).getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const newScale = Math.max(0.15, Math.min(3, vpScale.value * factor));
      const ratio = newScale / vpScale.value;
      vpX.value = mouseX - (mouseX - vpX.value) * ratio;
      vpY.value = mouseY - (mouseY - vpY.value) * ratio;
      vpScale.value = newScale;
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const handleDeleteDevice = (id: string) => {
    if (Platform.OS === 'web') {
      if (confirm("Delete this device and all its connections?")) deleteDevice(id);
    } else {
      Alert.alert("Delete Device", "Delete this device and all its connections?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteDevice(id) }
      ]);
    }
  };

  const handleSelectDevice = (device: Device) => {
    setEditingDevice(device);
    setIsDeviceModalVisible(true);
  };

  const handleAddDevice = () => {
    setEditingDevice(undefined);
    setIsDeviceModalVisible(true);
  };

  const handleSaveDevice = (deviceData: Omit<Device, 'id'> | Device) => {
    if ('id' in deviceData) {
      updateDevice(deviceData.id, deviceData);
    } else {
      addDevice(deviceData);
    }
    setIsDeviceModalVisible(false);
  };

  const handlePositionChange = useCallback((id: string, x: number, y: number) => {
    const device = project.devices.find(d => d.id === id);
    if (!device) return;
    
    const dx = x - (device.position?.x ?? 0);
    const dy = y - (device.position?.y ?? 0);

    if (selectedDeviceIds.includes(id)) {
      // Move all selected devices
      selectedDeviceIds.forEach(sid => {
        const d = project.devices.find(dev => dev.id === sid);
        if (d) {
          updateDevice(sid, { 
            position: { 
              x: snap((d.position?.x ?? 0) + dx), 
              y: snap((d.position?.y ?? 0) + dy) 
            } 
          });
        }
      });
    } else {
      // Move only this device
      updateDevice(id, { position: { x: snap(x), y: snap(y) } });
    }
  }, [updateDevice, project.devices, selectedDeviceIds]);

  const handleToggleDeviceSelection = (id: string) => {
    setSelectedDeviceIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleStackSelected = () => {
    if (selectedDeviceIds.length < 2) return;
    
    // Stack in selection order
    const devsToStack = selectedDeviceIds
      .map(id => project.devices.find(d => d.id === id))
      .filter(Boolean) as Device[];

    if (devsToStack.length < 2) return;

    const first = devsToStack[0];
    let currentY = (first.position?.y ?? 0) + getNodeHeight(first) + 4;
    const stackX = first.position?.x ?? 0;

    for (let i = 1; i < devsToStack.length; i++) {
      const d = devsToStack[i];
      updateDevice(d.id, { position: { x: snap(stackX), y: snap(currentY) } });
      currentY += getNodeHeight(d) + 4;
    }
  };

  const handleStartConnection = (deviceId: string, channelId: string, x: number, y: number) => {
    setActiveConnection({ startDeviceId: deviceId, startChannelId: channelId, startX: x, startY: y, currentX: x, currentY: y });
  };

  const handleUpdateConnection = (x: number, y: number) => {
    setActiveConnection(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
  };

  const handleEndConnection = (sourceDeviceId: string, sourceChannelId: string, x: number, y: number) => {
    const targetDevice = project.devices.find(d => {
      if (d.id === sourceDeviceId) return false;
      const dx = x - (d.position?.x ?? 0);
      const dy = y - (d.position?.y ?? 0);
      const nw = getNodeWidth(d);
      const nh = getNodeHeight(d);
      return dx >= -15 && dx <= nw + 15 && dy >= -15 && dy <= nh + 15;
    });

    if (targetDevice && targetDevice.inputChannels.length > 0) {
      const layout = getChannelLayout(targetDevice);
      const dy = y - (targetDevice.position?.y ?? 0);
      let closestChannelId = targetDevice.inputChannels[0].id;
      let minDist = Infinity;
      targetDevice.inputChannels.forEach(c => {
        const channelY = layout[c.id]?.y ?? 0;
        const dist = Math.abs(dy - channelY);
        if (dist < minDist) { minDist = dist; closestChannelId = c.id; }
      });
      addConnection({ sourceDeviceId, sourceChannelId, destinationDeviceId: targetDevice.id, destinationChannelId: closestChannelId });
    }
    setActiveConnection(null);
  };

  const handleCancelConnection = () => setActiveConnection(null);

  const handleAutoLayout = () => {
    const outEdges: Record<string, Set<string>> = {};
    const inDeg: Record<string, number> = {};

    project.devices.forEach(d => {
      outEdges[d.id] = new Set();
      inDeg[d.id] = 0;
    });

    project.connections.forEach(c => {
      if (outEdges[c.sourceDeviceId] && !outEdges[c.sourceDeviceId].has(c.destinationDeviceId)) {
        outEdges[c.sourceDeviceId].add(c.destinationDeviceId);
        inDeg[c.destinationDeviceId] = (inDeg[c.destinationDeviceId] || 0) + 1;
      }
    });

    const layer: Record<string, number> = {};
    const queue: string[] = [];

    project.devices.forEach(d => {
      if (inDeg[d.id] === 0) {
        queue.push(d.id);
        layer[d.id] = 0;
      }
    });

    while (queue.length > 0) {
      const id = queue.shift()!;
      for (const dest of outEdges[id] || []) {
        layer[dest] = Math.max(layer[dest] || 0, layer[id] + 1);
        inDeg[dest]--;
        if (inDeg[dest] === 0) queue.push(dest);
      }
    }

    project.devices.forEach(d => {
      if (layer[d.id] === undefined) layer[d.id] = 0;
    });

    const layers: Record<number, Device[]> = {};
    project.devices.forEach(d => {
      const l = layer[d.id];
      if (!layers[l]) layers[l] = [];
      layers[l].push(d);
    });

    Object.values(layers).forEach(devs => {
      devs.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
    });

    const COL_WIDTH = 300;
    const ROW_GAP = 4; // Tighter 4px gap to match demo project stacking
    const START_X = 20;
    const START_Y = 20;

    Object.entries(layers)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([layerStr, devs]) => {
        const col = Number(layerStr);
        let y = START_Y;
        devs.forEach(d => {
          updateDevice(d.id, { position: { x: snap(START_X + col * COL_WIDTH), y: snap(y) } });
          y += getNodeHeight(d) + ROW_GAP;
        });
      });
  };

  const handleFitAll = () => {
    if (project.devices.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    project.devices.forEach(d => {
      const x = d.position?.x ?? 0;
      const y = d.position?.y ?? 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + getNodeWidth(d));
      maxY = Math.max(maxY, y + getNodeHeight(d));
    });
    const pad = 40;
    const contentW = maxX - minX + pad * 2;
    const contentH = maxY - minY + pad * 2;
    const scaleX = canvasSize.width / contentW;
    const scaleY = canvasSize.height / contentH;
    const newScale = Math.min(scaleX, scaleY, 2);
    vpScale.value = newScale;
    vpX.value = (canvasSize.width - contentW * newScale) / 2 - (minX - pad) * newScale;
    vpY.value = (canvasSize.height - contentH * newScale) / 2 - (minY - pad) * newScale;
  };

  const handleResetZoom = () => {
    vpX.value = 0;
    vpY.value = 0;
    vpScale.value = 1;
  };

  const handleDeleteSelectedConnection = () => {
    if (selectedConnectionId) {
      deleteConnection(selectedConnectionId);
      setSelectedConnectionId(null);
    }
  };

  const getDeviceObstacles = (): Obstacle[] => {
    return project.devices
      .map(d => ({
        id: d.id,
        left: (d.position?.x ?? 0) - OBSTACLE_PADDING,
        top: (d.position?.y ?? 0) - OBSTACLE_PADDING,
        right: (d.position?.x ?? 0) + getNodeWidth(d) + OBSTACLE_PADDING,
        bottom: (d.position?.y ?? 0) + getNodeHeight(d) + OBSTACLE_PADDING,
      }));
  };

  const connectionData = useMemo(() => {
    const hitEndpoints: Array<{ id: string; x1: number; y1: number; x2: number; y2: number; srcId: string; dstId: string }> = [];
    project.connections.forEach(c => {
      const src = project.devices.find(d => d.id === c.sourceDeviceId);
      const dst = project.devices.find(d => d.id === c.destinationDeviceId);
      if (!src || !dst) return;
      const sl = getChannelLayout(src);
      const dl = getChannelLayout(dst);
      const sci = sl[c.sourceChannelId];
      const dci = dl[c.destinationChannelId];
      if (!sci || !dci) return;
      hitEndpoints.push({
        id: c.id,
        x1: (src.position?.x ?? 0) + getNodeWidth(src),
        y1: (src.position?.y ?? 0) + sci.y,
        x2: (dst.position?.x ?? 0),
        y2: (dst.position?.y ?? 0) + dci.y,
        srcId: c.sourceDeviceId,
        dstId: c.destinationDeviceId,
      });
    });

    const srcOffX: Record<string, number> = {};
    const srcOffY: Record<string, number> = {};
    const dstOffX: Record<string, number> = {};
    const dstOffY: Record<string, number> = {};

    // Group devices by their X position to stagger columns independently
    const sourceDeviceIds = Array.from(new Set(hitEndpoints.map(ep => ep.srcId)));
    const sourceDevices = sourceDeviceIds
      .map(id => project.devices.find(d => d.id === id)!)
      .filter(Boolean);

    const deviceStaggerMap: Record<string, number> = {};
    const devicesByX: Record<number, Device[]> = {};
    sourceDevices.forEach(d => {
      const x = d.position?.x ?? 0;
      if (!devicesByX[x]) devicesByX[x] = [];
      devicesByX[x].push(d);
    });

    Object.values(devicesByX).forEach(group => {
      group.sort((a, b) => (a.position?.y ?? 0) - (b.position?.y ?? 0));
      group.forEach((d, idx) => {
        // Stagger each column starting from 0
        deviceStaggerMap[d.id] = idx * LINE_SPACING;
      });
    });

    const pairs: Array<{ srcId: string; dstId: string; connectionIds: string[] }> = [];
    hitEndpoints.forEach(ep => {
      let p = pairs.find(x => x.srcId === ep.srcId && x.dstId === ep.dstId);
      if (!p) {
        p = { srcId: ep.srcId, dstId: ep.dstId, connectionIds: [] };
        pairs.push(p);
      }
      p.connectionIds.push(ep.id);
    });

    const pairsByDest: Record<string, typeof pairs> = {};
    pairs.forEach(p => {
      if (!pairsByDest[p.dstId]) pairsByDest[p.dstId] = [];
      pairsByDest[p.dstId].push(p);
    });

    Object.values(pairsByDest).forEach(destPairs => {
      destPairs.sort((a, b) => {
        const epA = hitEndpoints.find(e => e.id === a.connectionIds[0])!;
        const epB = hitEndpoints.find(e => e.id === b.connectionIds[0])!;
        return epA.y1 - epB.y1;
      });
      destPairs.forEach((p, idx) => {
        const off = (idx - (destPairs.length - 1) / 2) * LINE_SPACING;
        const deviceBaseline = deviceStaggerMap[p.srcId] || 0;
        p.connectionIds.forEach(id => {
          dstOffX[id] = off;
          dstOffY[id] = off / 2;
          // Apply same offset to source side to ensure stagger if we pick osx
          // Incorporate device baseline
          srcOffX[id] = deviceBaseline + off;
          srcOffY[id] = off / 2;
        });
      });
    });

    const pairsBySrc: Record<string, typeof pairs> = {};
    pairs.forEach(p => {
      if (!pairsBySrc[p.srcId]) pairsBySrc[p.srcId] = [];
      pairsBySrc[p.srcId].push(p);
    });

    Object.values(pairsBySrc).forEach(srcPairs => {
      srcPairs.sort((a, b) => {
        const epA = hitEndpoints.find(e => e.id === a.connectionIds[0])!;
        const epB = hitEndpoints.find(e => e.id === b.connectionIds[0])!;
        return epA.x2 - epB.x2;
      });
      srcPairs.forEach((p, idx) => {
        const off = (idx - (srcPairs.length - 1) / 2) * LINE_SPACING;
        const deviceBaseline = deviceStaggerMap[p.srcId] || 0;
        p.connectionIds.forEach(id => {
          srcOffX[id] = deviceBaseline + off;
          srcOffY[id] = off / 2;
        });
      });
    });

    const connectionPaths: Record<string, string> = {};
    const connectionPts: Record<string, Point[]> = {};
    const obstacles = getDeviceObstacles();

    pairs.forEach(pair => {
      const midIdx = Math.floor(pair.connectionIds.length / 2);
      const templateId = pair.connectionIds[midIdx];
      const ep = hitEndpoints.find(e => e.id === templateId)!;
      
      const templateResult = getOrthogonalPoints(
        ep.x1, ep.y1, ep.x2, ep.y2,
        obstacles,
        srcOffX[templateId] || 0,
        srcOffY[templateId] || 0,
        dstOffX[templateId] || 0,
        dstOffY[templateId] || 0,
        ep.srcId,
        ep.dstId
      );

      // Apply the same midX or bypassY to all connections in the pair
      pair.connectionIds.forEach(id => {
        const cEp = hitEndpoints.find(e => e.id === id)!;
        const res = getOrthogonalPoints(
          cEp.x1, cEp.y1, cEp.x2, cEp.y2,
          obstacles,
          srcOffX[id] || 0,
          srcOffY[id] || 0,
          dstOffX[id] || 0,
          dstOffY[id] || 0,
          cEp.srcId,
          cEp.dstId,
          templateResult.midX,
          templateResult.bypassY
        );
        connectionPts[id] = res.points;
        connectionPaths[id] = pointsToRoundedPath(res.points);
      });
    });

    return { connectionPts, hitEndpoints };
  }, [project.connections, project.devices]);

  const selectConnectionAtPoint = (px: number, py: number) => {
    let closestId: string | null = null;
    let closestDist = 20;

    Object.entries(connectionData.connectionPts).forEach(([id, pts]) => {
      const d = distToSegments(px, py, pts);
      if (d < closestDist) { 
        closestDist = d; 
        closestId = id; 
      }
    });

    setSelectedConnectionId(closestId);
  };


  const handleCanvasPress = useCallback((event: any) => {
    if (didPan.value) {
      didPan.value = false;
      return;
    }
    let screenX: number, screenY: number;
    if (Platform.OS === 'web') {
      const rect = event.currentTarget?.getBoundingClientRect?.();
      if (!rect) { setSelectedConnectionId(null); return; }
      screenX = event.clientX - rect.left;
      screenY = event.clientY - rect.top;
    } else {
      screenX = event.nativeEvent?.locationX ?? 0;
      screenY = event.nativeEvent?.locationY ?? 0;
    }
    const cx = (screenX - vpX.value) / vpScale.value;
    const cy = (screenY - vpY.value) / vpScale.value;
    selectConnectionAtPoint(cx, cy);
  }, []);

  const resetDidPan = useCallback(() => {
    setTimeout(() => { didPan.value = false; }, 100);
  }, []);

  const handleTapAtPoint = useCallback((absX: number, absY: number) => {
    handleCanvasPress({
      nativeEvent: {
        locationX: absX - canvasOffsetX.value,
        locationY: absY - canvasOffsetY.value,
      }
    });
  }, [handleCanvasPress]);

  const canvasPanGesture = Gesture.Pan()
    .minPointers(1)
    .onChange((e) => {
      'worklet';
      vpX.value += e.changeX;
      vpY.value += e.changeY;
      didPan.value = true;
    })
    .onEnd(() => {
      'worklet';
      runOnJS(resetDidPan)();
    });

  const canvasPinchGesture = Gesture.Pinch()
    .onChange((e) => {
      'worklet';
      const newScale = Math.max(0.15, Math.min(3, vpScale.value * e.scaleChange));
      vpScale.value = newScale;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      'worklet';
      runOnJS(handleResetZoom)();
    });

  const canvasTapGesture = Gesture.Tap()
    .onEnd((e) => {
      'worklet';
      runOnJS(handleTapAtPoint)(e.absoluteX, e.absoluteY);
    });

  const canvasGesture = Gesture.Simultaneous(
    canvasPanGesture,
    canvasPinchGesture,
    Gesture.Exclusive(doubleTapGesture, canvasTapGesture)
  );

  const renderConnections = () => {
    return project.connections.map(connection => {
      const pts = connectionData.connectionPts[connection.id];
      if (!pts) return null;
      const pathData = pointsToRoundedPath(pts);
      const isSelected = selectedConnectionId === connection.id;

      return (
        <G key={connection.id}>
          {isSelected && <Path d={pathData} stroke="#ef4444" strokeWidth="8" strokeOpacity="0.2" fill="none" />}
          <Path d={pathData} stroke={isSelected ? "#ef4444" : "#3b82f6"} strokeWidth={isSelected ? "3" : "2"} fill="none" />
          {isSelected && (() => {
            let totalLen = 0;
            for (let i = 0; i < pts.length - 1; i++) {
              totalLen += Math.sqrt((pts[i+1].x - pts[i].x) ** 2 + (pts[i+1].y - pts[i].y) ** 2);
            }
            let half = totalLen / 2, acc = 0;
            let midPt = pts[0];
            for (let i = 0; i < pts.length - 1; i++) {
              const segLen = Math.sqrt((pts[i+1].x - pts[i].x) ** 2 + (pts[i+1].y - pts[i].y) ** 2);
              if (acc + segLen >= half) {
                const t = (half - acc) / segLen;
                midPt = { x: pts[i].x + t * (pts[i+1].x - pts[i].x), y: pts[i].y + t * (pts[i+1].y - pts[i].y) };
                break;
              }
              acc += segLen;
            }
            return (
              <G>
                <Circle cx={midPt.x} cy={midPt.y} r={12} fill="#ef4444" onPress={handleDeleteSelectedConnection} />
                <Path d={`M ${midPt.x - 4} ${midPt.y - 4} L ${midPt.x + 4} ${midPt.y + 4}`} stroke="white" strokeWidth="2" />
                <Path d={`M ${midPt.x + 4} ${midPt.y - 4} L ${midPt.x - 4} ${midPt.y + 4}`} stroke="white" strokeWidth="2" />
              </G>
            );
          })()}
        </G>
      );
    });
  };

  const activePathData = activeConnection ? (() => {
    const { startX, startY, currentX, currentY } = activeConnection;
    const result = getOrthogonalPoints(startX, startY, currentX, currentY, []);
    return pointsToRoundedPath(result.points);
  })() : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar barStyle="default" />
      <View style={styles.toolbar}>
        <Text style={styles.title}>Diagram</Text>
        <View style={{ flexDirection: 'row' }}>
          {selectedDeviceIds.length > 1 && (
            <TouchableOpacity onPress={handleStackSelected} style={[styles.toolBtn, { marginRight: 8, backgroundColor: '#dcfce7' }]}>
              <Layers size={20} color="#16a34a" />
            </TouchableOpacity>
          )}
          {selectedDeviceIds.length > 0 && (
            <TouchableOpacity onPress={() => setSelectedDeviceIds([])} style={[styles.toolBtn, { marginRight: 8, backgroundColor: '#f3f4f6' }]}>
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
          {selectedDeviceIds.length === 0 && (
            <>
              <TouchableOpacity onPress={handleAutoLayout} style={[styles.toolBtn, { marginRight: 8 }]}>
                <RefreshCcw size={20} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleFitAll} style={[styles.toolBtn, { marginRight: 8 }]}>
                <Maximize size={20} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleResetZoom} style={[styles.toolBtn, { marginRight: 8 }]}>
                <Minimize size={20} color="#6b7280" />
              </TouchableOpacity>
            </>
          )}
          {selectedConnectionId && (
            <TouchableOpacity onPress={handleDeleteSelectedConnection} style={[styles.toolBtn, { backgroundColor: '#fee2e2', marginRight: 8 }]}>
              <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleExportDiagram} style={[styles.toolBtn, { marginRight: 8 }]}>
            <Share2 size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAddDevice} style={styles.toolBtn}>
            <Plus size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <GestureDetector gesture={canvasGesture}>
        <View
          ref={canvasContainerRef}
          style={{ flex: 1, overflow: 'hidden', backgroundColor: '#f9fafb' }}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setCanvasSize({ width, height });
            if (canvasContainerRef.current) {
              canvasContainerRef.current.measureInWindow((x, y) => {
                canvasOffsetX.value = x;
                canvasOffsetY.value = y;
              });
            }
          }}
        >
          <View 
            ref={viewShotRef as any}
            style={{ position: 'absolute', left: 0, top: 0, width: canvasSize.width, height: canvasSize.height }}
          >
            <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: svgSize.width, height: svgSize.height }, canvasAnimatedStyle]}>
              <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: svgSize.width, height: svgSize.height }}>
                <Svg width={svgSize.width} height={svgSize.height}>
                  <G>
                    {renderConnections()}
                    {activePathData && (
                      <Path d={activePathData} stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" fill="none" />
                    )}
                  </G>
                </Svg>
              </View>

              {project.devices.map(device => (
                <DeviceNode
                  key={device.id}
                  device={device}
                  isSelected={selectedDeviceIds.includes(device.id)}
                  onToggleSelection={() => handleToggleDeviceSelection(device.id)}
                  onPositionChange={handlePositionChange}
                  onSelect={handleSelectDevice}
                  onStartConnection={handleStartConnection}
                  onUpdateConnection={handleUpdateConnection}
                  onEndConnection={handleEndConnection}
                  onCancelConnection={handleCancelConnection}
                  canvasScale={vpScale}
                />
              ))}
            </Animated.View>
          </View>
        </View>
      </GestureDetector>

      <DeviceModal
        visible={isDeviceModalVisible}
        device={editingDevice}
        groups={project.groups}
        categories={project.categories}
        onClose={() => setIsDeviceModalVisible(false)}
        onSave={handleSaveDevice}
        onDelete={handleDeleteDevice}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    zIndex: 50,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  toolBtn: {
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
  },
  floatingControls: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    flexDirection: 'column',
    zIndex: 999,
  },
  fab: {
    width: 48,
    height: 48,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
      } as any,
    }),
  },
});
