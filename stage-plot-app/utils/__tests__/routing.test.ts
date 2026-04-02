import { describe, it, expect } from 'vitest';
import { getOrthogonalPoints, Obstacle, simplifyPath } from '../routing';

describe('routing', () => {
  describe('simplifyPath', () => {
    it('should remove duplicate points', () => {
      const pts = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 100 }];
      const result = simplifyPath(pts);
      expect(result.length).toBe(2);
      expect(result[0]).toEqual({ x: 0, y: 0 });
      expect(result[1]).toEqual({ x: 100, y: 100 });
    });

    it('should remove colinear points', () => {
      const pts = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
      const result = simplifyPath(pts);
      expect(result.length).toBe(3);
      expect(result[1]).toEqual({ x: 100, y: 0 });
    });
  });

  describe('getOrthogonalPoints', () => {
    it('should return a path with at least 2 points', () => {
      const { points: pts } = getOrthogonalPoints(0, 0, 100, 100, []);
      expect(pts.length).toBeGreaterThanOrEqual(2);
      expect(pts[0]).toEqual({ x: 0, y: 0 });
      expect(pts[pts.length - 1]).toEqual({ x: 100, y: 100 });
    });

    it('should handle forward routing with a simple Z-path', () => {
      const { points: pts } = getOrthogonalPoints(0, 50, 200, 150, []);
      expect(pts[0].x).toBe(0);
      expect(pts[pts.length - 1].x).toBe(200);
      // Forward should prefer a 4-point Z-path if possible
      expect(pts.length).toBe(4);
    });

    it('should handle backwards routing by going around', () => {
      const x1 = 300, y1 = 50;
      const x2 = 0, y2 = 50;
      const obstacles: Obstacle[] = [
        { id: 'obs1', left: 50, top: 40, right: 250, bottom: 60 }
      ];
      
      const { points: pts } = getOrthogonalPoints(x1, y1, x2, y2, obstacles, 0, 0, 0, 0, 'src', 'dst');
      
      const segmentIntersects = (a: any, b: any, obs: any) => {
        const left = obs.left, top = obs.top, right = obs.right, bottom = obs.bottom;
        const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
        const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
        if (maxX <= left || minX >= right || maxY <= top || minY >= bottom) return false;
        return true;
      };

      for (let i = 0; i < pts.length - 1; i++) {
        expect(segmentIntersects(pts[i], pts[i+1], obstacles[0])).toBe(false);
      }

      // Backwards needs at least 6 points for a loop-around
      expect(pts.length).toBeGreaterThanOrEqual(6);
    });

    it('should respect offsets for parallel lines', () => {
      const { points: pts1 } = getOrthogonalPoints(0, 50, 400, 150, [], 0, 0, 0, 0);
      const { points: pts2 } = getOrthogonalPoints(0, 50, 400, 150, [], 10, 0, 10, 0);
      
      const midX1 = pts1[1].x;
      const midX2 = pts2[1].x;
      expect(Math.abs(midX2 - midX1)).toBeGreaterThan(2);
    });
  });
});
