import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, Platform, Alert, SafeAreaView, StatusBar } from 'react-native';
import Svg, { G, Circle, Path } from 'react-native-svg';
import { useProject } from '../../contexts/ProjectContext';
import { DeviceNode, getChannelLayout, getNodeWidth, getNodeHeight } from '../../components/DeviceNode';
import { DeviceModal } from '../../components/DeviceModal';
import { Device } from '../../models';
import { Plus, Maximize, Minimize, RefreshCcw, Trash2 } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Obstacle = { left: number; top: number; right: number; bottom: number };
type Point = { x: number; y: number };

const ROUTE_MARGIN = 24;
const CORNER_RADIUS = 8;
const LINE_SPACING = 6;

function segmentIntersectsBox(a: Point, b: Point, obs: Obstacle, pad: number = 0): boolean {
  const left = obs.left - pad, right = obs.right + pad, top = obs.top - pad, bottom = obs.bottom + pad;
  if (a.x === b.x) {
    if (a.x <= left || a.x >= right) return false;
    const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
    return maxY > top && minY < bottom;
  }
  if (a.y === b.y) {
    if (a.y <= top || a.y >= bottom) return false;
    const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
    return maxX > left && minX < right;
  }
  const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
  return maxX > left && minX < right && maxY > top && minY < bottom;
}

function pathHitsObstacles(pts: Point[], obstacles: Obstacle[]): boolean {
  for (let i = 0; i < pts.length - 1; i++) {
    for (const obs of obstacles) {
      if (segmentIntersectsBox(pts[i], pts[i + 1], obs)) return true;
    }
  }
  return false;
}

function getOrthogonalPoints(x1: number, y1: number, x2: number, y2: number, obstacles: Obstacle[], midXOffset: number = 0): Point[] {
  const stub = 16;
  const sx = x1 + stub;
  const ex = x2 - stub;
  const midX = (sx + ex) / 2 + midXOffset;

  const simplePath: Point[] = [
    { x: x1, y: y1 }, { x: sx, y: y1 },
    { x: midX, y: y1 }, { x: midX, y: y2 },
    { x: ex, y: y2 }, { x: x2, y: y2 },
  ];

  if (!pathHitsObstacles(simplePath, obstacles)) return simplePath;

  let bestBypass: Point[] | null = null;
  const candidateYs: number[] = [];

  obstacles.forEach(obs => {
    candidateYs.push(obs.top - ROUTE_MARGIN);
    candidateYs.push(obs.bottom + ROUTE_MARGIN);
  });

  for (const bypassY of candidateYs) {
    const path: Point[] = [
      { x: x1, y: y1 }, { x: sx, y: y1 },
      { x: sx, y: bypassY },
      { x: ex, y: bypassY },
      { x: ex, y: y2 }, { x: x2, y: y2 },
    ];
    if (!pathHitsObstacles(path, obstacles)) {
      if (!bestBypass) {
        bestBypass = path;
      } else {
        const curLen = totalPathLen(bestBypass);
        const newLen = totalPathLen(path);
        if (newLen < curLen) bestBypass = path;
      }
    }
  }

  if (bestBypass) return bestBypass;

  let globalTop = Infinity, globalBottom = -Infinity;
  obstacles.forEach(obs => {
    globalTop = Math.min(globalTop, obs.top);
    globalBottom = Math.max(globalBottom, obs.bottom);
  });
  const avgY = (y1 + y2) / 2;
  const bypassY = (avgY - globalTop) <= (globalBottom - avgY) ? globalTop - ROUTE_MARGIN : globalBottom + ROUTE_MARGIN;

  return [
    { x: x1, y: y1 }, { x: sx, y: y1 },
    { x: sx, y: bypassY },
    { x: ex, y: bypassY },
    { x: ex, y: y2 }, { x: x2, y: y2 },
  ];
}

function totalPathLen(pts: Point[]): number {
  let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    len += Math.abs(pts[i + 1].x - pts[i].x) + Math.abs(pts[i + 1].y - pts[i].y);
  }
  return len;
}

function pointsToRoundedPath(pts: Point[]): string {
  if (pts.length < 2) return '';
  const r = CORNER_RADIUS;
  let d = `M ${pts[0].x} ${pts[0].y}`;

  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1], cur = pts[i], next = pts[i + 1];
    const dx1 = cur.x - prev.x, dy1 = cur.y - prev.y;
    const dx2 = next.x - cur.x, dy2 = next.y - cur.y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    if (len1 === 0 || len2 === 0) { d += ` L ${cur.x} ${cur.y}`; continue; }
    const rr = Math.min(r, len1 / 2, len2 / 2);
    const startX = cur.x - (dx1 / len1) * rr;
    const startY = cur.y - (dy1 / len1) * rr;
    const endX = cur.x + (dx2 / len2) * rr;
    const endY = cur.y + (dy2 / len2) * rr;
    d += ` L ${startX} ${startY} Q ${cur.x} ${cur.y} ${endX} ${endY}`;
  }

  d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
  return d;
}

function distToSegments(px: number, py: number, pts: Point[]): number {
  let min = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i].x, ay = pts[i].y;
    const bx = pts[i + 1].x, by = pts[i + 1].y;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    const cx = ax + t * dx, cy = ay + t * dy;
    const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
    if (d < min) min = d;
  }
  return min;
}

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
    updateDevice(id, { position: { x, y } });
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

  const handleResetLayout = () => {
    project.devices.forEach((device, index) => {
      updateDevice(device.id, { position: { x: 50 + (index % 2) * 220, y: 50 + Math.floor(index / 2) * 180 } });
    });
  };

  const handleDeleteSelectedConnection = () => {
    if (selectedConnectionId) {
      deleteConnection(selectedConnectionId);
      setSelectedConnectionId(null);
    }
  };

  const getDeviceObstacles = (excludeIds: string[]): Obstacle[] => {
    return project.devices
      .filter(d => !excludeIds.includes(d.id))
      .map(d => ({
        left: (d.position?.x ?? 0) - 5,
        top: (d.position?.y ?? 0) - 5,
        right: (d.position?.x ?? 0) + getNodeWidth(d) + 5,
        bottom: (d.position?.y ?? 0) + getNodeHeight(d) + 5,
      }));
  };

  const handleCanvasPress = (event: any) => {
    let px: number, py: number;
    if (Platform.OS === 'web') {
      const rect = event.currentTarget?.getBoundingClientRect?.();
      if (rect) {
        px = event.clientX - rect.left;
        py = event.clientY - rect.top;
      } else {
        setSelectedConnectionId(null);
        return;
      }
    } else {
      px = event.nativeEvent?.locationX ?? 0;
      py = event.nativeEvent?.locationY ?? 0;
    }

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

    const hitMidX: Record<string, number> = {};
    hitEndpoints.forEach(ep => {
      hitMidX[ep.id] = (ep.x1 + 16 + ep.x2 - 16) / 2;
    });
    const hitSorted = [...hitEndpoints].sort((a, b) => hitMidX[a.id] - hitMidX[b.id]);
    const hitAssigned: number[] = [];
    hitSorted.forEach(ep => {
      let mx = hitMidX[ep.id];
      for (const used of hitAssigned) {
        if (Math.abs(mx - used) < LINE_SPACING) mx = used + LINE_SPACING;
      }
      hitMidX[ep.id] = mx;
      hitAssigned.push(mx);
    });

    hitEndpoints.forEach(ep => {
      const baseMidX = (ep.x1 + 16 + ep.x2 - 16) / 2;
      const hitOffset = hitMidX[ep.id] - baseMidX;
      const obstacles = getDeviceObstacles([ep.srcId, ep.dstId]);
      const pts = getOrthogonalPoints(ep.x1, ep.y1, ep.x2, ep.y2, obstacles, hitOffset);
      const d = distToSegments(px, py, pts);
      if (d < closestDist) { closestDist = d; closestId = ep.id; }
    });

    setSelectedConnectionId(closestId);
  };

  const renderConnections = () => {
    const connEndpoints: Array<{ id: string; x1: number; y1: number; x2: number; y2: number; srcId: string; dstId: string }> = [];
    project.connections.forEach(c => {
      const src = project.devices.find(d => d.id === c.sourceDeviceId);
      const dst = project.devices.find(d => d.id === c.destinationDeviceId);
      if (!src || !dst) return;
      const sl = getChannelLayout(src);
      const dl = getChannelLayout(dst);
      const sci = sl[c.sourceChannelId];
      const dci = dl[c.destinationChannelId];
      if (!sci || !dci) return;
      connEndpoints.push({
        id: c.id,
        x1: (src.position?.x ?? 0) + getNodeWidth(src),
        y1: (src.position?.y ?? 0) + sci.y,
        x2: (dst.position?.x ?? 0),
        y2: (dst.position?.y ?? 0) + dci.y,
        srcId: c.sourceDeviceId,
        dstId: c.destinationDeviceId,
      });
    });

    const midXForConn: Record<string, number> = {};
    connEndpoints.forEach(ep => {
      midXForConn[ep.id] = (ep.x1 + 16 + ep.x2 - 16) / 2;
    });

    const sorted = [...connEndpoints].sort((a, b) => midXForConn[a.id] - midXForConn[b.id]);
    const assignedMidX: number[] = [];
    sorted.forEach(ep => {
      let mx = midXForConn[ep.id];
      for (const used of assignedMidX) {
        if (Math.abs(mx - used) < LINE_SPACING) {
          mx = used + LINE_SPACING;
        }
      }
      midXForConn[ep.id] = mx;
      assignedMidX.push(mx);
    });

    return project.connections.map(connection => {
      const ep = connEndpoints.find(e => e.id === connection.id);
      if (!ep) return null;
      const sourceDevice = project.devices.find(d => d.id === connection.sourceDeviceId)!;
      const destDevice = project.devices.find(d => d.id === connection.destinationDeviceId)!;
      if (!sourceDevice || !destDevice) return null;

      const { x1, y1, x2, y2 } = ep;
      const baseMidX = (x1 + 16 + x2 - 16) / 2;
      const midXOffset = midXForConn[connection.id] - baseMidX;

      const obstacles = getDeviceObstacles([connection.sourceDeviceId, connection.destinationDeviceId]);
      const pts = getOrthogonalPoints(x1, y1, x2, y2, obstacles, midXOffset);
      const pathData = pointsToRoundedPath(pts);
      const isSelected = selectedConnectionId === connection.id;

      return (
        <G key={connection.id}>
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
          <TouchableOpacity style={[styles.toolBtn, { marginRight: 8 }]}>
            <Maximize size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn}>
            <Plus size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={{ flex: 1, overflow: 'hidden' }}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setCanvasSize({ width, height });
        }}
        {...Platform.select({
          web: {
            onClick: handleCanvasPress,
            onContextMenu: (e: any) => e.preventDefault(),
          } as any,
          default: { onTouchEnd: handleCanvasPress }
        })}
      >
        <Svg width={canvasSize.width} height={canvasSize.height} style={StyleSheet.absoluteFill}>
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
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
          />
        ))}
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
        <TouchableOpacity onPress={handleResetLayout} style={styles.fab}>
          <RefreshCcw size={24} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.fab}>
          <Maximize size={24} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.fab}>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});
