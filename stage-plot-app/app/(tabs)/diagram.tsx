import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, Platform, Alert, SafeAreaView, StatusBar } from 'react-native';
import Svg, { G, Circle, Path } from 'react-native-svg';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS, SharedValue } from 'react-native-reanimated';
import { useProject } from '../../contexts/ProjectContext';
import { DeviceNode, getChannelLayout, getNodeWidth, getNodeHeight } from '../../components/DeviceNode';
import { DeviceModal } from '../../components/DeviceModal';
import { Device } from '../../models';
import { Plus, Maximize, Minimize, RefreshCcw, Trash2 } from 'lucide-react-native';
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
  const { project, updateDevice, addConnection, deleteConnection, deleteDevice } = useProject();
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
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

  const canvasAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: vpX.value },
      { translateY: vpY.value },
      { scale: vpScale.value },
    ] as any,
  }));

  const svgSize = useMemo(() => {
    let maxX = canvasSize.width * 2;
    let maxY = canvasSize.height * 2;
    project.devices.forEach(d => {
      maxX = Math.max(maxX, (d.position?.x ?? 0) + 500);
      maxY = Math.max(maxY, (d.position?.y ?? 0) + 500);
    });
    return { width: maxX, height: maxY };
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

  const handleSaveDevice = (deviceData: Omit<Device, 'id'> | Device) => {
    if ('id' in deviceData) updateDevice(deviceData.id, deviceData);
    setIsDeviceModalVisible(false);
  };

  const handlePositionChange = useCallback((id: string, x: number, y: number) => {
    updateDevice(id, { position: { x: snap(x), y: snap(y) } });
  }, [updateDevice]);

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
    const ROW_GAP = 40;
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

  const selectConnectionAtPoint = (px: number, py: number) => {
    let closestId: string | null = null;
    let closestDist = 20;

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

    const byDest: Record<string, string[]> = {};
    hitEndpoints.forEach(ep => {
      if (!byDest[ep.dstId]) byDest[ep.dstId] = [];
      byDest[ep.dstId].push(ep.id);
    });
    Object.values(byDest).forEach(ids => {
      ids.sort((a, b) => {
        const epA = hitEndpoints.find(e => e.id === a)!;
        const epB = hitEndpoints.find(e => e.id === b)!;
        return epA.y1 - epB.y1;
      });
      ids.forEach((id, idx) => {
        dstOffX[id] = (idx - (ids.length - 1) / 2) * LINE_SPACING;
        dstOffY[id] = (idx - (ids.length - 1) / 2) * (LINE_SPACING / 2);
      });
    });

    const bySrc: Record<string, string[]> = {};
    hitEndpoints.forEach(ep => {
      if (!bySrc[ep.srcId]) bySrc[ep.srcId] = [];
      bySrc[ep.srcId].push(ep.id);
    });
    Object.values(bySrc).forEach(ids => {
      ids.sort((a, b) => {
        const epA = hitEndpoints.find(e => e.id === a)!;
        const epB = hitEndpoints.find(e => e.id === b)!;
        return epA.y1 - epB.y1;
      });
      ids.forEach((id, idx) => {
        srcOffX[id] = (idx - (ids.length - 1) / 2) * LINE_SPACING;
        srcOffY[id] = (idx - (ids.length - 1) / 2) * (LINE_SPACING / 2);
      });
    });

    hitEndpoints.forEach(ep => {
      const obstacles = getDeviceObstacles();
      const pts = getOrthogonalPoints(
        ep.x1, ep.y1, ep.x2, ep.y2, 
        obstacles, 
        srcOffX[ep.id] || 0, 
        srcOffY[ep.id] || 0,
        dstOffX[ep.id] || 0,
        dstOffY[ep.id] || 0,
        ep.srcId, 
        ep.dstId
      );
      const d = distToSegments(px, py, pts);
      if (d < closestDist) { closestDist = d; closestId = ep.id; }
    });

    setSelectedConnectionId(closestId);
  };


  const handleCanvasPress = (event: any) => {
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
  };

  const canvasPanGesture = Gesture.Pan()
    .minPointers(Platform.OS === 'web' ? 1 : 2)
    .minDistance(5)
    .onStart(() => {
      didPan.value = false;
      panCtx.value = { x: vpX.value, y: vpY.value };
    })
    .onUpdate((e) => {
      didPan.value = true;
      vpX.value = panCtx.value.x + e.translationX;
      vpY.value = panCtx.value.y + e.translationY;
    });

  const canvasPinchGesture = Gesture.Pinch()
    .onStart(() => { scaleCtx.value = vpScale.value; })
    .onUpdate((e) => {
      vpScale.value = Math.max(0.15, Math.min(3, scaleCtx.value * e.scale));
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(handleResetZoom)();
    });

  const canvasTapGesture = Gesture.Tap()
    .onEnd((e) => {
      runOnJS(handleCanvasPress)({
        nativeEvent: {
          locationX: e.absoluteX - canvasOffsetX.value,
          locationY: e.absoluteY - canvasOffsetY.value,
        }
      });
    });

  const canvasGesture = Gesture.Simultaneous(canvasPanGesture, canvasPinchGesture, Gesture.Exclusive(doubleTapGesture, canvasTapGesture));

  const renderConnections = () => {
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

    // Group by destination to space out vertical segments entering the same device
    const byDest: Record<string, string[]> = {};
    hitEndpoints.forEach(ep => {
      if (!byDest[ep.dstId]) byDest[ep.dstId] = [];
      byDest[ep.dstId].push(ep.id);
    });

    Object.values(byDest).forEach(ids => {
      // Sort by source Y to keep relative order clean
      ids.sort((a, b) => {
        const epA = hitEndpoints.find(e => e.id === a)!;
        const epB = hitEndpoints.find(e => e.id === b)!;
        return epA.y1 - epB.y1;
      });
      ids.forEach((id, idx) => {
        dstOffX[id] = (idx - (ids.length - 1) / 2) * LINE_SPACING;
        dstOffY[id] = (idx - (ids.length - 1) / 2) * (LINE_SPACING / 2);
      });
    });

    // Group by source to space out vertical segments leaving the same device
    const bySrc: Record<string, string[]> = {};
    hitEndpoints.forEach(ep => {
      if (!bySrc[ep.srcId]) bySrc[ep.srcId] = [];
      bySrc[ep.srcId].push(ep.id);
    });

    Object.values(bySrc).forEach(ids => {
      ids.sort((a, b) => {
        const epA = hitEndpoints.find(e => e.id === a)!;
        const epB = hitEndpoints.find(e => e.id === b)!;
        return epA.y1 - epB.y1;
      });
      ids.forEach((id, idx) => {
        srcOffX[id] = (idx - (ids.length - 1) / 2) * LINE_SPACING;
        srcOffY[id] = (idx - (ids.length - 1) / 2) * (LINE_SPACING / 2);
      });
    });

    return project.connections.map(connection => {
      const ep = hitEndpoints.find(e => e.id === connection.id);
      if (!ep) return null;
      const sourceDevice = project.devices.find(d => d.id === connection.sourceDeviceId)!;
      const destDevice = project.devices.find(d => d.id === connection.destinationDeviceId)!;
      if (!sourceDevice || !destDevice) return null;

      const { x1, y1, x2, y2 } = ep;
      const obstacles = getDeviceObstacles();
      const pts = getOrthogonalPoints(
        x1, y1, x2, y2, 
        obstacles, 
        srcOffX[connection.id] || 0, 
        srcOffY[connection.id] || 0,
        dstOffX[connection.id] || 0,
        dstOffY[connection.id] || 0,
        connection.sourceDeviceId, 
        connection.destinationDeviceId
      );
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
    const pts = getOrthogonalPoints(startX, startY, currentX, currentY, []);
    return pointsToRoundedPath(pts);
  })() : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar barStyle="default" />
      <View style={styles.toolbar}>
        <Text style={styles.title}>Diagram</Text>
        <View style={{ flexDirection: 'row' }}>
          {selectedConnectionId && (
            <TouchableOpacity onPress={handleDeleteSelectedConnection} style={[styles.toolBtn, { backgroundColor: '#fee2e2', marginRight: 8 }]}>
              <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => { setEditingDevice(undefined); setIsDeviceModalVisible(true); }} style={styles.toolBtn}>
            <Plus size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <View
        ref={canvasContainerRef}
        style={{ flex: 1, overflow: 'hidden' }}
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
        {...Platform.select({
          web: {
            onClick: handleCanvasPress,
            onContextMenu: (e: any) => e.preventDefault(),
          } as any,
          default: { onTouchEnd: handleCanvasPress }
        })}
      >
        <GestureDetector gesture={canvasGesture}>
          <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, { transformOrigin: '0 0' } as any, canvasAnimatedStyle]}>
            <Svg width={svgSize.width} height={svgSize.height} style={{ position: 'absolute', left: 0, top: 0 }}>
              {renderConnections()}
              {activePathData && (
                <Path d={activePathData} stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" fill="none" />
              )}
            </Svg>

            {project.devices.map(device => (
              <DeviceNode
                key={device.id}
                device={device}
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
        </GestureDetector>
      </View>

      <DeviceModal
        visible={isDeviceModalVisible}
        device={editingDevice}
        groups={project.groups}
        categories={project.categories}
        onClose={() => setIsDeviceModalVisible(false)}
        onSave={handleSaveDevice}
        onDelete={handleDeleteDevice}
      />

      <View style={styles.floatingControls}>
        <TouchableOpacity onPress={handleAutoLayout} style={styles.fab}>
          <RefreshCcw size={24} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleFitAll} style={styles.fab}>
          <Maximize size={24} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleResetZoom} style={styles.fab}>
          <Minimize size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>
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
  },
  fab: {
    width: 48,
    height: 48,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
